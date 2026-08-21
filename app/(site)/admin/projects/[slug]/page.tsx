import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";
import { addMember, deleteProject, removeMember, updateProject } from "@/lib/admin-actions";
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
      members: { include: { user: true }, orderBy: { user: { name: "asc" } } },
      items: { orderBy: { updatedAt: "desc" }, include: { grants: true } },
    },
  });
  if (!project) notFound();

  const memberIds = new Set(project.members.map((m) => m.userId));
  const nonMembers = await prisma.user.findMany({
    where: { id: { notIn: [...memberIds] } },
    orderBy: { name: "asc" },
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
        <div className="space-y-2">
          {project.items.map((item) => (
            <Link
              key={item.id}
              href={`/admin/items/${item.id}`}
              className="flex items-center gap-3 bg-white rounded-xl border border-stone-200 px-4 py-2.5 text-sm hover:border-stone-400"
            >
              <span>{kindIcon(item.kind)}</span>
              <span className="font-medium">{item.title}</span>
              <span className="text-xs text-stone-400">{categoryLabel(item.category)}</span>
              {item.restricted && (
                <span className="text-xs text-stone-400">🔒 {item.grants.length} granted</span>
              )}
              <span className="ml-auto text-stone-400">Edit →</span>
            </Link>
          ))}
          {project.items.length === 0 && <p className="text-sm text-stone-500">No items yet.</p>}
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
