import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { SITE_NAME } from "@/lib/constants";
import { LoginForm } from "./LoginForm";

export const metadata = { title: "Sign in" };

export default async function LoginPage() {
  if (await getCurrentUser()) redirect("/");
  return (
    <main className="min-h-screen flex items-center justify-center p-6">
      <div className="w-full max-w-sm">
        <h1 className="text-2xl font-semibold text-center mb-1">{SITE_NAME}</h1>
        <p className="text-sm text-stone-500 text-center mb-6">
          Sign in with the account you were given.
        </p>
        <LoginForm />
      </div>
    </main>
  );
}
