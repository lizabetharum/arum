import Link from "next/link";
import { notFound } from "next/navigation";
import { requireAdmin } from "@/lib/auth";
import { deleteItem, updateItem } from "@/lib/admin-actions";
import { getItemForEdit, getProjectSections, sectionsAvailable } from "@/lib/access";
import { ItemFormFields } from "@/components/ItemForm";

export default async function AdminItemPage({ params }: { params: Promise<{ id: string }> }) {
  await requireAdmin();
  const { id } = await params;
  const item = await getItemForEdit(id);
  if (!item) notFound();
  const [sections, hasSections] = await Promise.all([
    getProjectSections(item.project.id),
    sectionsAvailable(),
  ]);

  return (
    <div className="max-w-6xl space-y-8">
      <div>
        <nav className="text-sm text-stone-500 mb-3">
          <Link href={`/admin/projects/${item.project.slug}`} className="hover:text-stone-800">
            {item.project.name}
          </Link>
          <span className="mx-1.5">/</span>
          <span>{item.title}</span>
          <Link href={`/items/${item.id}`} className="ml-3 text-stone-500 hover:text-stone-800">
            View →
          </Link>
        </nav>
        <h1 className="text-xl font-semibold mb-5">Edit item</h1>
        <form action={updateItem} className="bg-white rounded-xl border border-stone-200 p-5 space-y-4">
          <input type="hidden" name="itemId" value={item.id} />
          <ItemFormFields
            defaults={{
              title: item.title,
              description: item.description,
              kind: item.kind,
              category: item.category,
              url: item.url,
              htmlContent: item.htmlContent,
              body: item.body,
              restricted: item.restricted,
              section: item.section,
              tags: item.tags.map(({ tag }) => tag.name).join(", "),
            }}
            submitLabel="Save"
            members={item.project.members.map((m) => ({
              id: m.user.id,
              name: m.user.name,
              email: m.user.email,
            }))}
            grantedIds={item.grants.map((g) => g.userId)}
            sections={sections}
            sectionsEnabled={hasSections}
          />
        </form>
      </div>

      <section className="border-t border-stone-200 pt-4">
        <form action={deleteItem}>
          <input type="hidden" name="itemId" value={item.id} />
          <button className="text-sm text-red-600 hover:text-red-800">Delete this item</button>
        </form>
      </section>
    </div>
  );
}
