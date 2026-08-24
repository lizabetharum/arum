import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";
import { addMember, deleteProject, moveItem, removeMember, updateProject } from "@/lib/admin-actions";
import { getProjectItemsForAdmin, groupIntoSections, sectionsAvailable, type AdminItem } from "@/lib/access";
import { categoryLabel, kindIcon } from "@/lib/constants";

const input =
  "rounded-lg border border-stone-300 px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-stone-400";
const button = "rounded-lg bg-stone-800 text-white px-3 py-1.5 text-sm hover:bg-stone-700";

export default async function AdminProjectPage({ params }: { params: Promise<{ slug: string }> }) {
  await requireAdmin();
  const { slug } = await params;
  const project = await prisma.project.findUnique({
    where: { slug },
    include: {
      members: { include: { user: { select: { id: true, name: true, email: true, role: true } } }, orderBy: { user: { name: "asc" } } },
    },
  });
  if (!project) notFound();
  const [items, canOrder] = await Promise.all([
    getProjectItemsForAdmin(project.id),
    sectionsAvailable(),
  ]);

  const memberIds = new Set(project.members.map((m) => m.userId));
  const nonMembers = await prisma.user.findMany({
    where: { id: { notIn: [...memberIds] } },
    orderBy: { name: "asc" },
    select: { id: true, name: true, email: true },
  });

  return (
    <div className="space-y-8">
      <section className="bg-white rounded-xl border border-stone-200 p-5">
        <div className="flex items-center justify-between gap-3 mb-3">
          <h1 className="text-xl font-semibold">{project.name}</h1>
          <Link href={`/projects/${project.slug}`} className="text-sm text-stone-500 hover:text-stone-800">
            View as member →
          </Link>
        </div>
        <form action={updateProject} className="flex flex-wrap gap-2 items-end">
          <input type="hidden" name="projectId" value={project.id} />
          <label className="text-sm">
            <span className="block text-xs text-stone-500 mb-1">Name</span>
            <input name="name" required defaultValue={project.name} className={input} />
          </label>
          <label className="text-sm flex-1 min-w-48">
            <span className="block text-xs text-stone-500 mb-1">Description</span>
            <input name="description" defaultValue={project.description} className={`${input} w-full`} />
          </label>
          <button className={button}>Save</button>
        </form>
      </section>

      <section>
        <h2 className="font-medium mb-3">Members</h2>
        <div className="space-y-2">
          {project.members.map((m) => (
            <div key={m.id} className="flex items-center gap-3 bg-white rounded-xl border border-stone-200 px-4 py-2.5 text-sm">
              <span className="font-medium">{m.user.name}</span>
              <span className="text-stone-500">{m.user.email}</span>
              <form action={removeMember} className="ml-auto">
                <input type="hidden" name="membershipId" value={m.id} />
                <button className="text-red-600 hover:text-red-800">Remove</button>
              </form>
            </div>
          ))}
          {project.members.length === 0 && (
            <p className="text-sm text-stone-500">No members yet — only admins can see this project.</p>
          )}
        </div>
        {nonMembers.length > 0 && (
          <form action={addMember} className="flex gap-2 mt-3">
            <input type="hidden" name="projectId" value={project.id} />
            <select name="userId" className={input}>
              {nonMembers.map((u) => (
                <option key={u.id} value={u.id}>
                  {u.name} ({u.email})
                </option>
              ))}
            </select>
            <button className={button}>Add member</button>
          </form>
        )}
      </section>

      <section>
        <div className="flex items-center justify-between mb-3">
          <h2 className="font-medium">Items</h2>
          <Link href={`/admin/projects/${project.slug}/items/new`} className={button}>
            + New item
          </Link>
        </div>
        {/*
          Arranged here rather than on the reading page: this is the screen for
          working on a project, and the arrows change what everyone else sees.
        */}
        <div className="space-y-6">
          {groupIntoSections(items as never).map((section) => (
            <div key={section.name || "__loose"}>
              {section.name ? (
                <div className="mb-2 flex items-baseline gap-3">
                  <h3 className="text-xs font-semibold uppercase tracking-wide text-stone-500">
                    {section.name}
                  </h3>
                  <span className="h-px flex-1 bg-stone-200" />
                </div>
              ) : (
                items.some((i) => i.section) && (
                  <div className="mb-2 flex items-baseline gap-3">
                    <h3 className="text-xs uppercase tracking-wide text-stone-400">No section</h3>
                    <span className="h-px flex-1 bg-stone-100" />
                  </div>
                )
              )}
              <div className="space-y-2">
                {(section.items as unknown as AdminItem[]).map((item, i) => (
                  <div
                    key={item.id}
                    className="flex items-center gap-3 rounded-xl border border-stone-200 bg-white px-4 py-2.5 text-sm"
                  >
                    <span>{kindIcon(item.kind)}</span>
                    <Link href={`/admin/items/${item.id}`} className="font-medium hover:underline">
                      {item.title}
                    </Link>
                    {item.category !== "other" && (
                      <span className="text-xs text-stone-400">{categoryLabel(item.category)}</span>
                    )}
                    {item.restricted && (
                      <span className="text-xs text-stone-400">🔒 {item.grants.length} granted</span>
                    )}
                    <div className="ml-auto flex items-center gap-1">
                      {canOrder && (
                      <form action={moveItem}>
                        <input type="hidden" name="itemId" value={item.id} />
                        <input type="hidden" name="direction" value="up" />
                        <button
                          aria-label={`Move ${item.title} up`}
                          disabled={i === 0}
                          className="rounded px-1.5 text-stone-400 hover:bg-stone-100 hover:text-stone-700 disabled:invisible"
                        >
                          ↑
                        </button>
                      </form>
                      )}
                      {canOrder && (
                      <form action={moveItem}>
                        <input type="hidden" name="itemId" value={item.id} />
                        <input type="hidden" name="direction" value="down" />
                        <button
                          aria-label={`Move ${item.title} down`}
                          disabled={i === section.items.length - 1}
                          className="rounded px-1.5 text-stone-400 hover:bg-stone-100 hover:text-stone-700 disabled:invisible"
                        >
                          ↓
                        </button>
                      </form>
                      )}
                      <Link
                        href={`/admin/items/${item.id}`}
                        className="ml-2 text-stone-400 hover:text-stone-700"
                      >
                        Edit →
                      </Link>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
          {items.length === 0 && <p className="text-sm text-stone-500">No items yet.</p>}
        </div>
      </section>

      <section className="border-t border-stone-200 pt-4">
        <form action={deleteProject}>
          <input type="hidden" name="projectId" value={project.id} />
          <button className="text-sm text-red-600 hover:text-red-800">
            Delete this project and all its items
          </button>
        </form>
      </section>
    </div>
  );
}
