import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";
import { addMember, deleteProject, moveItem, removeMember, updateProject } from "@/lib/admin-actions";
import { getProjectItemsForAdmin, groupIntoSections, sectionsAvailable, type AdminItem } from "@/lib/access";
import { categoryLabel, kindIcon } from "@/lib/constants";
import { ArrowDownIcon, ArrowUpIcon, ExternalLinkIcon, PlusIcon } from "lucide-react";
import { ConfirmButton } from "@/components/ConfirmButton";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { NativeSelect, NativeSelectOption } from "@/components/ui/native-select";
import { SubmitButton } from "@/components/SubmitButton";


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
      <div>
        <nav className="mb-2 text-sm text-muted-foreground">
          <Link href="/admin/projects" className="hover:text-foreground">
            ← All projects
          </Link>
        </nav>
        <div className="mb-4 flex items-center justify-between gap-3">
          <h1 className="text-2xl font-semibold tracking-tight">{project.name}</h1>
          <Button asChild variant="outline" size="sm">
            <Link href={`/projects/${project.slug}`}>
              View as member
              <ExternalLinkIcon aria-hidden />
            </Link>
          </Button>
        </div>
        <Card>
          <CardContent>
            <form action={updateProject} className="flex flex-wrap items-end gap-3">
              <input type="hidden" name="projectId" value={project.id} />
              <div className="min-w-48 space-y-1.5">
                <Label htmlFor="project-name">Name</Label>
                <Input id="project-name" name="name" required defaultValue={project.name} />
              </div>
              <div className="min-w-48 flex-1 space-y-1.5">
                <Label htmlFor="project-description">Description</Label>
                <Input id="project-description" name="description" defaultValue={project.description} />
              </div>
              <SubmitButton pendingLabel="Saving…">Save</SubmitButton>
            </form>
          </CardContent>
        </Card>
      </div>

      <section>
        <h2 className="mb-3 font-semibold">
          Members{" "}
          <span className="text-sm font-normal text-muted-foreground">{project.members.length}</span>
        </h2>
        <div className="divide-y divide-border overflow-hidden rounded-xl border border-border bg-card">
          {project.members.map((m) => (
            <div key={m.id} className="flex items-center gap-3 px-4 py-2 text-sm">
              <span className="font-medium">{m.user.name}</span>
              <span className="truncate text-muted-foreground">{m.user.email}</span>
              <form action={removeMember} className="ml-auto">
                <input type="hidden" name="membershipId" value={m.id} />
                <ConfirmButton
                  variant="ghost"
                  size="xs"
                  className="text-destructive"
                  title={`Remove ${m.user.name} from ${project.name}?`}
                  description="They lose access to this project and to any restricted items in it you had shared with them. You can add them back later, but restricted items will need sharing again."
                  confirmLabel="Remove"
                  pendingLabel="Removing…"
                >
                  Remove
                </ConfirmButton>
              </form>
            </div>
          ))}
          {project.members.length === 0 && (
            <p className="px-4 py-6 text-center text-sm text-muted-foreground">
              No members yet. Only admins can see this project.
            </p>
          )}
        </div>
        {nonMembers.length > 0 && (
          <form action={addMember} className="mt-3 flex flex-wrap gap-2">
            <input type="hidden" name="projectId" value={project.id} />
            <NativeSelect name="userId" aria-label="Person to add" className="min-w-64">
              {nonMembers.map((u) => (
                <NativeSelectOption key={u.id} value={u.id}>
                  {u.name} ({u.email})
                </NativeSelectOption>
              ))}
            </NativeSelect>
            <SubmitButton pendingLabel="Adding…">Add member</SubmitButton>
          </form>
        )}
      </section>

      <section>
        <div className="flex items-center justify-between mb-3">
          <h2 className="font-semibold">
            Items <span className="text-sm font-normal text-muted-foreground">{items.length}</span>
          </h2>
          <Button asChild size="sm">
            <Link href={`/admin/projects/${project.slug}/items/new`}>
              <PlusIcon aria-hidden />
              New item
            </Link>
          </Button>
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
              <div className="divide-y divide-border overflow-hidden rounded-xl border border-border bg-card">
                {(section.items as unknown as AdminItem[]).map((item, i) => (
                  <div
                    key={item.id}
                    className="flex items-center gap-3 px-4 py-2 text-sm transition-colors hover:bg-muted/50"
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
                        <Button
                          type="submit"
                          variant="ghost"
                          size="icon-xs"
                          aria-label={`Move ${item.title} up`}
                          disabled={i === 0}
                          className="text-muted-foreground disabled:invisible"
                        >
                          <ArrowUpIcon />
                        </Button>
                      </form>
                      )}
                      {canOrder && (
                      <form action={moveItem}>
                        <input type="hidden" name="itemId" value={item.id} />
                        <input type="hidden" name="direction" value="down" />
                        <Button
                          type="submit"
                          variant="ghost"
                          size="icon-xs"
                          aria-label={`Move ${item.title} down`}
                          disabled={i === section.items.length - 1}
                          className="text-muted-foreground disabled:invisible"
                        >
                          <ArrowDownIcon />
                        </Button>
                      </form>
                      )}
                      <Button asChild variant="ghost" size="xs" className="ml-1 text-muted-foreground">
                        <Link href={`/admin/items/${item.id}`}>Edit</Link>
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
          {items.length === 0 && (
            <div className="rounded-xl border border-dashed border-stone-300 px-4 py-10 text-center">
              <p className="text-sm text-muted-foreground">No items yet.</p>
              <Button asChild size="sm" variant="outline" className="mt-3">
                <Link href={`/admin/projects/${project.slug}/items/new`}>
                  <PlusIcon aria-hidden />
                  Add the first one
                </Link>
              </Button>
            </div>
          )}
        </div>
      </section>

      <section className="rounded-xl border border-red-200 bg-card p-4">
        <h2 className="text-sm font-semibold">Danger zone</h2>
        <p className="mb-3 mt-0.5 text-sm text-muted-foreground">
          Deleting a project removes every item in it for everyone.
        </p>
        <form action={deleteProject}>
          <input type="hidden" name="projectId" value={project.id} />
          <ConfirmButton
            title={`Delete ${project.name}?`}
            description={
              items.length === 0
                ? "The project has no items. This can't be undone."
                : `This also deletes all ${items.length} item${items.length === 1 ? "" : "s"} in it, with their files and comments. This can't be undone.`
            }
            confirmLabel="Delete project"
          >
            Delete this project and all its items
          </ConfirmButton>
        </form>
      </section>
    </div>
  );
}
