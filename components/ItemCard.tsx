import Link from "next/link";
import { categoryLabel, kindIcon } from "@/lib/constants";
import type { ItemWithMeta } from "@/lib/access";

export function ItemCard({ item, showProject = false }: { item: ItemWithMeta; showProject?: boolean }) {
  return (
    <Link
      href={`/items/${item.id}`}
      className="block bg-white rounded-xl border border-stone-200 p-4 hover:border-stone-400 hover:shadow-sm transition"
    >
      <div className="flex items-start gap-3">
        <span className="text-xl leading-none mt-0.5">{kindIcon(item.kind)}</span>
        <div className="min-w-0">
          <h3 className="font-medium truncate">
            {item.title}
            {item.restricted && (
              <span title="Restricted to specific people" className="ml-1.5 text-stone-400">
                🔒
              </span>
            )}
          </h3>
          {item.description && (
            <p className="text-sm text-stone-500 line-clamp-2 mt-0.5">{item.description}</p>
          )}
          <div className="flex flex-wrap items-center gap-1.5 mt-2 text-xs">
            {showProject && (
              <span className="text-stone-500 bg-stone-100 rounded-full px-2 py-0.5">
                {item.project.name}
              </span>
            )}
            <span className="text-amber-800 bg-amber-50 border border-amber-200 rounded-full px-2 py-0.5">
              {categoryLabel(item.category)}
            </span>
            {item.tags.map(({ tag }) => (
              <span key={tag.id} className="text-stone-500 border border-stone-200 rounded-full px-2 py-0.5">
                {tag.name}
              </span>
            ))}
          </div>
        </div>
      </div>
    </Link>
  );
}
