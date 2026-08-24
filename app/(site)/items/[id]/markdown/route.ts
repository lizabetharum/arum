// Hands back a Markdown item as a .md file, behind the same access check as the
// item itself. What you put in you can take out again — so a document can be
// edited here and still go back to wherever else it needs to live.
import { getCurrentUser } from "@/lib/auth";
import { getAccessibleItem } from "@/lib/access";
import { isMarkdownKind } from "@/lib/constants";

/** A filename from the title: safe characters only, and never empty. */
function filename(title: string) {
  const stem =
    title
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 60) || "document";
  return `${stem}.md`;
}

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser();
  if (!user) return new Response("Sign in first.", { status: 401 });
  const { id } = await params;
  const item = await getAccessibleItem(user, id);
  if (!item || !isMarkdownKind(item.kind)) return new Response("Not found.", { status: 404 });

  return new Response(item.body, {
    headers: {
      "Content-Type": "text/markdown; charset=utf-8",
      "Content-Disposition": `attachment; filename="${filename(item.title)}"`,
      "X-Robots-Tag": "noindex",
      "Cache-Control": "private, no-store",
    },
  });
}
