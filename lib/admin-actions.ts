"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";
import { requireAdmin, hashPassword, newInvite, unusablePassword } from "@/lib/auth";
import { CATEGORIES, KINDS } from "@/lib/constants";
import { cleanStoredHtml } from "@/lib/sanitize-html";

function slugify(name: string) {
  return (
    name
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 60) || "project"
  );
}

function str(formData: FormData, key: string) {
  return String(formData.get(key) ?? "").trim();
}

// ---- Users -----------------------------------------------------------------

export async function createUser(formData: FormData) {
  await requireAdmin();
  const email = str(formData, "email").toLowerCase();
  const name = str(formData, "name");
  const role = str(formData, "role") === "admin" ? "admin" : "member";
  if (!email || !name) {
    redirect("/admin/users?error=A%20name%20and%20an%20email%20address%20are%20required.");
  }
  // No password is chosen here. The account is created locked, with an invite
  // link, so the only person who ever knows the password is the person it
  // belongs to -- rather than it being typed here and sent to them.
  try {
    await prisma.user.create({
      data: { email, name, role, passwordHash: await unusablePassword(), ...newInvite() },
      select: { id: true },
    });
  } catch (e) {
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002") {
      redirect("/admin/users?error=An%20account%20with%20that%20email%20already%20exists.");
    }
    throw e;
  }
  revalidatePath("/admin/users");
  redirect("/admin/users");
}

/**
 * Issue a fresh invite link, replacing any outstanding one. For a link that
 * expired or went astray, and for someone who has forgotten their password and
 * would rather set a new one themselves than be handed one.
 */
export async function resendInvite(formData: FormData) {
  await requireAdmin();
  const userId = str(formData, "userId");
  await prisma.user.update({ where: { id: userId }, data: newInvite(), select: { id: true } });
  revalidatePath("/admin/users");
  redirect("/admin/users");
}

/** Withdraw an unaccepted invitation, leaving the account unreachable. */
export async function cancelInvite(formData: FormData) {
  await requireAdmin();
  const userId = str(formData, "userId");
  await prisma.user.update({
    where: { id: userId },
    data: { inviteToken: null, inviteExpiresAt: null },
    select: { id: true },
  });
  revalidatePath("/admin/users");
  redirect("/admin/users");
}

export async function setUserPassword(formData: FormData) {
  await requireAdmin();
  const userId = str(formData, "userId");
  const password = String(formData.get("password") ?? "");
  if (password.length < 8) redirect("/admin/users?error=Passwords%20must%20be%20at%20least%208%20characters.");
  // Setting a password directly also withdraws any outstanding invite link,
  // which would otherwise still be good for changing the password you just set.
  await prisma.user.update({
    where: { id: userId },
    data: { passwordHash: await hashPassword(password), inviteToken: null, inviteExpiresAt: null },
    select: { id: true },
  });
  // Changing a password logs that person out everywhere.
  await prisma.session.deleteMany({ where: { userId } });
  redirect("/admin/users");
}

export async function deleteUser(formData: FormData) {
  const admin = await requireAdmin();
  const userId = str(formData, "userId");
  if (userId === admin.id) redirect("/admin/users?error=You%20can%27t%20delete%20your%20own%20account.");
  await prisma.user.delete({ where: { id: userId }, select: { id: true } });
  revalidatePath("/admin/users");
  redirect("/admin/users");
}

// ---- Projects --------------------------------------------------------------

export async function createProject(formData: FormData) {
  await requireAdmin();
  const name = str(formData, "name");
  if (!name) redirect("/admin/projects");
  let slug = slugify(name);
  // A taken slug gets a numeric suffix rather than an error.
  for (let n = 2; await prisma.project.findUnique({ where: { slug } }); n++) {
    slug = `${slugify(name)}-${n}`;
  }
  await prisma.project.create({ data: { name, slug, description: str(formData, "description") } });
  revalidatePath("/admin/projects");
  redirect(`/admin/projects/${slug}`);
}

export async function updateProject(formData: FormData) {
  await requireAdmin();
  const id = str(formData, "projectId");
  const name = str(formData, "name");
  if (!name) redirect("/admin/projects");
  const project = await prisma.project.update({
    where: { id },
    data: { name, description: str(formData, "description") },
  });
  revalidatePath("/", "layout");
  redirect(`/admin/projects/${project.slug}`);
}

export async function deleteProject(formData: FormData) {
  await requireAdmin();
  await prisma.project.delete({ where: { id: str(formData, "projectId") } });
  revalidatePath("/", "layout");
  redirect("/admin/projects");
}

export async function addMember(formData: FormData) {
  await requireAdmin();
  const projectId = str(formData, "projectId");
  const userId = str(formData, "userId");
  const project = await prisma.project.findUnique({ where: { id: projectId } });
  if (!project || !userId) redirect("/admin/projects");
  await prisma.projectMember.upsert({
    where: { userId_projectId: { userId, projectId } },
    update: {},
    create: { userId, projectId },
  });
  revalidatePath("/", "layout");
  redirect(`/admin/projects/${project.slug}`);
}

export async function removeMember(formData: FormData) {
  await requireAdmin();
  const membershipId = str(formData, "membershipId");
  const membership = await prisma.projectMember.findUnique({
    where: { id: membershipId },
    include: { project: true },
  });
  if (!membership) redirect("/admin/projects");
  await prisma.projectMember.delete({ where: { id: membershipId } });
  // Membership gone: any per-item grants in this project no longer apply either.
  await prisma.itemGrant.deleteMany({
    where: { userId: membership.userId, item: { projectId: membership.projectId } },
  });
  revalidatePath("/", "layout");
  redirect(`/admin/projects/${membership.project.slug}`);
}

// ---- Items -----------------------------------------------------------------

const KIND_VALUES = KINDS.map((k) => k.value as string);
const CATEGORY_VALUES = CATEGORIES.map((c) => c.value as string);

async function itemDataFrom(formData: FormData) {
  const kind = str(formData, "kind");
  const category = str(formData, "category");
  // An uploaded image arrives as a data: URI and is stored in the url field,
  // where every other kind keeps its address too. A typed URL still wins if the
  // author gave one, so replacing an uploaded image with a hosted one works.
  const typedUrl = str(formData, "url");
  const imageData = String(formData.get("imageData") ?? "");
  const url = kind === "image" && !typedUrl && imageData.startsWith("data:") ? imageData : typedUrl;

  return {
    title: str(formData, "title"),
    description: str(formData, "description"),
    kind: KIND_VALUES.includes(kind) ? kind : "link",
    category: CATEGORY_VALUES.includes(category) ? category : "other",
    url,
    htmlContent: cleanStoredHtml(String(formData.get("htmlContent") ?? "")).html,
    body: String(formData.get("body") ?? ""),
    restricted: formData.get("restricted") === "on",
  };
}

/** Comma-separated tag names → connectOrCreate payload. */
function tagOps(formData: FormData) {
  const names = Array.from(
    new Set(
      str(formData, "tags")
        .split(",")
        .map((t) => t.trim().toLowerCase())
        .filter(Boolean),
    ),
  );
  return names.map((name) => ({
    tag: { connectOrCreate: { where: { name }, create: { name } } },
  }));
}

export async function createItem(formData: FormData) {
  await requireAdmin();
  const projectId = str(formData, "projectId");
  const data = await itemDataFrom(formData);
  const project = await prisma.project.findUnique({ where: { id: projectId } });
  if (!project || !data.title) redirect("/admin/projects");
  // Grants are only meaningful on a restricted item, and only for people who
  // are actually in the project — a tick for anyone else would be a grant that
  // never applies, so it is dropped rather than stored.
  const ticked = formData.getAll("userIds").map(String);
  const memberIds = data.restricted
    ? (await prisma.projectMember.findMany({ where: { projectId }, select: { userId: true } })).map(
        (m) => m.userId,
      )
    : [];
  const grants = ticked.filter((id) => memberIds.includes(id));

  const item = await prisma.item.create({
    data: {
      ...data,
      projectId,
      tags: { create: tagOps(formData) },
      grants: { create: grants.map((userId) => ({ userId })) },
    },
  });
  revalidatePath("/", "layout");
  redirect(`/admin/items/${item.id}`);
}

export async function updateItem(formData: FormData) {
  await requireAdmin();
  const itemId = str(formData, "itemId");
  const data = await itemDataFrom(formData);
  if (!data.title) redirect(`/admin/items/${itemId}`);
  const existing = await prisma.item.findUnique({ where: { id: itemId }, select: { projectId: true } });
  if (!existing) redirect("/admin/projects");
  const ticked = formData.getAll("userIds").map(String);
  const memberIds = data.restricted
    ? (
        await prisma.projectMember.findMany({
          where: { projectId: existing.projectId },
          select: { userId: true },
        })
      ).map((m) => m.userId)
    : [];
  const grants = ticked.filter((id) => memberIds.includes(id));

  await prisma.item.update({
    where: { id: itemId },
    data: {
      ...data,
      tags: { deleteMany: {}, create: tagOps(formData) },
      // Clearing Restricted drops the grants too: leaving them would quietly
      // restore an old audience if it were ever switched back on.
      grants: { deleteMany: {}, create: grants.map((userId) => ({ userId })) },
    },
  });
  revalidatePath("/", "layout");
  redirect(`/admin/items/${itemId}`);
}

export async function deleteItem(formData: FormData) {
  await requireAdmin();
  const item = await prisma.item.delete({
    where: { id: str(formData, "itemId") },
    include: { project: true },
  });
  revalidatePath("/", "layout");
  redirect(`/admin/projects/${item.project.slug}`);
}
