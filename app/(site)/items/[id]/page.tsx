import Link from "next/link";
import { notFound } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { getAccessibleItem } from "@/lib/access";
import { embedUrl } from "@/lib/embed";
import { categoryLabel, kindIcon, kindLabel } from "@/lib/constants";
import { looksLikeArtifactShell } from "@/lib/sanitize-html";
import { getComments, groupThreads } from "@/lib/comments";
import { Comments } from "@/components/Comments";
import { ReviewFrame } from "@/components/ReviewFrame";

export default async function ItemPage({ params }: { params: Promise<{ id: string }> }) {
  const user = await requireUser();
  const { id } = await params;
  const item = await getAccessibleItem(user, id);
  if (!item) notFound();
  const comments = await getComments(user, id);

  const isGoogle = item.kind.startsWith("google_");

  return (
    <div>
      <nav className="text-sm text-stone-500 mb-3">
        <Link href={`/projects/${item.project.slug}`} className="hover:text-stone-800">
          {item.project.name}
        </Link>
        <span className="mx-1.5">/</span>
        <span>{kindLabel(item.kind)}</span>
      </nav>

      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold">
            {kindIcon(item.kind)} {item.title}
          </h1>
          {item.description && <p className="text-stone-500 mt-1 max-w-2xl">{item.description}</p>}
          <div className="flex flex-wrap items-center gap-1.5 mt-2 text-xs">
            <span className="text-amber-800 bg-amber-50 border border-amber-200 rounded-full px-2 py-0.5">
              {categoryLabel(item.category)}
            </span>
            {item.tags.map(({ tag }) => (
              <span key={tag.id} className="text-stone-500 border border-stone-200 rounded-full px-2 py-0.5">
                {tag.name}
              </span>
            ))}
            {item.restricted && <span className="text-stone-400">🔒 restricted</span>}
          </div>
        </div>
        <div className="flex gap-2">
          {user.role === "admin" && (
            <Link
              href={`/admin/items/${item.id}`}
              className="rounded-lg border border-stone-300 bg-white px-3 py-1.5 text-sm hover:border-stone-500"
            >
              Edit
            </Link>
          )}
          {isGoogle && item.url && (
            <a
              href={item.url}
              target="_blank"
              rel="noreferrer"
              className="rounded-lg border border-stone-300 bg-white px-3 py-1.5 text-sm hover:border-stone-500"
            >
              Open in Google ↗
            </a>
          )}
          {item.kind === "html" && (
            <a
              href={`/items/${item.id}/html`}
              target="_blank"
              rel="noreferrer"
              className="rounded-lg border border-stone-300 bg-white px-3 py-1.5 text-sm hover:border-stone-500"
            >
              Open full screen ↗
            </a>
          )}
          {item.kind === "link" && item.url && (
            <a
              href={item.url}
              target="_blank"
              rel="noreferrer"
              className="rounded-lg bg-stone-800 text-white px-3 py-1.5 text-sm hover:bg-stone-700"
            >
              Open link ↗
            </a>
          )}
        </div>
      </div>

      {isGoogle && item.url && (
        <iframe
          src={embedUrl(item.kind, item.url)}
          className="mt-6 w-full h-[75vh] rounded-xl border border-stone-200 bg-white"
          allow="fullscreen"
        />
      )}
      {item.kind === "html" && looksLikeArtifactShell(item.htmlContent) && (
        <p className="mt-6 rounded-xl border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-900">
          <strong>This is the page around the artifact, not the artifact itself</strong> — it
          holds no content, only a script that fetches the real page from Anthropic, which it
          can&apos;t do from here. To fix it: <strong>Edit</strong> this item and paste the{" "}
          <code>&lt;html&gt;</code> from <em>inside</em> the artifact&apos;s{" "}
          <code>&lt;iframe&gt;</code> (expand the iframe node in the inspector first) — or ask
          Claude for &ldquo;the HTML for my <em>[artifact]</em> artifact as a file&rdquo; and
          load that with the file picker.
        </p>
      )}
      {item.kind === "html" && (
        <ReviewFrame
          itemId={item.id}
          anchors={groupThreads(comments)
            .filter((t) => t.quotedText)
            .map((t) => ({
              thread: t.thread,
              quoted: t.quotedText,
              prefix: t.notes[0].prefix,
              suffix: t.notes[0].suffix,
              status: t.status,
            }))}
        />
      )}
      <Comments
        itemId={item.id}
        rows={comments}
        viewerId={user.id}
        viewerIsAdmin={user.role === "admin"}
      />
    </div>
  );
}
