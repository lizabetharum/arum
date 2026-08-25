// Serves an uploaded PDF, behind the same access check as the item itself — so
// a copied URL is worthless to anyone the item is not shared with.
//
// This is the only place the bytes are read. Every other query works on Item
// rows alone, which is why the file lives in its own table.
import { getCurrentUser } from "@/lib/auth";
import { getAccessibleItem } from "@/lib/access";
import { prisma } from "@/lib/db";

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser();
  if (!user) return new Response("Sign in first.", { status: 401 });
  const { id } = await params;

  // The access check runs against the item before the file is fetched at all.
  const item = await getAccessibleItem(user, id);
  if (!item || item.kind !== "pdf") return new Response("Not found.", { status: 404 });

  let file;
  try {
    file = await prisma.itemFile.findUnique({ where: { itemId: id } });
  } catch {
    // The table only exists once sql/07 has been run.
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
      // The bytes are whatever was uploaded, so never let a browser decide for
      // itself that they are something else worth executing.
      "X-Content-Type-Options": "nosniff",
      "X-Robots-Tag": "noindex",
      "Cache-Control": "private, no-store",
    },
  });
}
