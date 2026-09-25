import { requireAdmin } from "@/lib/auth";
import { AdminNav } from "@/components/AdminNav";

export const metadata = { title: "Admin" };

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  await requireAdmin();
  return (
    <div>
      <AdminNav />
      {children}
    </div>
  );
}
