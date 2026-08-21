"use client";

import { useState } from "react";
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

/**
 * The shared create/edit item fields, plus the submit button.
 *
 * The button lives here because it has to be disabled when the pasted HTML is
 * too large: a Server Action rejects an oversized body before any of our code
 * runs, so the only place to catch it is before the form is ever submitted.
 */
export function ItemFormFields({
  defaults = {},
  submitLabel,
}: {
  defaults?: ItemDefaults;
  submitLabel: string;
}) {
  const [kind, setKind] = useState(defaults.kind ?? "google_doc");
  const [htmlBytes, setHtmlBytes] = useState(
    () => new Blob([defaults.htmlContent ?? ""]).size,
  );

  const isHtml = kind === "html";
  const tooLarge = isHtml && htmlBytes > MAX_HTML_BYTES;

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
          <select
            name="kind"
            value={kind}
            onChange={(e) => setKind(e.target.value)}
            className={input}
          >
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
          <input
            name="tags"
            defaultValue={defaults.tags}
            placeholder="onboarding, retros, ai"
            className={input}
          />
        </label>
      </div>

      {isHtml ? (
        <label className="block text-sm">
          <span className="block text-xs text-stone-500 mb-1">
            HTML — paste the whole page here
          </span>
          <textarea
            name="htmlContent"
            rows={8}
            defaultValue={defaults.htmlContent}
            onChange={(e) => setHtmlBytes(new Blob([e.target.value]).size)}
            className={`${input} font-mono text-xs`}
          />
          <span
            className={`mt-1 block text-xs ${tooLarge ? "text-red-600" : "text-stone-500"}`}
          >
            {formatBytes(htmlBytes)} of {formatBytes(MAX_HTML_BYTES)}
            {tooLarge && (
              <>
                {" "}— too large to save. Pages saved straight from a browser carry a lot
                of extra markup; try &ldquo;Save as → Web Page, HTML only&rdquo;, or
                delete the <code>&lt;script&gt;</code> and inlined
                <code> &lt;style&gt;</code> blocks. You can also store it as a link
                instead.
              </>
            )}
          </span>
        </label>
      ) : (
        // Kept mounted so switching kinds mid-edit doesn't silently drop stored HTML.
        <input type="hidden" name="htmlContent" defaultValue={defaults.htmlContent} />
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
