import { notFound } from "next/navigation";
import { SITE_NAME } from "@/lib/constants";
import { isMarkdownKind, kindIcon } from "@/lib/constants";
import { embedUrl } from "@/lib/embed";
import { getSharedItem } from "@/lib/share";
import { NotePreview } from "@/components/NotePreview";
import { listAttachments } from "@/lib/attachments";
import { AttachmentGallery } from "@/components/AttachmentGallery";

// Unlisted, not public: a search engine should never turn one of these up.
export const metadata = { robots: { index: false, follow: false } };

function expiryNote(at: Date | null) {
  if (!at) return null;
  const days = Math.ceil((at.getTime() - Date.now()) / (1000 * 60 * 60 * 24));
  if (days <= 1) return "This link expires today.";
  return `This link expires in ${days} days.`;
}

export default async function SharedItemPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  const shared = await getSharedItem(token);
  // A revoked, expired or invented token all end here, telling none of them
  // apart — there is nothing to learn by trying one.
  if (!shared) notFound();
  const { item, expiresAt } = shared;
  const isGoogle = item.kind.startsWith("google_");
  const note = expiryNote(expiresAt);
  const extras = await listAttachments(item.id);

  return (
    <main className="min-h-screen bg-stone-100">
      <header className="border-b border-stone-200 bg-white">
        <div className="mx-auto max-w-5xl px-6 py-3 text-sm font-semibold text-stone-800">
          {SITE_NAME}
        </div>
      </header>

      <div className="mx-auto max-w-5xl px-6 py-8">
        <h1 className="text-2xl font-semibold text-stone-900">
          {kindIcon(item.kind)} {item.title}
        </h1>
        {item.description && <p className="mt-1 max-w-2xl text-stone-500">{item.description}</p>}

        {item.kind === "pdf" && (
          <object
            data={`/shared/${token}/file`}
            type="application/pdf"
            className="mt-6 h-[80vh] w-full rounded-xl border border-stone-200 bg-white"
          >
            <div className="p-6 text-sm text-stone-600">
              <p>This browser will not display the PDF inline.</p>
              <a
                href={`/shared/${token}/file?download=1`}
                className="mt-2 inline-block rounded-lg bg-stone-800 px-3 py-1.5 text-white hover:bg-stone-700"
              >
                Download the PDF
              </a>
            </div>
          </object>
        )}

        {isGoogle && item.url && (
          <iframe
            src={embedUrl(item.kind, item.url)}
            className="mt-6 h-[75vh] w-full rounded-xl border border-stone-200 bg-white"
            allow="fullscreen"
          />
        )}

        {isMarkdownKind(item.kind) && (
          <article className="mt-6 rounded-xl border border-stone-200 bg-white p-6">
            <NotePreview markdown={item.body} />
          </article>
        )}

        {item.kind === "image" && item.url && (
          <figure className="mt-6 rounded-xl border border-stone-200 bg-white p-4">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={item.url}
              alt={item.description || item.title}
              className="mx-auto max-w-full rounded"
            />
          </figure>
        )}

        {item.kind === "html" && (
          // Same sandbox the signed-in view uses: scripts may run, but with no
          // same-origin access, so a stored page cannot read this site's
          // cookies or reach anything else in the library.
          <iframe
            src={`/shared/${token}/html`}
            sandbox="allow-scripts allow-popups"
            className="mt-6 h-[80vh] w-full rounded-xl border border-stone-200 bg-white"
          />
        )}

        {item.kind === "link" && item.url && (
          <a
            href={item.url}
            target="_blank"
            rel="noreferrer noopener"
            className="mt-6 inline-block rounded-lg bg-stone-800 px-3 py-1.5 text-sm text-white hover:bg-stone-700"
          >
            Open link ↗
          </a>
        )}

        <AttachmentGallery attachments={extras.attachments} base={`/shared/${token}/attachments`} />

        <footer className="mt-8 border-t border-stone-200 pt-4 text-xs text-stone-500">
          <p>Shared with you as a read-only copy. {note}</p>
          {isMarkdownKind(item.kind) && item.body && (
            <a href={`/shared/${token}/markdown`} className="mt-2 inline-block underline">
              Download as Markdown
            </a>
          )}
        </footer>
      </div>
    </main>
  );
}
