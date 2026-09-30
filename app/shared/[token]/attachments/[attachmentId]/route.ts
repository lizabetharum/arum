// An attachment behind a share link. Reached only through a live token, and
// only for attachments on the one item that token opens.
import { getSharedItem } from "@/lib/share";
import { attachmentResponse, readAttachment } from "@/lib/attachments";

export async function GET(
  req: Request,
  { params }: { params: Promise<{ token: string; attachmentId: string }> },
) {
  const { token, attachmentId } = await params;
  const shared = await getSharedItem(token);
  if (!shared) return new Response("Not found.", { status: 404 });

  const file = await readAttachment(shared.item.id, attachmentId);
  if (!file) return new Response("Not found.", { status: 404 });

  return attachmentResponse(file, new URL(req.url).searchParams.get("download") === "1");
}
