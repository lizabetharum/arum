"use client";

import { startTransition, useState } from "react";
import { KeyRoundIcon, LinkIcon, MoreHorizontalIcon, Trash2Icon, XIcon } from "lucide-react";
import { cancelInvite, deleteUser, resendInvite, setUserPassword } from "@/lib/admin-actions";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { SubmitButton } from "@/components/SubmitButton";

type Open = null | "password" | "cancel" | "delete";

/**
 * One person's actions, behind a "…" menu. The dialogs live outside the menu
 * rather than inside it: a menu item unmounts when the menu closes, which
 * would take a dialog opened from it down too.
 */
export function UserActions({
  user,
  invited,
  isSelf,
}: {
  user: { id: string; name: string; email: string };
  invited: boolean;
  isSelf: boolean;
}) {
  const [open, setOpen] = useState<Open>(null);
  const close = (o: boolean) => !o && setOpen(null);

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="icon-sm" aria-label={`Actions for ${user.name}`}>
            <MoreHorizontalIcon />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="min-w-48">
          <DropdownMenuItem onSelect={() => setOpen("password")}>
            <KeyRoundIcon aria-hidden />
            Reset password…
          </DropdownMenuItem>
          {invited && (
            <>
              {/* Not a dialog: a new link replaces the old one, and the
                  toast says so. Nothing is lost that can't be sent again. */}
              <DropdownMenuItem
                onSelect={() => {
                  const form = new FormData();
                  form.set("userId", user.id);
                  startTransition(() => resendInvite(form));
                }}
              >
                <LinkIcon aria-hidden />
                New invite link
              </DropdownMenuItem>
              <DropdownMenuItem onSelect={() => setOpen("cancel")}>
                <XIcon aria-hidden />
                Cancel invitation…
              </DropdownMenuItem>
            </>
          )}
          {!isSelf && (
            <>
              <DropdownMenuSeparator />
              <DropdownMenuItem variant="destructive" onSelect={() => setOpen("delete")}>
                <Trash2Icon aria-hidden />
                Delete…
              </DropdownMenuItem>
            </>
          )}
        </DropdownMenuContent>
      </DropdownMenu>

      <Dialog open={open === "password"} onOpenChange={close}>
        <DialogContent className="sm:max-w-md">
          <form action={setUserPassword} className="space-y-4">
            <input type="hidden" name="userId" value={user.id} />
            <DialogHeader>
              <DialogTitle>Reset {user.name}&apos;s password</DialogTitle>
              <DialogDescription>
                They are signed out everywhere and any invite link stops working. Tell them the new
                password yourself.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-1.5">
              <Label htmlFor={`pw-${user.id}`}>New password</Label>
              <Input
                id={`pw-${user.id}`}
                name="password"
                type="text"
                required
                minLength={8}
                autoComplete="off"
              />
              <p className="text-xs text-muted-foreground">At least 8 characters.</p>
            </div>
            <DialogFooter>
              <DialogClose asChild>
                <Button type="button" variant="outline">
                  Cancel
                </Button>
              </DialogClose>
              <SubmitButton pendingLabel="Setting…">Set password</SubmitButton>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={open === "cancel"} onOpenChange={close}>
        <DialogContent className="sm:max-w-md" showCloseButton={false}>
          <form action={cancelInvite} className="space-y-4">
            <input type="hidden" name="userId" value={user.id} />
            <DialogHeader>
              <DialogTitle>Cancel {user.name}&apos;s invitation?</DialogTitle>
              <DialogDescription>
                The link you sent stops working. Their account stays, but nobody can sign in to it
                until you send a new link or set a password.
              </DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <DialogClose asChild>
                <Button type="button" variant="outline">
                  Keep it
                </Button>
              </DialogClose>
              <SubmitButton variant="destructive" pendingLabel="Canceling…">
                Cancel invitation
              </SubmitButton>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={open === "delete"} onOpenChange={close}>
        <DialogContent className="sm:max-w-md" showCloseButton={false}>
          <form action={deleteUser} className="space-y-4">
            <input type="hidden" name="userId" value={user.id} />
            <DialogHeader>
              <DialogTitle>Delete {user.name}?</DialogTitle>
              <DialogDescription>
                {user.email} is removed from every project and can no longer sign in. Their
                comments are deleted too. This can&apos;t be undone.
              </DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <DialogClose asChild>
                <Button type="button" variant="outline">
                  Cancel
                </Button>
              </DialogClose>
              <SubmitButton variant="destructive" pendingLabel="Deleting…">
                Delete person
              </SubmitButton>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}
