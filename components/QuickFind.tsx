"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { SearchIcon } from "lucide-react";
import {
  Command,
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { quickSearch, type QuickHit } from "@/lib/search-actions";
import { kindIcon } from "@/lib/constants";

type Project = { slug: string; name: string };

/**
 * ⌘K (Ctrl+K elsewhere) to jump straight to a project or an item. Projects
 * are few and already loaded, so they filter in the browser; items are
 * searched on the server as you type, a beat after you stop.
 */
export function QuickFind({ projects }: { projects: Project[] }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");
  const [hits, setHits] = useState<QuickHit[]>([]);
  const [searching, startSearch] = useTransition();
  const latest = useRef("");

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key.toLowerCase() === "k" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setOpen((o) => !o);
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  useEffect(() => {
    const query = q.trim();
    latest.current = query;
    if (query.length < 2) {
      setHits([]);
      return;
    }
    const t = setTimeout(() => {
      startSearch(async () => {
        const found = await quickSearch(query);
        // A slow reply for an older query must not replace a newer one.
        if (latest.current === query) setHits(found);
      });
    }, 200);
    return () => clearTimeout(t);
  }, [q]);

  function go(href: string) {
    setOpen(false);
    setQ("");
    router.push(href);
  }

  const needle = q.trim().toLowerCase();
  const matchingProjects = needle
    ? projects.filter((p) => p.name.toLowerCase().includes(needle)).slice(0, 5)
    : projects.slice(0, 5);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="flex h-8 w-full max-w-md items-center gap-2 rounded-lg border border-input bg-card px-2.5 text-sm text-muted-foreground transition-colors hover:border-ring"
      >
        <SearchIcon className="size-4" aria-hidden />
        <span className="flex-1 text-left">Search titles, descriptions, topics…</span>
        <kbd className="hidden rounded border border-border bg-muted px-1.5 font-sans text-[11px] sm:inline">
          ⌘K
        </kbd>
      </button>

      <CommandDialog open={open} onOpenChange={setOpen} title="Search" description="Find a project or an item">
        <Command shouldFilter={false}>
          <CommandInput value={q} onValueChange={setQ} placeholder="Search projects and items…" />
          <CommandList>
            <CommandEmpty>
              {needle.length < 2 ? "Type to search." : searching ? "Searching…" : "Nothing matches."}
            </CommandEmpty>
            {matchingProjects.length > 0 && (
              <CommandGroup heading="Projects">
                {matchingProjects.map((p) => (
                  <CommandItem key={p.slug} value={`project-${p.slug}`} onSelect={() => go(`/projects/${p.slug}`)}>
                    <span aria-hidden>📁</span>
                    {p.name}
                  </CommandItem>
                ))}
              </CommandGroup>
            )}
            {hits.length > 0 && (
              <CommandGroup heading="Items">
                {hits.map((h) => (
                  <CommandItem key={h.id} value={`item-${h.id}`} onSelect={() => go(`/items/${h.id}`)}>
                    <span aria-hidden>{kindIcon(h.kind)}</span>
                    <span className="truncate">{h.title}</span>
                    <span className="ml-auto shrink-0 text-xs text-muted-foreground">{h.project}</span>
                  </CommandItem>
                ))}
              </CommandGroup>
            )}
            {needle.length >= 2 && (
              <CommandGroup>
                <CommandItem
                  value="all-results"
                  onSelect={() => go(`/search?q=${encodeURIComponent(q.trim())}`)}
                >
                  <SearchIcon aria-hidden />
                  See all results for “{q.trim()}”
                </CommandItem>
              </CommandGroup>
            )}
          </CommandList>
        </Command>
      </CommandDialog>
    </>
  );
}
