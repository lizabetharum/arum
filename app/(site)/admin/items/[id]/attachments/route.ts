// Upload one attachment to an item. Admins only, like every other write.
//
// One file per request on purpose. Vercel refuses any request body over 4.5 MB,
// so a form carrying a whole batch of screenshots would fail as soon as the
// batch got big. The Attachments panel sends each file on its own, which makes
// the ceiling per file instead of per batch.
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { MAX_ATTACHMENT_BYTES, formatBytes, isBlockedAttachment } from "@/lib/constants";
import { RUN_ATTACHMENTS_MIGRATION, isMissingAttachmentTable, sniffType } from "@/lib/attachments";

function fail(error: string, status: number) {
  return Response.json({ ok: false, error }, { status });
}

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser();
  if (!user || user.role !== "admin") return fail("Only an admin can add attachments.", 403);
  const { id } = await params;

  const item = await prisma.item.findUnique({ where: { id }, select: { id: true } });
  if (!item) return fail("That item no longer exists.", 404);

  let form: FormData;
  try {
    form = await req.formData();
  } catch {
    return fail("The upload arrived incomplete. Try again.", 400);
  }
  const file = form.get("file");
  if (!(file instanceof File) || file.size === 0) return fail("No file was sent.", 400);
  if (file.size > MAX_ATTACHMENT_BYTES) {
    return fail(
      `${file.name} is ${formatBytes(file.size)}. The limit is ${formatBytes(MAX_ATTACHMENT_BYTES)} per file.`,
      413,
    );
  }
  if (isBlockedAttachment(file.name, file.type)) {
    return fail(`${file.name} can't be attached. SVG and HTML files can run scripts.`, 415);
  }

  const data = Buffer.from(await file.arrayBuffer());
  try {
    const row = await prisma.itemAttachment.create({
      data: {
        itemId: id,
        filename: file.name.slice(0, 200),
        mimeType: sniffType(data),
        size: data.byteLength,
        data,
      },
      select: { id: true },
    });
    return Response.json({ ok: true, id: row.id });
  } catch (e) {
    if (isMissingAttachmentTable(e)) return fail(RUN_ATTACHMENTS_MIGRATION, 409);
    throw e;
  }
}
