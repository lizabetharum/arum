import Link from "next/link";
import { SITE_NAME } from "@/lib/constants";
import { findInvite } from "@/lib/invite-actions";
import { InviteForm } from "./InviteForm";

export const metadata = { title: "Accept your invitation" };

export default async function InvitePage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const invite = await findInvite(token);

  return (
    <main className="min-h-screen flex items-center justify-center p-6">
      <div className="w-full max-w-sm">
        <h1 className="text-2xl font-semibold text-center mb-1">{SITE_NAME}</h1>
        {invite ? (
          <>
            <p className="text-sm text-stone-500 text-center mb-6">
              Welcome, {invite.name}. Choose a password and you are in.
            </p>
            <InviteForm token={token} email={invite.email} />
          </>
        ) : (
          <div className="bg-white rounded-xl shadow-sm border border-stone-200 p-6 text-center">
            <p className="text-sm text-stone-700">
              This invitation has expired or has already been used.
            </p>
            <p className="text-sm text-stone-500 mt-2">
              Ask for a new link. If you have already set a password,{" "}
              <Link href="/login" className="underline hover:text-stone-800">
                sign in
              </Link>
              .
            </p>
          </div>
        )}
      </div>
    </main>
  );
}
