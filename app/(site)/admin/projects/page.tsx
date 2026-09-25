import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";
import { AdminProjectList, type AdminProjectRow } from "@/components/AdminProjectList";
import { NewProjectDialog } from "@/components/NewProjectDialog";

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

        <NewProjectDialog />
      </div>

      <AdminProjectList projects={rows} />
    </div>
  );
}
