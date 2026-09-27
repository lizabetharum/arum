import Link from "next/link";
import { notFound } from "next/navigation";
import { requireAdmin } from "@/lib/auth";
import { deleteItem, updateItem } from "@/lib/admin-actions";
import { getAttachedFile, getItemForEdit, getProjectSections, sectionsAvailable } from "@/lib/access";
import { ItemFormFields } from "@/components/ItemForm";
import { TriangleAlertIcon } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { ConfirmButton } from "@/components/ConfirmButton";
import { SharePanel } from "@/components/SharePanel";
import { getShareState } from "@/lib/share";

export default async function AdminItemPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ error?: string }>;
}) {
  await requireAdmin();
  const { id } = await params;
  const { error } = await searchParams;
  const item = await getItemForEdit(id);
  if (!item) notFound();
  const [sections, hasSections, attached, shareState] = await Promise.all([
    getProjectSections(item.project.id),
    sectionsAvailable(),
    getAttachedFile(item.id),
    getShareState(item.id),
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
        {error && (
          <Alert className="mb-4 border-amber-300 bg-amber-50 text-amber-900">
            <TriangleAlertIcon aria-hidden />
            <AlertDescription className="text-amber-900">{error}</AlertDescription>
          </Alert>
        )}
        <form action={updateItem} className="rounded-xl border border-border bg-card p-5 space-y-4">
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
              pdf: attached,
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

      {/*
        The same panel as the reading page. Sharing is a thing you decide about
        an item, so it belongs where you go to change an item — not only on the
        page you go to in order to read one.
      */}
      <SharePanel
        itemId={item.id}
        state={shareState}
        restricted={item.restricted}
        returnTo="edit"
        className=""
      />

      <section className="rounded-xl border border-red-200 bg-card p-4">
        <h2 className="text-sm font-semibold">Danger zone</h2>
        <p className="mb-3 mt-0.5 text-sm text-muted-foreground">
          Deleting an item removes it for everyone in {item.project.name}.
        </p>
        <form action={deleteItem}>
          <input type="hidden" name="itemId" value={item.id} />
          <ConfirmButton
            title={`Delete ${item.title}?`}
            description="Its attached file and comments go with it. This can't be undone."
            confirmLabel="Delete item"
          >
            Delete this item
          </ConfirmButton>
        </form>
      </section>
    </div>
  );
}
