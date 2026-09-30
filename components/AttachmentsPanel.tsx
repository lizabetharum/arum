"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Loader2Icon, PaperclipIcon } from "lucide-react";
import {
  INLINE_IMAGE_TYPES,
  MAX_ATTACHMENT_BYTES,
  formatBytes,
  isBlockedAttachment,
} from "@/lib/constants";
import { deleteAttachment, updateAttachmentCaption } from "@/lib/admin-actions";
import { ConfirmButton } from "@/components/ConfirmButton";
import { SubmitButton } from "@/components/SubmitButton";
import type { GalleryAttachment } from "@/components/AttachmentGallery";

type Upload = {
  key: string;
  name: string;
  size: number;
  status: "waiting" | "uploading" | "failed";
  message?: string;
};

const input =
  "w-full rounded-lg border border-input bg-card px-2.5 py-1.5 text-sm transition-colors outline-none placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50";

/** Why a file will be refused, checked before it is sent so the answer is instant. */
function problemWith(file: File): string | null {
  if (file.size === 0) return "The file is empty.";
  if (file.size > MAX_ATTACHMENT_BYTES) {
    return `${formatBytes(file.size)}, over the ${formatBytes(MAX_ATTACHMENT_BYTES)} limit. Export it smaller and try again.`;
  }
  if (isBlockedAttachment(file.name, file.type)) return "SVG and HTML files can run scripts, so they can't be attached.";
  return null;
}

/**
 * The admin side of attachments: add files, caption them, remove them.
 *
 * Files go up one at a time, each in its own request, so the platform's 4.5 MB
 * request cap applies to each file rather than to the whole batch.
 */
export function AttachmentsPanel({
  itemId,
  available,
  attachments,
}: {
  itemId: string;
  /** False until sql/09 has been run. */
  available: boolean;
  attachments: GalleryAttachment[];
}) {
  const router = useRouter();
  const picker = useRef<HTMLInputElement>(null);
  const [uploads, setUploads] = useState<Upload[]>([]);
  const [dragging, setDragging] = useState(false);
  const busy = uploads.some((u) => u.status === "waiting" || u.status === "uploading");

  const patch = (key: string, change: Partial<Upload>) =>
    setUploads((list) => list.map((u) => (u.key === key ? { ...u, ...change } : u)));

  async function send(files: File[]) {
    if (files.length === 0 || busy) return;
    const batch = files.map((file, i) => {
      const problem = problemWith(file);
      return {
        file,
        entry: {
          key: `${Date.now()}-${i}-${file.name}`,
          name: file.name,
          size: file.size,
          status: problem ? "failed" : "waiting",
          message: problem ?? undefined,
        } satisfies Upload,
      };
    });
    setUploads(batch.map((b) => b.entry));

    let added = 0;
    for (const { file, entry } of batch) {
      if (entry.status === "failed") continue;
      patch(entry.key, { status: "uploading" });
      const body = new FormData();
      body.append("file", file);
      let error: string | null = null;
      try {
        const res = await fetch(`/admin/items/${itemId}/attachments`, { method: "POST", body });
        const json = await res.json().catch(() => null);
        if (!res.ok || !json?.ok) {
          error =
            json?.error ??
            (res.status === 413
              ? "Too large for the server to accept."
              : `The server refused it (error ${res.status}).`);
        }
      } catch {
        error = "The connection dropped. Try this file again.";
      }
      if (error) {
        patch(entry.key, { status: "failed", message: error });
      } else {
        added += 1;
        // Done: drop it from the queue. It shows up in the list below on refresh.
        setUploads((list) => list.filter((u) => u.key !== entry.key));
      }
    }

    if (added > 0) {
      toast.success(added === 1 ? "Attachment added." : `${added} attachments added.`);
      router.refresh();
    }
  }

  return (
    <section id="attachments" className="rounded-xl border border-border bg-card p-4">
      <h2 className="text-sm font-semibold">
        Attachments{" "}
        {attachments.length > 0 && (
          <span className="font-normal text-muted-foreground">({attachments.length})</span>
        )}
      </h2>
      <p className="mb-3 mt-0.5 text-sm text-muted-foreground">
        Extra files shown under this item, such as images from a webinar next to its transcript.
        Images (PNG, JPEG, GIF, WebP) appear in a gallery. Any other file is a download. Up to{" "}
        {formatBytes(MAX_ATTACHMENT_BYTES)} each, as many as you like. Uploads save right away,
        separately from the Save button above.
      </p>

      {!available ? (
        <p className="rounded-lg border border-amber-300 bg-amber-50 px-3 py-2 text-sm text-amber-900">
          Attachments need one more database update. Run <code>sql/09-add-attachments.sql</code>{" "}
          in the Supabase SQL Editor, then reload this page.
        </p>
      ) : (
        <>
          <div
            onDragOver={(e) => {
              e.preventDefault();
              setDragging(true);
            }}
            onDragLeave={() => setDragging(false)}
            onDrop={(e) => {
              e.preventDefault();
              setDragging(false);
              void send(Array.from(e.dataTransfer.files));
            }}
            className={`flex flex-wrap items-center gap-3 rounded-lg border border-dashed px-4 py-5 text-sm transition-colors ${
              dragging ? "border-stone-500 bg-stone-100" : "border-stone-300 bg-stone-50"
            }`}
          >
            <button
              type="button"
              disabled={busy}
              onClick={() => picker.current?.click()}
              className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-input bg-card px-3 text-sm font-medium transition-colors hover:bg-muted disabled:opacity-50"
            >
              {busy ? <Loader2Icon className="size-4 animate-spin" aria-hidden /> : <PaperclipIcon className="size-4" aria-hidden />}
              {busy ? "Uploading…" : "Choose files"}
            </button>
            <span className="text-muted-foreground">or drop them here. You can pick several at once.</span>
            <input
              ref={picker}
              type="file"
              multiple
              hidden
              onChange={(e) => {
                const files = Array.from(e.target.files ?? []);
                // Cleared so choosing the same file again still fires a change.
                e.target.value = "";
                void send(files);
              }}
            />
          </div>

          {uploads.length > 0 && (
            <ul className="mt-3 space-y-1 text-sm">
              {uploads.map((u) => (
                <li key={u.key} className="flex flex-wrap items-baseline gap-x-2">
                  <span className="break-all">{u.name}</span>
                  <span className="text-xs text-muted-foreground">{formatBytes(u.size)}</span>
                  {u.status === "waiting" && <span className="text-xs text-muted-foreground">Waiting…</span>}
                  {u.status === "uploading" && (
                    <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
                      <Loader2Icon className="size-3 animate-spin" aria-hidden /> Uploading…
                    </span>
                  )}
                  {u.status === "failed" && <span className="text-xs text-red-600">Not added. {u.message}</span>}
                </li>
              ))}
            </ul>
          )}

          {attachments.length > 0 && (
            <ul className="mt-4 divide-y divide-border">
              {attachments.map((a) => {
                const src = `/items/${itemId}/attachments/${a.id}`;
                const isImage = INLINE_IMAGE_TYPES.includes(a.mimeType);
                return (
                  <li key={a.id} className="flex flex-wrap items-start gap-4 py-3">
                    <a
                      href={src}
                      target="_blank"
                      rel="noreferrer"
                      className="flex size-20 shrink-0 items-center justify-center overflow-hidden rounded-lg border border-stone-200 bg-stone-50"
                      title="Open"
                    >
                      {isImage ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={src} alt={a.caption || a.filename} loading="lazy" className="size-full object-contain" />
                      ) : (
                        <span className="text-2xl" aria-hidden>
                          📄
                        </span>
                      )}
                    </a>
                    <div className="min-w-0 flex-1 space-y-2">
                      <p className="text-sm">
                        <span className="break-all">{a.filename || "attachment"}</span>
                        <span className="ml-2 text-xs text-muted-foreground">{formatBytes(a.size)}</span>
                      </p>
                      <form action={updateAttachmentCaption} className="flex flex-wrap gap-2">
                        <input type="hidden" name="attachmentId" value={a.id} />
                        <input
                          name="caption"
                          defaultValue={a.caption}
                          maxLength={500}
                          placeholder={isImage ? "Caption, also used as alt text" : "Caption"}
                          aria-label={`Caption for ${a.filename}`}
                          className={`${input} min-w-48 flex-1`}
                        />
                        <SubmitButton variant="outline" size="sm" pendingLabel="Saving…">
                          Save caption
                        </SubmitButton>
                      </form>
                    </div>
                    <form action={deleteAttachment}>
                      <input type="hidden" name="attachmentId" value={a.id} />
                      <ConfirmButton
                        title={`Remove ${a.filename || "this attachment"}?`}
                        description="It disappears from this item for everyone, including anyone with a share link. This can't be undone."
                        confirmLabel="Remove"
                        pendingLabel="Removing…"
                        variant="outline"
                      >
                        Remove
                      </ConfirmButton>
                    </form>
                  </li>
                );
              })}
            </ul>
          )}
        </>
      )}
    </section>
  );
}
