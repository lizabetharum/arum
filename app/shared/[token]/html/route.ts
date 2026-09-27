// The stored page behind a share link, served for the sandboxed iframe on the
// shared view. No review layer: a reader without an account cannot comment.
import { getSharedItem } from "@/lib/share";

export async function GET(_req: Request, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const shared = await getSharedItem(token);
  if (!shared || shared.item.kind !== "html") return new Response("Not found.", { status: 404 });

  return new Response(shared.item.htmlContent, {
    headers: {
      "Content-Type": "text/html; charset=utf-8",
      "X-Robots-Tag": "noindex",
      "Cache-Control": "private, no-store",
    },
  });
}
