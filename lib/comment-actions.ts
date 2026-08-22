"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { canSeeItem, nextThreadNumber } from "@/lib/comments";

function str(f: FormData, k: string) {
  return String(f.get(k) ?? "").trim();
}

/**
 * Start a thread, or add to one.
 *
 * A `thread` of 0 means "new thread" — the number is assigned here rather than
 * in the browser so two people commenting at the same moment can't claim the
 * same one. An anchor (quoted/prefix/suffix) is only carried on a new thread;
 * replies inherit the anchor of the thread they join.
 */
export async function addComment(formData: FormData) {
  const user = await requireUser();
  const itemId = str(formData, "itemId");
  const body = str(formData, "body");
  if (!body) return;
  if (!(await canSeeItem(user, itemId))) return;

  const requested = Number(str(formData, "thread") || "0");
  const isReply = Number.isInteger(requested) && requested > 0;

  await prisma.comment.create({
    data: {
      itemId,
      userId: user.id,
      thread: isReply ? requested : await nextThreadNumber(itemId),
      body,
      section: str(formData, "section").slice(0, 200),
      // Only a thread's opening note carries the anchor.
      quotedText: isReply ? "" : str(formData, "quotedText").slice(0, 2000),
      prefix: isReply ? "" : str(formData, "prefix").slice(0, 200),
      suffix: isReply ? "" : str(formData, "suffix").slice(0, 200),
    },
  });
  revalidatePath(`/items/${itemId}`);
}

/** Resolve or reopen a whole thread — the status is carried on every note. */
export async function setThreadStatus(formData: FormData) {
  const user = await requireUser();
  const itemId = str(formData, "itemId");
  const thread = Number(str(formData, "thread"));
  const status = str(formData, "status") === "resolved" ? "resolved" : "open";
  if (!Number.isInteger(thread) || !(await canSeeItem(user, itemId))) return;
  await prisma.comment.updateMany({ where: { itemId, thread }, data: { status } });
  revalidatePath(`/items/${itemId}`);
}

/**
 * Remove one note. Its author can delete their own; an admin can delete any.
 * Deleting a thread's last note does not free its number — see nextThreadNumber.
 */
export async function deleteComment(formData: FormData) {
  const user = await requireUser();
  const id = str(formData, "commentId");
  const comment = await prisma.comment.findUnique({ where: { id } });
  if (!comment) return;
  if (comment.userId !== user.id && user.role !== "admin") return;
  if (!(await canSeeItem(user, comment.itemId))) return;
  await prisma.comment.delete({ where: { id } });
  revalidatePath(`/items/${comment.itemId}`);
}
