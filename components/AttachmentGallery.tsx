import { INLINE_IMAGE_TYPES, formatBytes } from "@/lib/constants";

export type GalleryAttachment = {
  id: string;
  filename: string;
  mimeType: string;
  size: number;
  caption: string;
};

/**
 * An item's attachments, for readers. Images sit in a grid and open full size
 * in a new tab. Any other file is a line with a download link.
 *
 * `base` is the route the files are served from, which differs between the
 * signed-in page and a share link. The component knows nothing about access;
 * whoever renders it has already decided the viewer may see the item.
 */
export function AttachmentGallery({
  attachments,
  base,
}: {
  attachments: GalleryAttachment[];
  base: string;
}) {
  if (attachments.length === 0) return null;
  const images = attachments.filter((a) => INLINE_IMAGE_TYPES.includes(a.mimeType));
  const files = attachments.filter((a) => !INLINE_IMAGE_TYPES.includes(a.mimeType));

  return (
    <section className="mt-6 rounded-xl border border-stone-200 bg-white p-4">
      <h2 className="mb-3 text-sm font-semibold text-stone-800">
        Attachments <span className="font-normal text-stone-400">({attachments.length})</span>
      </h2>

      {images.length > 0 && (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {images.map((a) => (
            <figure key={a.id} className="min-w-0">
              <a
                href={`${base}/${a.id}`}
                target="_blank"
                rel="noreferrer"
                className="block overflow-hidden rounded-lg border border-stone-200 bg-stone-50 hover:border-stone-400"
                title="Open full size"
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={`${base}/${a.id}`}
                  alt={a.caption || a.filename}
                  loading="lazy"
                  className="h-48 w-full object-contain"
                />
              </a>
              {a.caption && (
                <figcaption className="mt-1.5 text-sm text-stone-600">{a.caption}</figcaption>
              )}
            </figure>
          ))}
        </div>
      )}

      {files.length > 0 && (
        <ul className={`divide-y divide-stone-100 text-sm ${images.length > 0 ? "mt-4" : ""}`}>
          {files.map((a) => (
            <li key={a.id} className="flex flex-wrap items-center justify-between gap-2 py-2">
              <span className="min-w-0">
                <span className="break-all">📄 {a.filename || "attachment"}</span>
                <span className="ml-2 text-xs text-stone-400">{formatBytes(a.size)}</span>
                {a.caption && <span className="block text-xs text-stone-500">{a.caption}</span>}
              </span>
              <span className="flex gap-2">
                {a.mimeType === "application/pdf" && (
                  <a
                    href={`${base}/${a.id}`}
                    target="_blank"
                    rel="noreferrer"
                    className="rounded-lg border border-stone-300 bg-white px-2.5 py-1 text-xs hover:border-stone-500"
                  >
                    Open ↗
                  </a>
                )}
                <a
                  href={`${base}/${a.id}?download=1`}
                  className="rounded-lg border border-stone-300 bg-white px-2.5 py-1 text-xs hover:border-stone-500"
                >
                  Download
                </a>
              </span>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
