import "server-only";
import { randomBytes } from "crypto";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";

/**
 * Share links: read-only access to one item, for someone with no account.
 *
 * Two rules make this safe to hand out. The token is the primary key, so a link
 * carries no item id to tamper with and a lookup either finds exactly one item
 * or nothing. And a link only exists for an item somebody deliberately shared —
 * there is no row for anything else, so nothing else can be reached this way.
 */

/** Long enough that guessing is hopeless: 32 random bytes, hex encoded. */
function newToken() {
  return randomBytes(32).toString("hex");
}

/** How long a new link lasts. Null is "until I revoke it". */
export const EXPIRY_CHOICES = [
  { value: "7", label: "7 days" },
  { value: "30", label: "30 days" },
  { value: "90", label: "90 days" },
  { value: "never", label: "Until I revoke it" },
] as const;

function expiryFrom(choice: string): Date | null {
  const days = Number(choice);
  if (!Number.isFinite(days) || days <= 0) return null;
  return new Date(Date.now() + days * 24 * 60 * 60 * 1000);
}

/** The table only exists once sql/08 has been run. */
function isMissingTable(e: unknown) {
  return e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2021";
}

export type ShareState =
  | { available: false }
  | { available: true; share: { token: string; expiresAt: Date | null } | null };

/** Whether this item is shared, for the panel on the item page. */
export async function getShareState(itemId: string): Promise<ShareState> {
  try {
    const share = await prisma.itemShare.findUnique({
      where: { itemId },
      select: { token: true, expiresAt: true },
    });
    return { available: true, share };
  } catch (e) {
    if (isMissingTable(e)) return { available: false };
    throw e;
  }
}

/**
 * The item a share token opens, or null.
 *
 * An expired link is treated exactly like one that never existed: no item, no
 * hint that the token was ever real.
 */
export async function getSharedItem(token: string) {
  if (!token || token.length < 32) return null;
  let share;
  try {
    share = await prisma.itemShare.findUnique({
      where: { token },
      select: { expiresAt: true, itemId: true },
    });
  } catch (e) {
    if (isMissingTable(e)) return null;
    throw e;
  }
  if (!share) return null;
  if (share.expiresAt && share.expiresAt.getTime() <= Date.now()) return null;

  const item = await prisma.item.findUnique({
    where: { id: share.itemId },
    select: {
      id: true,
      title: true,
      description: true,
      kind: true,
      url: true,
      htmlContent: true,
      body: true,
      // Deliberately not the project, the tags, the comments or who it is
      // restricted to. A reader outside the library sees the document and
      // nothing about how it is filed or who else can see it.
    },
  });
  return item ? { item, expiresAt: share.expiresAt } : null;
}

/** Replace any existing link with a new one. Returns null if sql/08 is pending. */
export async function createShare(itemId: string, expiryChoice: string) {
  const token = newToken();
  try {
    await prisma.$transaction([
      // Replacing rather than adding, so an item never has two live links.
      prisma.itemShare.deleteMany({ where: { itemId } }),
      prisma.itemShare.create({
        data: { token, itemId, expiresAt: expiryFrom(expiryChoice) },
        select: { token: true },
      }),
    ]);
    return token;
  } catch (e) {
    if (isMissingTable(e)) return null;
    throw e;
  }
}

/** Revoke by deleting the row, so the link stops working at once. */
export async function revokeShare(itemId: string) {
  try {
    await prisma.itemShare.deleteMany({ where: { itemId } });
  } catch (e) {
    if (!isMissingTable(e)) throw e;
  }
}
