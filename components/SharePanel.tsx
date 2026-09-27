import { EXPIRY_CHOICES, type ShareState } from "@/lib/share";
import { shareItemAction, unshareItemAction } from "@/lib/admin-actions";
import { CopyLink } from "@/components/CopyLink";

const select =
  "rounded-lg border border-stone-300 px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-stone-400";

function expiryWords(at: Date | null) {
  if (!at) return "It stays open until you revoke it.";
  const days = Math.ceil((at.getTime() - Date.now()) / (1000 * 60 * 60 * 24));
  if (days <= 0) return "It has expired.";
  if (days === 1) return "It expires tomorrow.";
  return `It expires in ${days} days.`;
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
}: {
  itemId: string;
  state: ShareState;
  restricted: boolean;
  /** Which page this panel is on, so its buttons come back here. */
  returnTo?: "view" | "edit";
}) {
  if (!state.available) {
    return (
      <section className="mt-8 rounded-xl border border-amber-300 bg-amber-50 p-4 text-sm text-amber-900">
        <p className="font-medium">Share links are not switched on yet.</p>
        <p className="mt-1">
          Run <code className="font-mono">sql/08-add-share-links.sql</code> in the Supabase SQL
          Editor. Until then every item stays private, as it is now.
        </p>
      </section>
    );
  }

  const share = state.share;

  return (
    <section className="mt-8 rounded-xl border border-stone-200 bg-white p-4">
      <h2 className="text-sm font-semibold text-stone-800">Share outside the library</h2>

      {share ? (
        <>
          <p className="mt-1 text-xs text-stone-500">
            Anyone with this link can read this item without signing in.{" "}
            {expiryWords(share.expiresAt)}
          </p>
          <div className="mt-3 flex flex-wrap items-center gap-2">
            <CopyLink path={`/shared/${share.token}`} label="Copy share link" />
            <form action={unshareItemAction}>
              <input type="hidden" name="itemId" value={itemId} />
              <input type="hidden" name="returnTo" value={returnTo} />
            <input type="hidden" name="returnTo" value={returnTo} />
              <button className="rounded-lg border border-stone-300 bg-white px-3 py-1.5 text-sm text-red-700 hover:border-red-400">
                Stop sharing
              </button>
            </form>
          </div>
          <form action={shareItemAction} className="mt-3 flex flex-wrap items-center gap-2">
            <input type="hidden" name="itemId" value={itemId} />
            <input type="hidden" name="returnTo" value={returnTo} />
            <select name="expiry" defaultValue="30" className={select}>
              {EXPIRY_CHOICES.map((c) => (
                <option key={c.value} value={c.value}>
                  {c.label}
                </option>
              ))}
            </select>
            <button className="text-xs text-stone-600 underline hover:text-stone-900">
              Replace with a new link
            </button>
            <span className="text-xs text-stone-400">The current link stops working.</span>
          </form>
        </>
      ) : (
        <>
          <p className="mt-1 text-xs text-stone-500">
            Not shared. Only people signed in to the library can see this.
          </p>
          {restricted && (
            <p className="mt-2 rounded-lg bg-amber-50 px-3 py-2 text-xs text-amber-900">
              This item is restricted. A share link ignores that — anyone you send it to can read
              it, whether or not they are on the list.
            </p>
          )}
          <form action={shareItemAction} className="mt-3 flex flex-wrap items-center gap-2">
            <input type="hidden" name="itemId" value={itemId} />
            <input type="hidden" name="returnTo" value={returnTo} />
            <select name="expiry" defaultValue="30" className={select}>
              {EXPIRY_CHOICES.map((c) => (
                <option key={c.value} value={c.value}>
                  {c.label}
                </option>
              ))}
            </select>
            <button className="rounded-lg bg-stone-800 px-3 py-1.5 text-sm text-white hover:bg-stone-700">
              Create a share link
            </button>
          </form>
        </>
      )}
    </section>
  );
}
