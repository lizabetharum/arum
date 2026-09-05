import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";
import { createProject } from "@/lib/admin-actions";
import { AdminProjectList, type AdminProjectRow } from "@/components/AdminProjectList";

const input =
  "rounded-lg border border-stone-300 px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-stone-400";

const DAY = 86_400_000;

/** Server-rendered so the label never drifts between server and client. */
function activityLabel(date: Date, now: number) {
  const age = now - date.getTime();
  if (age < DAY) return "today";
  if (age < 2 * DAY) return "yesterday";
  if (age < 7 * DAY) return `${Math.floor(age / DAY)} days ago`;
  if (age < 28 * DAY) return `${Math.floor(age / (7 * DAY))} weeks ago`;
  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    ...(date.getFullYear() === new Date(now).getFullYear() ? {} : { year: "numeric" }),
  });
}

export default async function AdminProjectsPage() {
  await requireAdmin();
  const projects = await prisma.project.findMany({
    orderBy: { name: "asc" },
    include: {
      _count: { select: { items: true, members: true } },
      items: { orderBy: { updatedAt: "desc" }, take: 1, select: { updatedAt: true } },
    },
  });

  const now = Date.now();
  const rows: AdminProjectRow[] = projects.map((p) => {
    const empty = p.items.length === 0;
    const activity = p.items[0]?.updatedAt ?? p.createdAt;
    return {
      id: p.id,
      slug: p.slug,
      name: p.name,
      description: p.description,
      items: p._count.items,
      members: p._count.members,
      activityMs: activity.getTime(),
      activityLabel: empty ? `added ${activityLabel(activity, now)}` : activityLabel(activity, now),
      empty,
    };
  });

  return (
    <div>
      <div className="flex items-start justify-between gap-4 mb-5">
        <div>
          <h1 className="text-xl font-semibold">Projects</h1>
          <p className="text-sm text-stone-500 mt-0.5">
            Every project in the library. Sorted by most recent item activity.
          </p>
        </div>

        <details className="relative shrink-0 group">
          <summary className="list-none cursor-pointer select-none rounded-lg bg-stone-800 px-3 py-1.5 text-sm text-white hover:bg-stone-700 [&::-webkit-details-marker]:hidden">
            <span className="group-open:hidden">+ New project</span>
            <span className="hidden group-open:inline">Close</span>
          </summary>
          <div className="absolute right-0 top-full z-10 mt-2 w-[min(26rem,calc(100vw-2rem))] rounded-xl border border-stone-200 bg-white p-4 shadow-lg">
            <h2 className="font-medium mb-3 text-sm">New project</h2>
            <form action={createProject} className="space-y-3">
              <label className="block text-sm">
                <span className="block text-xs text-stone-500 mb-1">Name</span>
                <input name="name" required autoComplete="off" className={`${input} w-full`} />
              </label>
              <label className="block text-sm">
                <span className="block text-xs text-stone-500 mb-1">Description (optional)</span>
                <input name="description" autoComplete="off" className={`${input} w-full`} />
              </label>
              <button className="w-full rounded-lg bg-stone-800 text-white px-3 py-1.5 text-sm hover:bg-stone-700">
                Create project
              </button>
            </form>
          </div>
        </details>
      </div>

      <AdminProjectList projects={rows} />
    </div>
  );
}
