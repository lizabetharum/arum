// The Markdown behind a share link, as a .md file.
import { isMarkdownKind } from "@/lib/constants";
import { getSharedItem } from "@/lib/share";

function filename(title: string) {
  const stem =
    title
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 60) || "document";
  return `${stem}.md`;
}

export async function GET(_req: Request, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const shared = await getSharedItem(token);
  if (!shared || !isMarkdownKind(shared.item.kind)) {
    return new Response("Not found.", { status: 404 });
  }

  return new Response(shared.item.body, {
    headers: {
      "Content-Type": "text/markdown; charset=utf-8",
      "Content-Disposition": `attachment; filename="${filename(shared.item.title)}"`,
      "X-Robots-Tag": "noindex",
      "Cache-Control": "private, no-store",
    },
  });
}
