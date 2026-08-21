"use client";

import { useEffect, useState } from "react";
import { CATEGORIES, KINDS, MAX_HTML_BYTES, formatBytes } from "@/lib/constants";

const input =
  "w-full rounded-lg border border-stone-300 px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-stone-400";

type ItemDefaults = {
  title?: string;
  description?: string;
  kind?: string;
  category?: string;
  url?: string;
  htmlContent?: string;
  restricted?: boolean;
  tags?: string;
};

export function ItemFormFields({
  defaults = {},
  submitLabel,
}: {
  defaults?: ItemDefaults;
  submitLabel: string;
}) {
  const [kind, setKind] = useState(defaults.kind ?? "google_doc");
  const [html, setHtml] = useState(defaults.htmlContent ?? "");
  const [fileNote, setFileNote] = useState<string | null>(null);

  // The preview lags the editor deliberately. Re-rendering a 60 KB document into
  // an iframe on every keystroke makes typing stutter; a beat of quiet is the
  // natural moment to repaint.
  const [preview, setPreview] = useState(html);
  useEffect(() => {
    const t = setTimeout(() => setPreview(html), 400);
    return () => clearTimeout(t);
  }, [html]);

  const isHtml = kind === "html";
  const htmlBytes = new Blob([html]).size;
  const tooLarge = isHtml && htmlBytes > MAX_HTML_BYTES;

  async function loadFile(file: File) {
    if (file.size > MAX_HTML_BYTES) {
      setFileNote(`${file.name} is ${formatBytes(file.size)} — over the ${formatBytes(MAX_HTML_BYTES)} limit.`);
      return;
    }
    setHtml(await file.text());
    setFileNote(`Loaded ${file.name} (${formatBytes(file.size)}).`);
  }

  return (
    <div className="space-y-4">
      <label className="block text-sm">
        <span className="block text-xs text-stone-500 mb-1">Title</span>
        <input name="title" required defaultValue={defaults.title} className={input} />
      </label>
      <label className="block text-sm">
        <span className="block text-xs text-stone-500 mb-1">Description (optional)</span>
        <textarea name="description" rows={2} defaultValue={defaults.description} className={input} />
      </label>
      <div className="flex flex-wrap gap-4">
        <label className="text-sm">
          <span className="block text-xs text-stone-500 mb-1">Kind</span>
          <select name="kind" value={kind} onChange={(e) => setKind(e.target.value)} className={input}>
            {KINDS.map((k) => (
              <option key={k.value} value={k.value}>
                {k.label}
              </option>
            ))}
          </select>
        </label>
        <label className="text-sm">
          <span className="block text-xs text-stone-500 mb-1">Category</span>
          <select name="category" defaultValue={defaults.category ?? "other"} className={input}>
            {CATEGORIES.map((c) => (
              <option key={c.value} value={c.value}>
                {c.label}
              </option>
            ))}
          </select>
        </label>
        <label className="text-sm flex-1 min-w-48">
          <span className="block text-xs text-stone-500 mb-1">Topics (comma-separated)</span>
          <input name="tags" defaultValue={defaults.tags} placeholder="onboarding, retros, ai" className={input} />
        </label>
      </div>

      {isHtml ? (
        <div className="text-sm">
          <div className="flex flex-wrap items-baseline justify-between gap-2 mb-1">
            <span className="text-xs text-stone-500">
              HTML — edit on the left, see it on the right. Saved changes apply immediately.
            </span>
            <span className={`text-xs ${tooLarge ? "text-red-600" : "text-stone-400"}`}>
              {formatBytes(htmlBytes)} of {formatBytes(MAX_HTML_BYTES)}
            </span>
          </div>

          <div className="grid gap-3 lg:grid-cols-2">
            <textarea
              name="htmlContent"
              value={html}
              onChange={(e) => {
                setHtml(e.target.value);
                setFileNote(null);
              }}
              spellCheck={false}
              className="h-[62vh] w-full rounded-lg border border-stone-300 px-3 py-2 font-mono text-xs leading-relaxed focus:outline-none focus:ring-2 focus:ring-stone-400"
            />
            <div className="relative h-[62vh] rounded-lg border border-stone-300 bg-white overflow-hidden">
              <span className="absolute right-2 top-2 z-10 rounded bg-stone-800/75 px-1.5 py-0.5 text-[10px] text-white">
                Preview
              </span>
              {/* Same sandbox the item page uses, so what you see here is what a reader gets. */}
              <iframe
                title="Preview"
                srcDoc={preview}
                sandbox="allow-scripts allow-popups"
                className="h-full w-full border-0"
              />
            </div>
          </div>

          {tooLarge && (
            <p className="mt-1 text-xs text-red-600">
              Too large to save. Pages saved from a browser carry a lot of extra markup — try
              &ldquo;Save as → Web Page, HTML only&rdquo;, or store it as a Link.
            </p>
          )}

          <div className="mt-2 flex flex-wrap items-center gap-3">
            <input
              type="file"
              accept=".html,.htm,text/html"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) void loadFile(file);
              }}
              className="block text-xs text-stone-600 file:mr-3 file:rounded-lg file:border file:border-stone-300 file:bg-white file:px-3 file:py-1.5 file:text-sm file:hover:border-stone-500"
            />
            {fileNote && <span className="text-xs text-stone-600">{fileNote}</span>}
          </div>

          <details className="mt-2 text-xs text-stone-500">
            <summary className="cursor-pointer hover:text-stone-800">
              Getting the HTML out of a Claude Artifact
            </summary>
            <ol className="mt-2 ml-4 list-decimal space-y-1">
              <li>Open the artifact so the page itself is showing.</li>
              <li>
                Right-click <strong>inside the artifact content</strong> (not the surrounding
                Claude chrome) → <strong>View Frame Source</strong>. In Firefox it is{" "}
                <strong>This Frame → View Frame Source</strong>.
              </li>
              <li>Select all (⌘A) and copy (⌘C) in the source tab.</li>
              <li>Paste into the box on the left.</li>
            </ol>
            <p className="mt-2">
              Claude&apos;s frame wrapper is stripped automatically on save, so you don&apos;t
              need to trim anything. If you use <em>Save page as HTML</em> on the outer page
              instead, you get a loader with no content in it — that one can&apos;t be used.
            </p>
          </details>
        </div>
      ) : (
        // Kept mounted so switching kinds mid-edit doesn't silently drop stored HTML.
        <input type="hidden" name="htmlContent" value={html} readOnly />
      )}

      <label className="block text-sm">
        <span className="block text-xs text-stone-500 mb-1">
          URL — for Google Docs/Sheets/Slides and links (paste the normal /edit link)
        </span>
        <input name="url" type="url" defaultValue={defaults.url} className={input} />
      </label>

      <label className="flex items-center gap-2 text-sm">
        <input type="checkbox" name="restricted" defaultChecked={defaults.restricted} />
        <span>
          Restricted — only people granted below (and admins) can see this, even inside the project
        </span>
      </label>

      <button
        type="submit"
        disabled={tooLarge}
        className="rounded-lg bg-stone-800 text-white px-4 py-2 text-sm hover:bg-stone-700 disabled:opacity-40 disabled:hover:bg-stone-800"
      >
        {submitLabel}
      </button>
    </div>
  );
}
