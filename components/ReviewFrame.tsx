"use client";

import { useEffect, useRef, useState } from "react";
import { addComment } from "@/lib/comment-actions";

type Anchor = { thread: number; quoted: string; prefix: string; suffix: string; status: string };

/**
 * The HTML item's iframe, plus the compose box that appears when a reader
 * selects text inside it.
 *
 * The frame is sandboxed without same-origin access, so this component can't
 * touch the document inside it. Everything crosses by postMessage: the page
 * reports a selection, this sends back the anchors to highlight. Messages are
 * only accepted from this component's own frame.
 */
export function ReviewFrame({ itemId, anchors }: { itemId: string; anchors: Anchor[] }) {
  const frame = useRef<HTMLIFrameElement>(null);
  const [pending, setPending] = useState<
    { quoted: string; prefix: string; suffix: string; section: string } | null
  >(null);
  const [lost, setLost] = useState<number[]>([]);

  useEffect(() => {
    function onMessage(e: MessageEvent) {
      // The frame has an opaque origin, so identify it by its window instead.
      if (!frame.current || e.source !== frame.current.contentWindow) return;
      const d = e.data as Record<string, unknown> | null;
      if (!d || typeof d !== "object") return;

      if (d.__rv === "ready") {
        frame.current.contentWindow?.postMessage({ __rv: "anchors", anchors }, "*");
      } else if (d.__rv === "select") {
        setPending({
          quoted: String(d.quoted ?? ""),
          prefix: String(d.prefix ?? ""),
          suffix: String(d.suffix ?? ""),
          section: String(d.section ?? ""),
        });
      } else if (d.__rv === "open") {
        document.getElementById(`thread-${d.thread}`)?.scrollIntoView({ behavior: "smooth", block: "center" });
      } else if (d.__rv === "drawn") {
        setLost(Array.isArray(d.missing) ? (d.missing as number[]) : []);
      }
    }
    window.addEventListener("message", onMessage);
    return () => window.removeEventListener("message", onMessage);
  }, [anchors]);

  // Redraw when a comment is added or resolved.
  useEffect(() => {
    frame.current?.contentWindow?.postMessage({ __rv: "anchors", anchors }, "*");
  }, [anchors]);

  return (
    <>
      <iframe
        ref={frame}
        src={`/items/${itemId}/html?review=1`}
        sandbox="allow-scripts allow-popups"
        className="mt-6 w-full h-[75vh] rounded-xl border border-stone-200 bg-white"
      />
      <p className="mt-1 text-xs text-stone-500">
        Select any text in the page to comment on it.
        {lost.length > 0 && (
          <>
            {" "}Comment{lost.length > 1 ? "s" : ""} {lost.join(", ")} no longer
            match{lost.length > 1 ? "" : "es"} the text they were written about — the wording
            changed, so {lost.length > 1 ? "they are" : "it is"} listed below without a
            highlight.
          </>
        )}
      </p>

      {pending && (
        <form
          action={addComment}
          onSubmit={() => setPending(null)}
          className="mt-3 rounded-xl border border-amber-300 bg-amber-50 p-4"
        >
          <input type="hidden" name="itemId" value={itemId} />
          <input type="hidden" name="thread" value="0" />
          <input type="hidden" name="quotedText" value={pending.quoted} />
          <input type="hidden" name="prefix" value={pending.prefix} />
          <input type="hidden" name="suffix" value={pending.suffix} />
          <input type="hidden" name="section" value={pending.section} />
          <p className="text-xs text-amber-900 mb-1">
            Commenting on{pending.section ? ` “${pending.section}”` : ""}:
          </p>
          <blockquote className="mb-2 border-l-2 border-amber-400 pl-3 text-sm italic text-stone-700">
            {pending.quoted.length > 300 ? pending.quoted.slice(0, 300) + "…" : pending.quoted}
          </blockquote>
          <textarea
            name="body"
            required
            rows={2}
            autoFocus
            placeholder="What did you notice?"
            className="w-full rounded-lg border border-stone-300 px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-stone-400"
          />
          <div className="mt-2 flex gap-2">
            <button className="rounded-lg bg-stone-800 text-white px-4 py-1.5 text-sm hover:bg-stone-700">
              Comment
            </button>
            <button
              type="button"
              onClick={() => setPending(null)}
              className="rounded-lg border border-stone-300 bg-white px-3 py-1.5 text-sm hover:border-stone-500"
            >
              Cancel
            </button>
          </div>
        </form>
      )}
    </>
  );
}
