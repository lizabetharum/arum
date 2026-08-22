import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";
import { createItem } from "@/lib/admin-actions";
import { ItemFormFields } from "@/components/ItemForm";

export default async function NewItemPage({ params }: { params: Promise<{ slug: string }> }) {
  await requireAdmin();
  const { slug } = await params;
  const project = await prisma.project.findUnique({
    where: { slug },
    include: { members: { include: { user: true }, orderBy: { user: { name: "asc" } } } },
  });
  if (!project) notFound();
  const members = project.members.map((m) => ({
    id: m.user.id,
    name: m.user.name,
    email: m.user.email,
  }));

  return (
    <div className="max-w-6xl">
      <nav className="text-sm text-stone-500 mb-3">
        <Link href={`/admin/projects/${project.slug}`} className="hover:text-stone-800">
          {project.name}
        </Link>
        <span className="mx-1.5">/</span>
        <span>New item</span>
      </nav>
      <h1 className="text-xl font-semibold mb-5">Add an item</h1>
      <form action={createItem} className="bg-white rounded-xl border border-stone-200 p-5 space-y-4">
        <input type="hidden" name="projectId" value={project.id} />
        <ItemFormFields submitLabel="Create item" members={members} />

      </form>
    </div>
  );
}
