import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";
import { createItem } from "@/lib/admin-actions";
import { getProjectSections, sectionsAvailable } from "@/lib/access";
import { ItemFormFields } from "@/components/ItemForm";
import { TriangleAlertIcon } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";

export default async function NewItemPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ error?: string }>;
}) {
  await requireAdmin();
  const { slug } = await params;
  const { error } = await searchParams;
  const project = await prisma.project.findUnique({
    where: { slug },
    include: { members: { include: { user: { select: { id: true, name: true, email: true, role: true } } }, orderBy: { user: { name: "asc" } } } },
  });
  if (!project) notFound();
  const members = project.members.map((m) => ({
    id: m.user.id,
    name: m.user.name,
    email: m.user.email,
  }));
  const [sections, hasSections] = await Promise.all([
    getProjectSections(project.id),
    sectionsAvailable(),
  ]);

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
      {error && (
        <Alert className="mb-4 border-amber-300 bg-amber-50 text-amber-900">
          <TriangleAlertIcon aria-hidden />
          <AlertDescription className="text-amber-900">{error}</AlertDescription>
        </Alert>
      )}
      <form action={createItem} className="rounded-xl border border-border bg-card p-5 space-y-4">
        <input type="hidden" name="projectId" value={project.id} />
        <ItemFormFields
          submitLabel="Create item"
          members={members}
          sections={sections}
          sectionsEnabled={hasSections}
        />

      </form>
    </div>
  );
}
