"use client";

import { useActionState } from "react";
import { acceptInvite, type InviteState } from "@/lib/invite-actions";

const input =
  "mt-1 w-full rounded-lg border border-stone-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-stone-400";

export function InviteForm({ token, email }: { token: string; email: string }) {
  const [state, action, pending] = useActionState<InviteState, FormData>(acceptInvite, null);
  return (
    <form action={action} className="bg-white rounded-xl shadow-sm border border-stone-200 p-6 space-y-4">
      <input type="hidden" name="token" value={token} />
      {/*
        Shown rather than hidden so they can see which address to sign in with
        next time -- and so password managers file the password under the right
        account, which they will not do for a form with no username field.
      */}
      <label className="block">
        <span className="text-sm font-medium">Your sign-in email</span>
        <input
          name="email"
          type="email"
          value={email}
          readOnly
          autoComplete="username"
          className={input + " bg-stone-50 text-stone-500"}
        />
      </label>
      <label className="block">
        <span className="text-sm font-medium">Choose a password</span>
        <input name="password" type="password" required minLength={8} autoComplete="new-password" className={input} />
      </label>
      <label className="block">
        <span className="text-sm font-medium">Type it again</span>
        <input name="confirm" type="password" required minLength={8} autoComplete="new-password" className={input} />
      </label>
      {state?.error && <p className="text-sm text-red-600">{state.error}</p>}
      <button
        type="submit"
        disabled={pending}
        className="w-full rounded-lg bg-stone-800 text-white py-2 text-sm font-medium hover:bg-stone-700 disabled:opacity-50"
      >
        {pending ? "Setting up…" : "Set password and sign in"}
      </button>
    </form>
  );
}
