"use client";

import { useRef } from "react";
import { useFormStatus } from "react-dom";
import { Loader2Icon } from "lucide-react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";

/**
 * Stands in for the submit button of a form whose action can't be undone.
 * The click opens a dialog instead of submitting; confirming submits the
 * form it sits in. The dialog renders in a portal outside the form, so it
 * submits through the trigger's own form rather than a nested button.
 */
export function ConfirmButton({
  children,
  title,
  description,
  confirmLabel = "Delete",
  pendingLabel = "Deleting…",
  variant = "destructive",
  size = "sm",
  className,
}: {
  children: React.ReactNode;
  title: string;
  description: React.ReactNode;
  confirmLabel?: string;
  pendingLabel?: string;
  variant?: React.ComponentProps<typeof Button>["variant"];
  size?: React.ComponentProps<typeof Button>["size"];
  className?: string;
}) {
  const trigger = useRef<HTMLButtonElement>(null);
  const { pending } = useFormStatus();

  return (
    <AlertDialog>
      <AlertDialogTrigger asChild>
        <Button ref={trigger} type="button" variant={variant} size={size} disabled={pending} className={className}>
          {pending && <Loader2Icon className="animate-spin" aria-hidden />}
          {pending ? pendingLabel : children}
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{title}</AlertDialogTitle>
          <AlertDialogDescription>{description}</AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction
            variant="destructive"
            onClick={() => trigger.current?.closest("form")?.requestSubmit()}
          >
            {confirmLabel}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
