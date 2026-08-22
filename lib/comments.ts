import "server-only";
import { prisma } from "@/lib/db";
import type { SessionUser } from "@/lib/auth";
import { itemAccessWhere } from "@/lib/access";

export type CommentRow = {
  id: string;
  thread: number;
  body: string;
  status: string;
  section: string;
  quotedText: string;
  prefix: string;
  suffix: string;
  createdAt: Date;
  author: string;
  authorId: string;
};

/**
 * Comments inherit the item's visibility rather than carrying rules of their
 * own: if you can open the item you can read and add notes on it, and if you
 * can't, its comments don't exist as far as you're concerned.
 */
export async function canSeeItem(user: SessionUser, itemId: string) {
  const found = await prisma.item.findFirst({
    where: { AND: [{ id: itemId }, itemAccessWhere(user)] },
    select: { id: true },
  });
  return found !== null;
}

export async function getComments(user: SessionUser, itemId: string): Promise<CommentRow[]> {
  if (!(await canSeeItem(user, itemId))) return [];
  const rows = await prisma.comment.findMany({
    where: { itemId },
    include: { user: { select: { id: true, name: true } } },
    orderBy: [{ thread: "asc" }, { createdAt: "asc" }],
  });
  return rows.map((c) => ({
    id: c.id,
    thread: c.thread,
    body: c.body,
    status: c.status,
    section: c.section,
    quotedText: c.quotedText,
    prefix: c.prefix,
    suffix: c.suffix,
    createdAt: c.createdAt,
    author: c.user.name,
    authorId: c.user.id,
  }));
}

/** Threads, in margin order, each with its notes. */
export function groupThreads(rows: CommentRow[]) {
  const byThread = new Map<number, CommentRow[]>();
  for (const r of rows) {
    const list = byThread.get(r.thread) ?? [];
    list.push(r);
    byThread.set(r.thread, list);
  }
  return [...byThread.entries()]
    .sort((a, b) => a[0] - b[0])
    .map(([thread, notes]) => ({
      thread,
      notes,
      status: notes[notes.length - 1]?.status ?? "open",
      quotedText: notes[0]?.quotedText ?? "",
      section: notes[0]?.section ?? "",
    }));
}

/**
 * Next thread number for an item.
 *
 * Numbers are never reused, even after a thread is deleted — a reader who wrote
 * down "see comment 4" should not find a different conversation there later.
 */
export async function nextThreadNumber(itemId: string) {
  const top = await prisma.comment.aggregate({
    where: { itemId },
    _max: { thread: true },
  });
  return (top._max.thread ?? 0) + 1;
}

/** Spreadsheet dump. Column order matches the review sheet this replaces. */
export function toCsv(rows: (CommentRow & { itemTitle?: string; projectName?: string })[]) {
  const cell = (v: string | number | Date) => {
    const s = v instanceof Date ? v.toISOString() : String(v);
    // Quote everything: comment bodies routinely contain commas and newlines,
    // and a bare quote inside a quoted field has to be doubled.
    return `"${s.replace(/"/g, '""')}"`;
  };
  const header = [
    "Thread", "Comment ID", "Timestamp", "Author", "Comment", "Status",
    "Project", "Item", "Section", "Quoted text", "Prefix", "Suffix",
  ];
  const lines = [header.map(cell).join(",")];
  for (const r of rows) {
    lines.push([
      r.thread, r.id, r.createdAt, r.author, r.body, r.status,
      r.projectName ?? "", r.itemTitle ?? "", r.section, r.quotedText, r.prefix, r.suffix,
    ].map(cell).join(","));
  }
  // BOM so Excel opens UTF-8 correctly on a double-click.
  return "﻿" + lines.join("\r\n") + "\r\n";
}
