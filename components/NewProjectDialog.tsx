"use client";

import { PlusIcon } from "lucide-react";
import { createProject } from "@/lib/admin-actions";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { SubmitButton } from "@/components/SubmitButton";

export function NewProjectDialog() {
  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button className="shrink-0">
          <PlusIcon aria-hidden />
          New project
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <form action={createProject} className="space-y-4">
          <DialogHeader>
            <DialogTitle>New project</DialogTitle>
            <DialogDescription>
              Only admins can see it until you add members.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-1.5">
            <Label htmlFor="new-project-name">Name</Label>
            <Input id="new-project-name" name="name" required autoComplete="off" />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="new-project-description">Description (optional)</Label>
            <Input id="new-project-description" name="description" autoComplete="off" />
          </div>
          <DialogFooter>
            <DialogClose asChild>
              <Button type="button" variant="outline">
                Cancel
              </Button>
            </DialogClose>
            <SubmitButton pendingLabel="Creating…">Create project</SubmitButton>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
