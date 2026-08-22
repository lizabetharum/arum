// One item's comments as a spreadsheet, behind the same access check as the item.
import { getCurrentUser } from "@/lib/auth";
import { getAccessibleItem } from "@/lib/access";
import { getComments, toCsv } from "@/lib/comments";

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser();
  if (!user) return new Response("Sign in first.", { status: 401 });
  const { id } = await params;
  const item = await getAccessibleItem(user, id);
  if (!item) return new Response("Not found.", { status: 404 });

  const rows = await getComments(user, id);
  const csv = toCsv(rows.map((r) => ({ ...r, itemTitle: item.title, projectName: item.project.name })));
  const slug = item.title.replace(/[^a-z0-9]+/gi, "-").replace(/^-+|-+$/g, "").toLowerCase() || "comments";
  return new Response(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${slug}-comments.csv"`,
      "Cache-Control": "private, no-store",
    },
  });
}
