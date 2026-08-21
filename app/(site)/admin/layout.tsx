import Link from "next/link";
import { requireAdmin } from "@/lib/auth";

export const metadata = { title: "Admin" };

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  await requireAdmin();
  return (
    <div>
      <nav className="flex gap-4 text-sm border-b border-stone-200 pb-3 mb-6">
        <Link href="/admin/projects" className="text-stone-600 hover:text-stone-900 font-medium">
          Projects
        </Link>
        <Link href="/admin/users" className="text-stone-600 hover:text-stone-900 font-medium">
          People
        </Link>
      </nav>
      {children}
    </div>
  );
}
