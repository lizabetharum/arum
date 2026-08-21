import Link from "next/link";
import { notFound } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { getAccessibleItem } from "@/lib/access";
import { embedUrl } from "@/lib/embed";
import { categoryLabel, kindIcon, kindLabel } from "@/lib/constants";

/**
 * A Claude Artifact "Save page as HTML" gives you the bootstrap shell, which is
 * useless without Anthropic's origin and the reader's session. Both markers are
 * specific to that shell, so a false positive on an ordinary page is unlikely.
 */
function looksLikeArtifactShell(html: string) {
  return html.includes("frame.claudeusercontent.com") || html.includes("data-frame-uuid");
}

export default async function ItemPage({ params }: { params: Promise<{ id: string }> }) {
  const user = await requireUser();
  const { id } = await params;
  const item = await getAccessibleItem(user, id);
  if (!item) notFound();

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
          This is the <strong>loader page</strong> for a Claude Artifact, not the artifact
          itself — it fetches the real content from Anthropic using your Claude session, which
          it can&apos;t do from here, so it will only ever show a spinner. Save the artifact&apos;s
          share URL as a <strong>Link</strong> item instead.
        </p>
      )}
      {item.kind === "html" && (
        <iframe
          src={`/items/${item.id}/html`}
          sandbox="allow-scripts allow-popups"
          className="mt-6 w-full h-[75vh] rounded-xl border border-stone-200 bg-white"
        />
      )}
    </div>
  );
}
