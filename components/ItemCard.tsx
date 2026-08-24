import Link from "next/link";
import { categoryLabel, kindIcon, kindLabel } from "@/lib/constants";
import type { ItemWithMeta } from "@/lib/access";

/**
 * A colour per kind, so a project reads as a shape before it reads as words —
 * you can see at a glance that a section is three notes and a deck. Kept to a
 * tinted spine and icon rather than a coloured card, so a wall of them stays
 * calm instead of turning into confetti.
 */
const TONES: Record<string, { spine: string; chip: string }> = {
  note: { spine: "bg-amber-300", chip: "bg-amber-50 text-amber-900 border-amber-200" },
  image: { spine: "bg-rose-300", chip: "bg-rose-50 text-rose-900 border-rose-200" },
  google_doc: { spine: "bg-blue-300", chip: "bg-blue-50 text-blue-900 border-blue-200" },
  google_sheet: { spine: "bg-emerald-300", chip: "bg-emerald-50 text-emerald-900 border-emerald-200" },
  google_slides: { spine: "bg-orange-300", chip: "bg-orange-50 text-orange-900 border-orange-200" },
  html: { spine: "bg-violet-300", chip: "bg-violet-50 text-violet-900 border-violet-200" },
  link: { spine: "bg-stone-300", chip: "bg-stone-100 text-stone-700 border-stone-200" },
};

const tone = (kind: string) => TONES[kind] ?? TONES.link;

export function ItemCard({ item, showProject = false }: { item: ItemWithMeta; showProject?: boolean }) {
  const t = tone(item.kind);
  // An uploaded image is its own best thumbnail; anything else gets its icon.
  const thumbnail = item.kind === "image" && item.url ? item.url : null;

  return (
    <Link
      href={`/items/${item.id}`}
      className="group relative flex overflow-hidden rounded-xl border border-stone-200 bg-white transition hover:-translate-y-0.5 hover:border-stone-300 hover:shadow-md"
    >
      <span aria-hidden className={`w-1.5 shrink-0 ${t.spine}`} />
      <div className="flex min-w-0 flex-1 gap-3 p-4">
        {thumbnail ? (
          <img
            src={thumbnail}
            alt=""
            className="h-12 w-12 shrink-0 rounded-lg border border-stone-200 object-cover"
          />
        ) : (
          <span className="grid h-12 w-12 shrink-0 place-items-center rounded-lg bg-stone-50 text-xl">
            {kindIcon(item.kind)}
          </span>
        )}
        <div className="min-w-0 flex-1">
          <h3 className="truncate font-medium text-stone-900 group-hover:text-stone-950">
            {item.title}
            {item.restricted && (
              <span title="Restricted to specific people" className="ml-1.5 text-stone-400">
                🔒
              </span>
            )}
          </h3>
          {item.description && (
            <p className="mt-0.5 line-clamp-2 text-sm text-stone-500">{item.description}</p>
          )}
          <div className="mt-2 flex flex-wrap items-center gap-1.5 text-xs">
            <span className={`rounded-full border px-2 py-0.5 ${t.chip}`}>{kindLabel(item.kind)}</span>
            {showProject && (
              <span className="rounded-full bg-stone-100 px-2 py-0.5 text-stone-600">
                {item.project.name}
              </span>
            )}
            {/* "Other" is the default nobody chose, so showing it just adds a
                word to every card. Only a real category earns the space. */}
            {item.category !== "other" && (
              <span className="text-stone-400">{categoryLabel(item.category)}</span>
            )}
            {item.tags.map(({ tag }) => (
              <span key={tag.id} className="rounded-full border border-stone-200 px-2 py-0.5 text-stone-500">
                {tag.name}
              </span>
            ))}
          </div>
        </div>
      </div>
    </Link>
  );
}
