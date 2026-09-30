// Serves one attachment, behind the same access check as the item it belongs
// to, so a copied URL is worthless to anyone the item is not shared with.
import { getCurrentUser } from "@/lib/auth";
import { getAccessibleItem } from "@/lib/access";
import { attachmentResponse, readAttachment } from "@/lib/attachments";

export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string; attachmentId: string }> },
) {
  const user = await getCurrentUser();
  if (!user) return new Response("Sign in first.", { status: 401 });
  const { id, attachmentId } = await params;

  // The access check runs against the item before the file is fetched at all.
  const item = await getAccessibleItem(user, id);
  if (!item) return new Response("Not found.", { status: 404 });

  const file = await readAttachment(item.id, attachmentId);
  if (!file) return new Response("Not found.", { status: 404 });

  return attachmentResponse(file, new URL(req.url).searchParams.get("download") === "1");
}
