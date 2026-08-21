import Link from "next/link";
import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { itemAccessWhere, projectAccessWhere } from "@/lib/access";
import { ItemCard } from "@/components/ItemCard";

export default async function HomePage() {
  const user = await requireUser();
  const [projects, recent] = await Promise.all([
    prisma.project.findMany({
      where: projectAccessWhere(user),
      orderBy: { name: "asc" },
      include: { _count: { select: { items: true } } },
    }),
    prisma.item.findMany({
      where: itemAccessWhere(user),
      include: { project: { select: { slug: true, name: true } }, tags: { include: { tag: true } } },
      orderBy: { updatedAt: "desc" },
      take: 6,
    }),
  ]);

  return (
    <div className="space-y-10">
      <section>
        <h1 className="text-xl font-semibold mb-4">Projects</h1>
        {projects.length === 0 ? (
          <p className="text-stone-500 text-sm">
            You haven&apos;t been added to any projects yet.
          </p>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {projects.map((p) => (
              <Link
                key={p.id}
                href={`/projects/${p.slug}`}
                className="block bg-white rounded-xl border border-stone-200 p-5 hover:border-stone-400 hover:shadow-sm transition"
              >
                <h2 className="font-medium">{p.name}</h2>
                {p.description && (
                  <p className="text-sm text-stone-500 mt-1 line-clamp-2">{p.description}</p>
                )}
                <p className="text-xs text-stone-400 mt-3">
                  {p._count.items} item{p._count.items === 1 ? "" : "s"}
                </p>
              </Link>
            ))}
          </div>
        )}
      </section>

      {recent.length > 0 && (
        <section>
          <h2 className="text-xl font-semibold mb-4">Recently updated</h2>
          <div className="grid gap-3 sm:grid-cols-2">
            {recent.map((item) => (
              <ItemCard key={item.id} item={item} showProject />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
