import "server-only";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";
import { INLINE_IMAGE_TYPES } from "@/lib/constants";

/**
 * Attachments: any number of extra files on one item. The bytes are read only
 * by the two routes that serve a file; everything here that lists them selects
 * around the data column.
 */

export type AttachmentMeta = {
  id: string;
  filename: string;
  mimeType: string;
  size: number;
  caption: string;
};

export type AttachmentList =
  | { available: false; attachments: [] }
  | { available: true; attachments: AttachmentMeta[] };

/** True when the ItemAttachment table does not exist yet: sql/09 is pending. */
export function isMissingAttachmentTable(e: unknown) {
  return e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2021";
}

export const RUN_ATTACHMENTS_MIGRATION =
  "Attachments need one more database update. Run sql/09-add-attachments.sql in the Supabase SQL Editor, then try again.";

/** An item's attachments in upload order, without their bytes. */
export async function listAttachments(itemId: string): Promise<AttachmentList> {
  try {
    const attachments = await prisma.itemAttachment.findMany({
      where: { itemId },
      orderBy: { createdAt: "asc" },
      select: { id: true, filename: true, mimeType: true, size: true, caption: true },
    });
    return { available: true, attachments };
  } catch (e) {
    if (isMissingAttachmentTable(e)) return { available: false, attachments: [] };
    throw e;
  }
}

export function isInlineImage(mimeType: string) {
  return INLINE_IMAGE_TYPES.includes(mimeType);
}

/**
 * What a file really is, from its first bytes. The browser's claim is not
 * trusted: a file named photo.png that is really an HTML page gets no image
 * type and is only ever served as a download.
 */
export function sniffType(bytes: Uint8Array): string {
  const starts = (sig: number[], at = 0) => sig.every((b, i) => bytes[at + i] === b);
  const ascii = (s: string, at = 0) => starts([...s].map((c) => c.charCodeAt(0)), at);
  if (starts([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])) return "image/png";
  if (starts([0xff, 0xd8, 0xff])) return "image/jpeg";
  if (ascii("GIF87a") || ascii("GIF89a")) return "image/gif";
  if (ascii("RIFF") && ascii("WEBP", 8)) return "image/webp";
  if (ascii("%PDF-")) return "application/pdf";
  return "application/octet-stream";
}

/**
 * The HTTP response for one stored attachment.
 *
 * Images and PDFs open in the browser unless a download is asked for. Anything
 * else is always a download under a generic type, so no stored file can be
 * rendered as a page on this site's origin.
 */
export function attachmentResponse(
  file: { filename: string; mimeType: string; size: number; data: Uint8Array },
  wantDownload: boolean,
) {
  const viewable = isInlineImage(file.mimeType) || file.mimeType === "application/pdf";
  const type = viewable ? file.mimeType : "application/octet-stream";
  const inline = viewable && !wantDownload;
  const name = (file.filename || "attachment").replace(/[^\w.\- ]+/g, "_");

  return new Response(new Uint8Array(file.data), {
    headers: {
      "Content-Type": type,
      "Content-Length": String(file.size),
      "Content-Disposition": `${inline ? "inline" : "attachment"}; filename="${name}"`,
      "X-Content-Type-Options": "nosniff",
      "X-Robots-Tag": "noindex",
      // A few minutes of private caching so a gallery does not refetch every
      // image on each visit. Short, because revoking someone's access should
      // take effect about as soon as they next look.
      "Cache-Control": "private, max-age=300",
    },
  });
}

/** One attachment with its bytes, only if it belongs to the given item. */
export async function readAttachment(itemId: string, attachmentId: string) {
  try {
    return await prisma.itemAttachment.findFirst({
      where: { id: attachmentId, itemId },
      select: { filename: true, mimeType: true, size: true, data: true },
    });
  } catch (e) {
    if (isMissingAttachmentTable(e)) return null;
    throw e;
  }
}
