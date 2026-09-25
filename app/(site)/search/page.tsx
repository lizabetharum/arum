import { requireUser } from "@/lib/auth";
import { searchItems } from "@/lib/access";
import { ItemCard } from "@/components/ItemCard";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export const metadata = { title: "Search" };

export default async function SearchPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const user = await requireUser();
  const { q = "" } = await searchParams;
  const results = q.trim() ? await searchItems(user, q) : [];

  return (
    <div>
      <h1 className="text-xl font-semibold mb-3">Search</h1>
      <form action="/search" method="GET" className="mb-2 flex max-w-xl gap-2">
        <Input
          name="q"
          type="search"
          defaultValue={q}
          aria-label="Search"
          placeholder="Search titles, descriptions, topics…"
          className="h-9"
        />
        <Button type="submit" className="h-9">
          Search
        </Button>
      </form>
      <p className="text-sm text-stone-500 mb-6">
        {q.trim()
          ? `${results.length} result${results.length === 1 ? "" : "s"} for “${q.trim()}”`
          : "Or press ⌘K from any page to jump straight to a project or item."}
      </p>
      {q.trim() && results.length === 0 ? (
        <div className="rounded-xl border border-dashed border-stone-300 px-6 py-12 text-center">
          <p className="font-medium">No matches</p>
          <p className="mt-1 text-sm text-muted-foreground">
            Search looks at titles, descriptions, note text and topics. Try a shorter word.
          </p>
        </div>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2">
          {results.map((item) => (
            <ItemCard key={item.id} item={item} showProject />
          ))}
        </div>
      )}
    </div>
  );
}
