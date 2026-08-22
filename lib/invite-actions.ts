"use server";

import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { createSession, hashPassword } from "@/lib/auth";

export type InviteState = { error: string } | null;

/** Look up a live invitation. Expired or already-accepted links find nothing. */
export async function findInvite(token: string) {
  if (!token) return null;
  const user = await prisma.user.findUnique({
    where: { inviteToken: token },
    select: { id: true, name: true, email: true, inviteExpiresAt: true },
  });
  if (!user?.inviteExpiresAt || user.inviteExpiresAt < new Date()) return null;
  return user;
}

export async function acceptInvite(_prev: InviteState, formData: FormData): Promise<InviteState> {
  const token = String(formData.get("token") ?? "");
  const password = String(formData.get("password") ?? "");
  const confirm = String(formData.get("confirm") ?? "");
  if (password.length < 8) return { error: "Choose a password of at least 8 characters." };
  if (password !== confirm) return { error: "The two passwords do not match." };

  // Re-checked here rather than trusted from the page that rendered the form:
  // the link may have expired, or been used, in between.
  const invite = await findInvite(token);
  if (!invite) {
    return { error: "This invitation has expired or has already been used. Ask for a new link." };
  }

  await prisma.user.update({
    where: { id: invite.id },
    // The link is spent as the password is set, so it cannot be used twice.
    data: { passwordHash: await hashPassword(password), inviteToken: null, inviteExpiresAt: null },
    select: { id: true },
  });
  await createSession(invite.id);
  redirect("/");
}
