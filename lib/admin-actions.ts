"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";
import { requireAdmin, hashPassword } from "@/lib/auth";
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
  const password = String(formData.get("password") ?? "");
  const role = str(formData, "role") === "admin" ? "admin" : "member";
  if (!email || !name || password.length < 8) {
    redirect("/admin/users?error=Email%2C%20name%2C%20and%20a%20password%20of%20at%20least%208%20characters%20are%20required.");
  }
  try {
    await prisma.user.create({
      data: { email, name, passwordHash: await hashPassword(password), role },
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

export async function setUserPassword(formData: FormData) {
  await requireAdmin();
  const userId = str(formData, "userId");
  const password = String(formData.get("password") ?? "");
  if (password.length < 8) redirect("/admin/users?error=Passwords%20must%20be%20at%20least%208%20characters.");
  await prisma.user.update({ where: { id: userId }, data: { passwordHash: await hashPassword(password) } });
  // Changing a password logs that person out everywhere.
  await prisma.session.deleteMany({ where: { userId } });
  redirect("/admin/users");
}

export async function deleteUser(formData: FormData) {
  const admin = await requireAdmin();
  const userId = str(formData, "userId");
  if (userId === admin.id) redirect("/admin/users?error=You%20can%27t%20delete%20your%20own%20account.");
  await prisma.user.delete({ where: { id: userId } });
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
  return {
    title: str(formData, "title"),
    description: str(formData, "description"),
    kind: KIND_VALUES.includes(kind) ? kind : "link",
    category: CATEGORY_VALUES.includes(category) ? category : "other",
    url: str(formData, "url"),
    htmlContent: cleanStoredHtml(String(formData.get("htmlContent") ?? "")).html,
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
  const item = await prisma.item.create({
    data: { ...data, projectId, tags: { create: tagOps(formData) } },
  });
  revalidatePath("/", "layout");
  redirect(`/admin/items/${item.id}`);
}

export async function updateItem(formData: FormData) {
  await requireAdmin();
  const itemId = str(formData, "itemId");
  const data = await itemDataFrom(formData);
  if (!data.title) redirect(`/admin/items/${itemId}`);
  await prisma.item.update({
    where: { id: itemId },
    data: { ...data, tags: { deleteMany: {}, create: tagOps(formData) } },
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

/** Replace a restricted item's grant list with the checked project members. */
export async function setItemGrants(formData: FormData) {
  await requireAdmin();
  const itemId = str(formData, "itemId");
  const userIds = formData.getAll("userIds").map(String);
  const item = await prisma.item.findUnique({ where: { id: itemId } });
  if (!item) redirect("/admin/projects");
  await prisma.$transaction([
    prisma.itemGrant.deleteMany({ where: { itemId } }),
    prisma.itemGrant.createMany({ data: userIds.map((userId) => ({ itemId, userId })) }),
  ]);
  revalidatePath("/", "layout");
  redirect(`/admin/items/${itemId}`);
}
