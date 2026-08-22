// Serves an HTML item's stored page — behind the same access check as the item
// itself, so a copied URL is worthless to anyone the item isn't shared with.
import { getCurrentUser } from "@/lib/auth";
import { getAccessibleItem } from "@/lib/access";
import { REVIEW_LAYER } from "@/lib/review-layer";

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser();
  if (!user) return new Response("Sign in first.", { status: 401 });
  const { id } = await params;
  const item = await getAccessibleItem(user, id);
  if (!item || item.kind !== "html") return new Response("Not found.", { status: 404 });

  // ?review=1 is set by the item page's iframe. Opening the page directly gets
  // the document exactly as stored, with none of the commenting furniture.
  const review = new URL(req.url).searchParams.get("review") === "1";
  const body = review ? item.htmlContent + REVIEW_LAYER : item.htmlContent;

  return new Response(body, {
    headers: {
      "Content-Type": "text/html; charset=utf-8",
      "X-Robots-Tag": "noindex",
      "Cache-Control": "private, no-store",
    },
  });
}
