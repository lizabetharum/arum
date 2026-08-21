import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";
import { deleteItem, setItemGrants, updateItem } from "@/lib/admin-actions";
import { ItemFormFields } from "@/components/ItemForm";

export default async function AdminItemPage({ params }: { params: Promise<{ id: string }> }) {
  await requireAdmin();
  const { id } = await params;
  const item = await prisma.item.findUnique({
    where: { id },
    include: {
      project: { include: { members: { include: { user: true }, orderBy: { user: { name: "asc" } } } } },
      tags: { include: { tag: true } },
      grants: true,
    },
  });
  if (!item) notFound();

  const grantedIds = new Set(item.grants.map((g) => g.userId));

  return (
    <div className="max-w-2xl space-y-8">
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
              restricted: item.restricted,
              tags: item.tags.map(({ tag }) => tag.name).join(", "),
            }}
          />
          <button className="rounded-lg bg-stone-800 text-white px-4 py-2 text-sm hover:bg-stone-700">
            Save
          </button>
        </form>
      </div>

      <section className="bg-white rounded-xl border border-stone-200 p-5">
        <h2 className="font-medium mb-1">Who can see this item</h2>
        {item.restricted ? (
          <>
            <p className="text-xs text-stone-500 mb-3">
              Restricted: of the project&apos;s members, only the people checked here (plus admins) see it.
            </p>
            {item.project.members.length === 0 ? (
              <p className="text-sm text-stone-500">This project has no members to grant.</p>
            ) : (
              <form action={setItemGrants} className="space-y-2">
                <input type="hidden" name="itemId" value={item.id} />
                {item.project.members.map((m) => (
                  <label key={m.userId} className="flex items-center gap-2 text-sm">
                    <input
                      type="checkbox"
                      name="userIds"
                      value={m.userId}
                      defaultChecked={grantedIds.has(m.userId)}
                    />
                    <span>{m.user.name}</span>
                    <span className="text-stone-400">{m.user.email}</span>
                  </label>
                ))}
                <button className="rounded-lg bg-stone-800 text-white px-4 py-2 text-sm hover:bg-stone-700">
                  Save access
                </button>
              </form>
            )}
          </>
        ) : (
          <p className="text-sm text-stone-500">
            Everyone in <strong>{item.project.name}</strong> ({item.project.members.length}{" "}
            member{item.project.members.length === 1 ? "" : "s"}). Tick “Restricted” above to narrow it.
          </p>
        )}
      </section>

      <section className="border-t border-stone-200 pt-4">
        <form action={deleteItem}>
          <input type="hidden" name="itemId" value={item.id} />
          <button className="text-sm text-red-600 hover:text-red-800">Delete this item</button>
        </form>
      </section>
    </div>
  );
}
