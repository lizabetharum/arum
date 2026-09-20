// The PDF behind a share link. Reached only through a live token, and only for
// the one item that token opens.
import { prisma } from "@/lib/db";
import { getSharedItem } from "@/lib/share";

export async function GET(req: Request, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const shared = await getSharedItem(token);
  if (!shared || shared.item.kind !== "pdf") return new Response("Not found.", { status: 404 });

  let file;
  try {
    file = await prisma.itemFile.findUnique({ where: { itemId: shared.item.id } });
  } catch {
    return new Response("No file stored.", { status: 404 });
  }
  if (!file) return new Response("No file stored.", { status: 404 });

  const download = new URL(req.url).searchParams.get("download") === "1";
  const name = (file.filename || "document.pdf").replace(/[^\w.\- ]+/g, "_");

  return new Response(new Uint8Array(file.data), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Length": String(file.size),
      "Content-Disposition": `${download ? "attachment" : "inline"}; filename="${name}"`,
      "X-Content-Type-Options": "nosniff",
      "X-Robots-Tag": "noindex",
      "Cache-Control": "private, no-store",
    },
  });
}
