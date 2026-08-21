import Link from "next/link";
import { requireUser } from "@/lib/auth";
import { logoutAction } from "@/lib/actions";
import { SITE_NAME } from "@/lib/constants";

export default async function SiteLayout({ children }: { children: React.ReactNode }) {
  const user = await requireUser();
  return (
    <div className="min-h-screen">
      <header className="bg-white border-b border-stone-200">
        <div className="max-w-6xl mx-auto px-4 py-3 flex items-center gap-4">
          <Link href="/" className="font-semibold whitespace-nowrap">
            {SITE_NAME}
          </Link>
          <form action="/search" method="GET" className="flex-1 max-w-md">
            <input
              name="q"
              type="search"
              placeholder="Search titles, descriptions, topics…"
              className="w-full rounded-lg border border-stone-300 px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-stone-400"
            />
          </form>
          <nav className="ml-auto flex items-center gap-3 text-sm">
            {user.role === "admin" && (
              <Link href="/admin" className="text-stone-600 hover:text-stone-900">
                Admin
              </Link>
            )}
            <span className="text-stone-400 hidden sm:inline">{user.name}</span>
            <form action={logoutAction}>
              <button className="text-stone-600 hover:text-stone-900">Sign out</button>
            </form>
          </nav>
        </div>
      </header>
      <main className="max-w-6xl mx-auto px-4 py-8">{children}</main>
    </div>
  );
}
