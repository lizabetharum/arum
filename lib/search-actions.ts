"use server";

import { requireUser } from "@/lib/auth";
import { searchItems } from "@/lib/access";

export type QuickHit = { id: string; title: string; kind: string; project: string };

/**
 * The ⌘K box's results: the same search as /search, with the same access
 * rules, trimmed to what fits in a dropdown.
 */
export async function quickSearch(query: string): Promise<QuickHit[]> {
  const user = await requireUser();
  const items = await searchItems(user, query.slice(0, 200));
  return items.slice(0, 8).map((i) => ({
    id: i.id,
    title: i.title,
    kind: i.kind,
    project: i.project.name,
  }));
}
