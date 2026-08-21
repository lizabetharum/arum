import { requireUser } from "@/lib/auth";
import { searchItems } from "@/lib/access";
import { ItemCard } from "@/components/ItemCard";

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
      <h1 className="text-xl font-semibold mb-1">Search</h1>
      <p className="text-sm text-stone-500 mb-6">
        {q.trim()
          ? `${results.length} result${results.length === 1 ? "" : "s"} for “${q.trim()}”`
          : "Type a search above — titles, descriptions, and topics are matched."}
      </p>
      <div className="grid gap-3 sm:grid-cols-2">
        {results.map((item) => (
          <ItemCard key={item.id} item={item} showProject />
        ))}
      </div>
    </div>
  );
}
