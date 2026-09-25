import Link from "next/link";
import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { itemAccessWhere, projectAccessWhere } from "@/lib/access";
import { ItemCard } from "@/components/ItemCard";
import { Button } from "@/components/ui/button";

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
          // An admin sees every project, so an empty list means none exist yet —
          // telling her she hasn't been "added to" any would be misleading, and
          // it is the first thing she sees on a freshly set up library.
          user.role === "admin" ? (
            <div className="rounded-xl border border-dashed border-stone-300 px-6 py-12 text-center">
              <p className="font-medium">No projects yet</p>
              <p className="mt-1 text-sm text-muted-foreground">
                A project holds the notes, documents and pages for one piece of work.
              </p>
              <Button asChild size="sm" className="mt-4">
                <Link href="/admin/projects">Create your first project</Link>
              </Button>
            </div>
          ) : (
            <div className="rounded-xl border border-dashed border-stone-300 px-6 py-12 text-center">
              <p className="font-medium">Nothing here yet</p>
              <p className="mt-1 text-sm text-muted-foreground">
                You haven&apos;t been added to any projects yet. Whoever invited you can add you.
              </p>
            </div>
          )
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {projects.map((p) => (
              <Link
                key={p.id}
                href={`/projects/${p.slug}`}
                className="block rounded-xl border border-border bg-card p-5 transition hover:-translate-y-0.5 hover:border-stone-300 hover:shadow-md"
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
