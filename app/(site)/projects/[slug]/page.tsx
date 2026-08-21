import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { getProjectItems, projectAccessWhere } from "@/lib/access";
import { CATEGORIES } from "@/lib/constants";
import { ItemCard } from "@/components/ItemCard";

export default async function ProjectPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ category?: string; tag?: string }>;
}) {
  const user = await requireUser();
  const { slug } = await params;
  const { category, tag } = await searchParams;

  const project = await prisma.project.findFirst({
    where: { AND: [{ slug }, projectAccessWhere(user)] },
  });
  if (!project) notFound();

  const [items, allItems] = await Promise.all([
    getProjectItems(user, project.id, { category, tag }),
    getProjectItems(user, project.id, {}),
  ]);

  // Only offer filters that would match something this viewer can see.
  const usedCategories = CATEGORIES.filter((c) => allItems.some((i) => i.category === c.value));
  const usedTags = Array.from(
    new Map(allItems.flatMap((i) => i.tags.map(({ tag }) => [tag.id, tag.name] as const))).values(),
  ).sort();

  const filterHref = (next: { category?: string; tag?: string }) => {
    const params = new URLSearchParams();
    const c = "category" in next ? next.category : category;
    const t = "tag" in next ? next.tag : tag;
    if (c) params.set("category", c);
    if (t) params.set("tag", t);
    const qs = params.toString();
    return `/projects/${slug}${qs ? `?${qs}` : ""}`;
  };

  return (
    <div>
      <h1 className="text-2xl font-semibold">{project.name}</h1>
      {project.description && <p className="text-stone-500 mt-1">{project.description}</p>}

      {(usedCategories.length > 1 || usedTags.length > 0) && (
        <div className="mt-5 space-y-2">
          {usedCategories.length > 1 && (
            <div className="flex flex-wrap gap-1.5 text-sm">
              <Link
                href={filterHref({ category: undefined })}
                className={`rounded-full px-3 py-1 border ${!category ? "bg-stone-800 text-white border-stone-800" : "bg-white border-stone-300 hover:border-stone-500"}`}
              >
                All
              </Link>
              {usedCategories.map((c) => (
                <Link
                  key={c.value}
                  href={filterHref({ category: c.value })}
                  className={`rounded-full px-3 py-1 border ${category === c.value ? "bg-stone-800 text-white border-stone-800" : "bg-white border-stone-300 hover:border-stone-500"}`}
                >
                  {c.label}
                </Link>
              ))}
            </div>
          )}
          {usedTags.length > 0 && (
            <div className="flex flex-wrap gap-1.5 text-xs">
              {usedTags.map((name) => (
                <Link
                  key={name}
                  href={filterHref({ tag: tag === name ? undefined : name })}
                  className={`rounded-full px-2.5 py-0.5 border ${tag === name ? "bg-amber-100 border-amber-400 text-amber-900" : "bg-white border-stone-200 text-stone-500 hover:border-stone-400"}`}
                >
                  {name}
                </Link>
              ))}
            </div>
          )}
        </div>
      )}

      <div className="grid gap-3 sm:grid-cols-2 mt-6">
        {items.map((item) => (
          <ItemCard key={item.id} item={item} />
        ))}
      </div>
      {items.length === 0 && <p className="text-sm text-stone-500 mt-6">Nothing here (yet).</p>}
    </div>
  );
}
