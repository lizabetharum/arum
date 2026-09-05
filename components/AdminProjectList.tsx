"use client";

import { useMemo, useState } from "react";
import Link from "next/link";

export type AdminProjectRow = {
  id: string;
  slug: string;
  name: string;
  description: string;
  items: number;
  members: number;
  /** Newest item update, or the project's creation time when it has no items. */
  activityMs: number;
  activityLabel: string;
  /** True when the project has no items and the label is a creation date. */
  empty: boolean;
};

type Sort = "recent" | "name";

const COL = "flex items-center gap-6 text-xs tabular-nums shrink-0";

export function AdminProjectList({ projects }: { projects: AdminProjectRow[] }) {
  const [q, setQ] = useState("");
  const [sort, setSort] = useState<Sort>("recent");

  const rows = useMemo(() => {
    const needle = q.trim().toLowerCase();
    const matched = needle
      ? projects.filter(
          (p) =>
            p.name.toLowerCase().includes(needle) ||
            p.description.toLowerCase().includes(needle),
        )
      : projects;
    return [...matched].sort((a, b) =>
      sort === "name"
        ? a.name.localeCompare(b.name)
        : b.activityMs - a.activityMs || a.name.localeCompare(b.name),
    );
  }, [projects, q, sort]);

  if (projects.length === 0) {
    return (
      <p className="text-sm text-stone-500">
        No projects yet. Create the first one above.
      </p>
    );
  }

  return (
    <div>
      <div className="flex flex-wrap items-center gap-3 mb-3">
        <div className="relative flex-1 min-w-56">
          <label htmlFor="project-filter" className="sr-only">
            Filter projects
          </label>
          <svg
            aria-hidden
            viewBox="0 0 20 20"
            fill="none"
            className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-stone-400"
          >
            <circle cx="9" cy="9" r="5.25" stroke="currentColor" strokeWidth="1.5" />
            <path d="m13 13 3.5 3.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
          </svg>
          <input
            id="project-filter"
            type="search"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            onKeyDown={(e) => e.key === "Escape" && setQ("")}
            placeholder="Filter projects…"
            className="w-full rounded-lg border border-stone-300 bg-white pl-9 pr-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-stone-400"
          />
        </div>

        <div className="flex rounded-lg bg-stone-200/70 p-0.5 text-xs font-medium">
          {(
            [
              ["recent", "Recent"],
              ["name", "A–Z"],
            ] as const
          ).map(([value, label]) => (
            <button
              key={value}
              type="button"
              aria-pressed={sort === value}
              onClick={() => setSort(value)}
              className={`rounded-md px-2.5 py-1 transition ${
                sort === value
                  ? "bg-white text-stone-900 shadow-sm"
                  : "text-stone-500 hover:text-stone-800"
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        <p aria-live="polite" className="text-xs text-stone-500 tabular-nums">
          {rows.length === projects.length
            ? `${projects.length} project${projects.length === 1 ? "" : "s"}`
            : `${rows.length} of ${projects.length}`}
        </p>
      </div>

      <div className="hidden sm:flex items-center gap-4 px-4 pb-1.5 text-[11px] uppercase tracking-wide text-stone-400">
        <span className="flex-1">Project</span>
        <span className={COL}>
          <span className="w-14 text-right">Items</span>
          <span className="w-16 text-right">People</span>
          <span className="w-24 text-right">Last activity</span>
          <span className="w-4" aria-hidden />
        </span>
      </div>

      {rows.length === 0 ? (
        <div className="rounded-xl border border-stone-200 bg-white px-4 py-8 text-center">
          <p className="text-sm text-stone-500">
            Nothing matches “{q.trim()}”.
          </p>
          <button
            type="button"
            onClick={() => setQ("")}
            className="mt-2 text-sm text-stone-700 underline underline-offset-2 hover:text-stone-900"
          >
            Clear filter
          </button>
        </div>
      ) : (
        <ul className="divide-y divide-stone-200 rounded-xl border border-stone-200 bg-white overflow-hidden">
          {rows.map((p) => (
            <li key={p.id}>
              <Link
                href={`/admin/projects/${p.slug}`}
                className="group flex items-center gap-4 px-4 py-3 hover:bg-stone-50 focus-visible:outline-none focus-visible:bg-stone-50"
              >
                <span className="flex-1 min-w-0">
                  <span className="flex items-baseline gap-2">
                    <span className="font-medium text-stone-900 truncate">{p.name}</span>
                    {p.members === 0 && (
                      <span className="shrink-0 rounded bg-amber-100 px-1.5 py-0.5 text-[11px] font-medium text-amber-700">
                        admins only
                      </span>
                    )}
                  </span>
                  {p.description && (
                    <span className="mt-0.5 block truncate text-sm text-stone-500">
                      {p.description}
                    </span>
                  )}
                </span>
                <span className={`${COL} text-stone-500`}>
                  <span className="w-14 text-right hidden sm:block">{p.items}</span>
                  <span className="w-16 text-right hidden sm:block">{p.members}</span>
                  <span
                    className={`w-24 text-right ${p.empty ? "text-stone-400 italic" : ""}`}
                    title={p.empty ? "No items yet — showing when the project was created" : undefined}
                  >
                    {p.activityLabel}
                  </span>
                  <svg
                    aria-hidden
                    viewBox="0 0 20 20"
                    fill="none"
                    className="w-4 h-4 text-stone-300 group-hover:text-stone-600"
                  >
                    <path d="m7.5 4.5 6 5.5-6 5.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
