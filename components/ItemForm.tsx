"use client";

import { useEffect, useState } from "react";
import { CATEGORIES, KINDS, MAX_HTML_BYTES, MAX_IMAGE_BYTES, formatBytes } from "@/lib/constants";
import { looksLikeArtifactShell } from "@/lib/sanitize-html";
import { NotePreview } from "@/components/NotePreview";

const input =
  "w-full rounded-lg border border-stone-300 px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-stone-400";

type ItemDefaults = {
  title?: string;
  body?: string;
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
  const [kind, setKind] = useState(defaults.kind ?? "note");
  const [html, setHtml] = useState(defaults.htmlContent ?? "");
  const [body, setBody] = useState(defaults.body ?? "");
  const [image, setImage] = useState(defaults.url ?? "");
  const [imageNote, setImageNote] = useState<string | null>(null);
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
  const isNote = kind === "note";
  const isImage = kind === "image";
  const htmlBytes = new Blob([html]).size;
  // Catch the wrong-document paste while it is still on screen. The outer page
  // carries data-frame-uuid; the artifact inside the iframe does not.
  const pastedTheShell = isHtml && html.length > 0 && looksLikeArtifactShell(html);
  const tooLarge = isHtml && htmlBytes > MAX_HTML_BYTES;

  /**
   * Read an image into a data: URI.
   *
   * Held in the database rather than a storage service, so an image works with
   * no bucket to create and no keys to manage — at the cost of a size ceiling,
   * which is why an oversized file is refused here by name instead of failing
   * somewhere less legible.
   */
  async function loadImage(file: File) {
    if (!file.type.startsWith("image/")) {
      setImageNote(`${file.name} is not an image.`);
      return;
    }
    if (file.size > MAX_IMAGE_BYTES) {
      setImageNote(`${file.name} is ${formatBytes(file.size)} — over the ${formatBytes(MAX_IMAGE_BYTES)} limit. Try exporting it smaller.`);
      return;
    }
    const dataUri: string = await new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result));
      reader.onerror = () => reject(reader.error);
      reader.readAsDataURL(file);
    });
    setImage(dataUri);
    setImageNote(`${file.name} (${formatBytes(file.size)})`);
  }

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

      {isNote && (
        <div className="text-sm">
          <div className="flex flex-wrap items-baseline justify-between gap-2 mb-1">
            <span className="text-xs text-stone-500">
              Note — type on the left, see it on the right. Markdown works: <code>##</code>{" "}
              headings, <code>**bold**</code>, <code>-</code> lists, <code>&gt;</code> quotes,{" "}
              <code>`code`</code>, links.
            </span>
          </div>
          <div className="grid gap-3 lg:grid-cols-2">
            <textarea
              name="body"
              value={body}
              onChange={(e) => setBody(e.target.value)}
              rows={16}
              placeholder="What happened, what you decided, what to do next…"
              className="w-full rounded-lg border border-stone-300 px-3 py-2 text-sm leading-relaxed focus:outline-none focus:ring-2 focus:ring-stone-400"
            />
            <div className="rounded-lg border border-stone-300 bg-white p-4 overflow-auto max-h-[26rem]">
              {body.trim() ? (
                <NotePreview markdown={body} />
              ) : (
                <p className="text-xs text-stone-400">Preview appears as you type.</p>
              )}
            </div>
          </div>
        </div>
      )}

      {isImage && (
        <div className="text-sm">
          <span className="block text-xs text-stone-500 mb-1">
            Image — choose a file (up to {formatBytes(MAX_IMAGE_BYTES)}), or paste a URL in the
            URL field below.
          </span>
          <input
            type="file"
            accept="image/*"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) void loadImage(file);
            }}
            className="block w-full text-xs text-stone-600 file:mr-3 file:rounded-lg file:border file:border-stone-300 file:bg-white file:px-3 file:py-1.5 file:text-sm file:hover:border-stone-500"
          />
          {imageNote && <p className="mt-1 text-xs text-stone-600">{imageNote}</p>}
          {image && (
            <div className="mt-2 rounded-lg border border-stone-200 bg-white p-3">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={image} alt="" className="max-h-64 w-auto rounded" />
            </div>
          )}
          <input type="hidden" name="imageData" value={image.startsWith("data:") ? image : ""} />
        </div>
      )}

      {!isNote && <input type="hidden" name="body" value={body} readOnly />}

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

          {pastedTheShell && (
            <p className="mt-2 rounded-lg border border-amber-300 bg-amber-50 px-3 py-2 text-xs text-amber-900">
              <strong>This is the page around the artifact, not the artifact.</strong> It holds
              no content — only a script that fetches the real page from Anthropic. In the
              inspector you copied the outer <code>&lt;html&gt;</code>; you need the{" "}
              <code>&lt;html&gt;</code> <em>inside</em> the artifact&apos;s{" "}
              <code>&lt;iframe&gt;</code> — expand the iframe node first, then copy that one.
              The preview on the right stays blank until you have the right document. Quicker
              still: ask Claude for &ldquo;the HTML for my <em>[artifact]</em> artifact as a
              file&rdquo; and use the file picker.
            </p>
          )}
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
            <p className="mt-2">
              The artifact viewer has no download button — only Share. Its page can&apos;t be
              fetched from a server either, because the content loads in the browser from your
              Claude session. Three routes that do work, easiest first:
            </p>
            <ol className="mt-2 ml-4 list-decimal space-y-2">
              <li>
                <strong>Ask in a Claude Code session</strong> — the web one at
                claude.ai/code is fine, nothing to install. &ldquo;Give me the HTML for my{" "}
                <em>[artifact name]</em> artifact as a file.&rdquo; Claude can read the
                artifacts you own. Load the file it gives you with the picker above.
              </li>
              <li>
                <strong>
                  <code>/artifacts</code>, in the Claude Code CLI or desktop app
                </strong>{" "}
                — that command isn&apos;t available in Claude Code on the web. Where it runs:
                type it, arrow to the artifact, press <strong>Enter</strong> to attach it, then
                ask Claude to save its HTML to a file.
              </li>
              <li>
                <strong>The original file.</strong> Claude Code writes the page to an{" "}
                <code>.html</code> file in your project before publishing it, so the clean
                source may already be on disk where you created it.
              </li>
            </ol>
            <p className="mt-2">
              Copying from the browser also works but is fiddly: you need the{" "}
              <code>&lt;html&gt;</code> <em>inside</em> the artifact&apos;s{" "}
              <code>&lt;iframe&gt;</code>, not the page around it. Chrome and Firefox:
              right-click inside the artifact → <em>View Frame Source</em>. Safari: enable web
              developer features in Settings → Advanced, then <em>Inspect Element</em>, expand
              the iframe node, and copy the outer HTML of the document inside it.
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
