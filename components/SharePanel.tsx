import { Link2Icon, TriangleAlertIcon } from "lucide-react";
import { EXPIRY_CHOICES, type ShareState } from "@/lib/share";
import { shareItemAction, unshareItemAction } from "@/lib/admin-actions";
import { CopyLink } from "@/components/CopyLink";
import { ConfirmButton } from "@/components/ConfirmButton";
import { SubmitButton } from "@/components/SubmitButton";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { NativeSelect, NativeSelectOption } from "@/components/ui/native-select";
import { cn } from "@/lib/utils";

function expiryWords(at: Date | null) {
  if (!at) return "It stays open until you revoke it.";
  const days = Math.ceil((at.getTime() - Date.now()) / (1000 * 60 * 60 * 24));
  if (days <= 0) return "It has expired.";
  if (days === 1) return "It expires tomorrow.";
  return `It expires in ${days} days.`;
}

function ExpirySelect() {
  return (
    <NativeSelect name="expiry" defaultValue="30" aria-label="Link lasts">
      {EXPIRY_CHOICES.map((c) => (
        <NativeSelectOption key={c.value} value={c.value}>
          {c.label}
        </NativeSelectOption>
      ))}
    </NativeSelect>
  );
}

/**
 * Sharing is per item and off by default: an item is private until this panel
 * is used on it. Admins only — a member who can read an item cannot decide to
 * put it outside the library.
 */
export function SharePanel({
  itemId,
  state,
  restricted,
  returnTo = "view",
  className = "mt-8",
}: {
  itemId: string;
  state: ShareState;
  restricted: boolean;
  /** Which page this panel is on, so its buttons come back here. */
  returnTo?: "view" | "edit";
  className?: string;
}) {
  if (!state.available) {
    return (
      <Alert className={cn("border-amber-300 bg-amber-50 text-amber-900", className)}>
        <TriangleAlertIcon aria-hidden />
        <AlertTitle>Share links are not switched on yet.</AlertTitle>
        <AlertDescription className="text-amber-900">
          <p>
            Run <code className="font-mono">sql/08-add-share-links.sql</code> in the Supabase SQL
            Editor. Until then every item stays private, as it is now.
          </p>
        </AlertDescription>
      </Alert>
    );
  }

  const share = state.share;
  const hidden = (
    <>
      <input type="hidden" name="itemId" value={itemId} />
      <input type="hidden" name="returnTo" value={returnTo} />
    </>
  );

  return (
    <section className={cn("rounded-xl border border-border bg-card p-4", className)}>
      <div className="flex items-center gap-2">
        <Link2Icon className="size-4 text-muted-foreground" aria-hidden />
        <h2 className="text-sm font-semibold">Share outside the library</h2>
        {share ? (
          <Badge variant="outline" className="border-emerald-200 bg-emerald-50 text-emerald-800">
            shared
          </Badge>
        ) : (
          <Badge variant="secondary">private</Badge>
        )}
      </div>

      {share ? (
        <>
          <p className="mt-1 text-sm text-muted-foreground">
            Anyone with this link can read this item without signing in.{" "}
            {expiryWords(share.expiresAt)}
          </p>
          <div className="mt-3 flex flex-wrap items-center gap-2">
            <CopyLink path={`/shared/${share.token}`} label="Copy share link" />
            <form action={unshareItemAction}>
              {hidden}
              <ConfirmButton
                variant="outline"
                className="text-destructive"
                title="Stop sharing this item?"
                description="The link stops working right away for everyone you sent it to. You can make a new link later, but it will be a different address."
                confirmLabel="Stop sharing"
                pendingLabel="Stopping…"
              >
                Stop sharing
              </ConfirmButton>
            </form>
          </div>
          <form
            action={shareItemAction}
            className="mt-4 flex flex-wrap items-center gap-2 border-t border-border pt-3"
          >
            {hidden}
            <span className="text-sm text-muted-foreground">Replace with a new link that lasts</span>
            <ExpirySelect />
            <ConfirmButton
              variant="outline"
              title="Replace the share link?"
              description="The current link stops working. Anyone who has it will need the new one."
              confirmLabel="Replace link"
              pendingLabel="Replacing…"
            >
              Replace
            </ConfirmButton>
          </form>
        </>
      ) : (
        <>
          <p className="mt-1 text-sm text-muted-foreground">
            Not shared. Only people signed in to the library can see this.
          </p>
          {restricted && (
            <Alert className="mt-3 border-amber-300 bg-amber-50 text-amber-900">
              <TriangleAlertIcon aria-hidden />
              <AlertDescription className="text-amber-900">
                This item is restricted. A share link ignores that. Anyone you send it to can read
                it, whether or not they are on the list.
              </AlertDescription>
            </Alert>
          )}
          <form action={shareItemAction} className="mt-3 flex flex-wrap items-center gap-2">
            {hidden}
            <span className="text-sm text-muted-foreground">Link lasts</span>
            <ExpirySelect />
            <SubmitButton pendingLabel="Creating…">Create a share link</SubmitButton>
          </form>
        </>
      )}
    </section>
  );
}
