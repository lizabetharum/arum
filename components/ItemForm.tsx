import { CATEGORIES, KINDS } from "@/lib/constants";

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
 * The shared create/edit item fields. Kind switching is handled without JS:
 * both the URL and the HTML fields are always shown, and only the one that
 * matches the chosen kind is used.
 */
export function ItemFormFields({ defaults = {} }: { defaults?: ItemDefaults }) {
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
          <select name="kind" defaultValue={defaults.kind ?? "google_doc"} className={input}>
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
      <label className="block text-sm">
        <span className="block text-xs text-stone-500 mb-1">
          URL — for Google Docs/Sheets/Slides and links (paste the normal /edit link)
        </span>
        <input name="url" type="url" defaultValue={defaults.url} className={input} />
      </label>
      <label className="block text-sm">
        <span className="block text-xs text-stone-500 mb-1">
          HTML — for HTML pages, paste the whole page here (ignored for other kinds)
        </span>
        <textarea
          name="htmlContent"
          rows={8}
          defaultValue={defaults.htmlContent}
          className={`${input} font-mono text-xs`}
        />
      </label>
      <label className="flex items-center gap-2 text-sm">
        <input type="checkbox" name="restricted" defaultChecked={defaults.restricted} />
        <span>
          Restricted — only people granted below (and admins) can see this, even inside the project
        </span>
      </label>
    </div>
  );
}
