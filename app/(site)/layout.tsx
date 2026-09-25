import Link from "next/link";
import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { projectAccessWhere } from "@/lib/access";
import { logoutAction } from "@/lib/actions";
import { SITE_NAME } from "@/lib/constants";
import { QuickFind } from "@/components/QuickFind";
import { UserMenu } from "@/components/UserMenu";

export default async function SiteLayout({ children }: { children: React.ReactNode }) {
  const user = await requireUser();
  const projects = await prisma.project.findMany({
    where: projectAccessWhere(user),
    orderBy: { name: "asc" },
    select: { slug: true, name: true },
  });
  return (
    <div className="min-h-screen">
      <header className="sticky top-0 z-40 border-b border-border bg-card/90 backdrop-blur supports-[backdrop-filter]:bg-card/75">
        <div className="mx-auto flex max-w-6xl items-center gap-4 px-4 py-2.5">
          <Link href="/" className="whitespace-nowrap font-semibold tracking-tight">
            {SITE_NAME}
          </Link>
          <div className="flex-1">
            <QuickFind projects={projects} />
          </div>
          <nav className="ml-auto flex items-center gap-1 text-sm">
            {user.role === "admin" && (
              <Link
                href="/admin"
                className="rounded-md px-2.5 py-1.5 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
              >
                Admin
              </Link>
            )}
            <UserMenu name={user.name} email={user.email} signOut={logoutAction} />
          </nav>
        </div>
      </header>
      <main className="mx-auto max-w-6xl px-4 py-8">{children}</main>
    </div>
  );
}
