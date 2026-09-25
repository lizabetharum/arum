import { Fragment } from "react";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";
import { createUser } from "@/lib/admin-actions";
import { CircleAlertIcon, TriangleAlertIcon } from "lucide-react";
import { CopyLink } from "@/components/CopyLink";
import { SubmitButton } from "@/components/SubmitButton";
import { UserActions } from "@/components/UserActions";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { NativeSelect, NativeSelectOption } from "@/components/ui/native-select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";


/** "in 6 days" / "tomorrow" / "today" -- rounded up, so it never reads as sooner than it is. */
function expiryWords(at: Date | null) {
  if (!at) return "soon";
  const days = Math.ceil((at.getTime() - Date.now()) / (1000 * 60 * 60 * 24));
  if (days <= 0) return "today";
  if (days === 1) return "tomorrow";
  return `in ${days} days`;
}

export default async function UsersPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const admin = await requireAdmin();
  const { error } = await searchParams;
  // Invite columns are only on this page, and only after sql/05 has been run.
  // If it has not, the page still lists everyone -- minus the invite links --
  // and says what to run, rather than failing with an error digest.
  const select = {
    id: true,
    name: true,
    email: true,
    role: true,
    memberships: { include: { project: true } },
  };
  let users;
  let needsInviteMigration = false;
  try {
    users = await prisma.user.findMany({
      orderBy: { name: "asc" },
      select: { ...select, inviteToken: true, inviteExpiresAt: true },
    });
  } catch (e) {
    if (!(e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2022")) throw e;
    needsInviteMigration = true;
    const rows = await prisma.user.findMany({ orderBy: { name: "asc" }, select });
    users = rows.map((u) => ({ ...u, inviteToken: null, inviteExpiresAt: null }));
  }

  return (
    <div className="space-y-8">
      <section>
        <div className="mb-4 flex items-baseline justify-between gap-4">
          <h1 className="text-xl font-semibold">People</h1>
          <p className="text-sm text-muted-foreground tabular-nums">
            {users.length} {users.length === 1 ? "person" : "people"}
          </p>
        </div>
        {error && (
          <Alert variant="destructive" className="mb-4">
            <CircleAlertIcon aria-hidden />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}
        {needsInviteMigration && (
          <Alert className="mb-4 border-amber-300 bg-amber-50 text-amber-900">
            <TriangleAlertIcon aria-hidden />
            <AlertTitle>Invite links are not switched on yet.</AlertTitle>
            <AlertDescription className="text-amber-900">
              <p>
                Run <code className="font-mono">sql/05-add-invites.sql</code> in the Supabase SQL
                Editor. Until then, adding a person will fail — use <strong>Reset password</strong>{" "}
                on an existing account to let someone in.
              </p>
            </AlertDescription>
          </Alert>
        )}
        <div className="overflow-hidden rounded-xl border border-border bg-card">
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                <TableHead className="pl-4">Name</TableHead>
                <TableHead className="hidden md:table-cell">Email</TableHead>
                <TableHead className="hidden lg:table-cell">Projects</TableHead>
                <TableHead className="w-12 pr-4">
                  <span className="sr-only">Actions</span>
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {users.map((u) => {
                const projects = u.memberships.map((m) => m.project.name).join(", ");
                return (
                  <Fragment key={u.id}>
                    <TableRow className={u.inviteToken ? "border-b-0" : undefined}>
                      <TableCell className="pl-4">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="font-medium">{u.name}</span>
                          {u.role === "admin" && <Badge>admin</Badge>}
                          {u.inviteToken && (
                            <Badge variant="outline" className="border-amber-200 bg-amber-50 text-amber-800">
                              invited, not signed in yet
                            </Badge>
                          )}
                        </div>
                        <div className="text-xs text-muted-foreground md:hidden">{u.email}</div>
                      </TableCell>
                      <TableCell className="hidden text-muted-foreground md:table-cell">{u.email}</TableCell>
                      <TableCell className="hidden max-w-72 truncate text-muted-foreground lg:table-cell" title={projects}>
                        {projects || <span className="italic text-stone-400">none</span>}
                      </TableCell>
                      <TableCell className="pr-4 text-right">
                        <UserActions
                          user={{ id: u.id, name: u.name, email: u.email }}
                          invited={Boolean(u.inviteToken)}
                          isSelf={u.id === admin.id}
                        />
                      </TableCell>
                    </TableRow>
                    {u.inviteToken && (
                      <TableRow className="hover:bg-transparent">
                        <TableCell colSpan={4} className="whitespace-normal px-4 pt-0 pb-3">
                          <div className="flex flex-wrap items-center gap-3 rounded-lg border border-border bg-muted/60 px-3 py-2">
                            <CopyLink path={`/invite/${u.inviteToken}`} label="Copy invite link" />
                            <span className="text-xs text-muted-foreground">
                              Send this to {u.name}. It lets them set their own password, works
                              once, and expires {expiryWords(u.inviteExpiresAt)}.
                            </span>
                          </div>
                        </TableCell>
                      </TableRow>
                    )}
                  </Fragment>
                );
              })}
            </TableBody>
          </Table>
        </div>
      </section>

      <Card>
        <CardHeader>
          <CardTitle>Add a person</CardTitle>
          <CardDescription>
            You do not choose a password for them. Adding someone here creates a locked account and
            an invite link to send them, and they pick their own password when they open it. They
            only ever see the projects you add them to.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form action={createUser} className="flex flex-wrap items-end gap-3">
            <div className="min-w-44 flex-1 space-y-1.5">
              <Label htmlFor="new-name">Name</Label>
              <Input id="new-name" name="name" required autoComplete="off" />
            </div>
            <div className="min-w-56 flex-1 space-y-1.5">
              <Label htmlFor="new-email">Email</Label>
              <Input id="new-email" name="email" type="email" required autoComplete="off" />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="new-role">Role</Label>
              <NativeSelect id="new-role" name="role" defaultValue="member">
                <NativeSelectOption value="member">Member</NativeSelectOption>
                <NativeSelectOption value="admin">Admin</NativeSelectOption>
              </NativeSelect>
            </div>
            <SubmitButton pendingLabel="Adding…">Add person</SubmitButton>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
