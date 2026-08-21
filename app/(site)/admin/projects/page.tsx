import Link from "next/link";
import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";
import { createProject } from "@/lib/admin-actions";

const input =
  "rounded-lg border border-stone-300 px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-stone-400";

export default async function AdminProjectsPage() {
  await requireAdmin();
  const projects = await prisma.project.findMany({
    orderBy: { name: "asc" },
    include: { _count: { select: { items: true, members: true } } },
  });

  return (
    <div className="space-y-8">
      <section>
        <h1 className="text-xl font-semibold mb-4">Projects</h1>
        <div className="space-y-2">
          {projects.map((p) => (
            <Link
              key={p.id}
              href={`/admin/projects/${p.slug}`}
              className="flex items-center gap-3 bg-white rounded-xl border border-stone-200 p-4 hover:border-stone-400"
            >
              <span className="font-medium">{p.name}</span>
              <span className="text-xs text-stone-400 ml-auto">
                {p._count.items} items · {p._count.members} members
              </span>
            </Link>
          ))}
        </div>
      </section>

      <section className="bg-white rounded-xl border border-stone-200 p-5">
        <h2 className="font-medium mb-3">New project</h2>
        <form action={createProject} className="flex flex-wrap gap-2 items-end">
          <label className="text-sm">
            <span className="block text-xs text-stone-500 mb-1">Name</span>
            <input name="name" required className={input} />
          </label>
          <label className="text-sm flex-1 min-w-48">
            <span className="block text-xs text-stone-500 mb-1">Description (optional)</span>
            <input name="description" className={`${input} w-full`} />
          </label>
          <button className="rounded-lg bg-stone-800 text-white px-3 py-1.5 text-sm hover:bg-stone-700">
            Create
          </button>
        </form>
      </section>
    </div>
  );
}
