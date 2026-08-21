import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";
import { createUser, deleteUser, setUserPassword } from "@/lib/admin-actions";

const input =
  "rounded-lg border border-stone-300 px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-stone-400";
const button = "rounded-lg bg-stone-800 text-white px-3 py-1.5 text-sm hover:bg-stone-700";

export default async function UsersPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const admin = await requireAdmin();
  const { error } = await searchParams;
  const users = await prisma.user.findMany({
    orderBy: { name: "asc" },
    include: { memberships: { include: { project: true } } },
  });

  return (
    <div className="space-y-8">
      <section>
        <h1 className="text-xl font-semibold mb-4">People</h1>
        {error && <p className="text-sm text-red-600 mb-3">{error}</p>}
        <div className="space-y-3">
          {users.map((u) => (
            <div key={u.id} className="bg-white rounded-xl border border-stone-200 p-4">
              <div className="flex flex-wrap items-center gap-2">
                <span className="font-medium">{u.name}</span>
                <span className="text-sm text-stone-500">{u.email}</span>
                {u.role === "admin" && (
                  <span className="text-xs bg-stone-800 text-white rounded-full px-2 py-0.5">admin</span>
                )}
                <div className="ml-auto flex items-center gap-3">
                  <details className="relative">
                    <summary className="text-sm text-stone-600 hover:text-stone-900 cursor-pointer list-none">
                      Reset password
                    </summary>
                    <form
                      action={setUserPassword}
                      className="absolute right-0 z-10 mt-1 bg-white border border-stone-200 rounded-xl shadow-md p-3 flex gap-2"
                    >
                      <input type="hidden" name="userId" value={u.id} />
                      <input
                        name="password"
                        type="text"
                        required
                        minLength={8}
                        placeholder="New password"
                        className={input}
                      />
                      <button className={button}>Set</button>
                    </form>
                  </details>
                  {u.id !== admin.id && (
                    <form action={deleteUser}>
                      <input type="hidden" name="userId" value={u.id} />
                      <button className="text-sm text-red-600 hover:text-red-800">Delete</button>
                    </form>
                  )}
                </div>
              </div>
              {u.memberships.length > 0 && (
                <p className="text-xs text-stone-500 mt-2">
                  Projects: {u.memberships.map((m) => m.project.name).join(", ")}
                </p>
              )}
            </div>
          ))}
        </div>
      </section>

      <section className="bg-white rounded-xl border border-stone-200 p-5">
        <h2 className="font-medium mb-3">Add a person</h2>
        <form action={createUser} className="flex flex-wrap gap-2 items-end">
          <label className="text-sm">
            <span className="block text-xs text-stone-500 mb-1">Name</span>
            <input name="name" required className={input} />
          </label>
          <label className="text-sm">
            <span className="block text-xs text-stone-500 mb-1">Email</span>
            <input name="email" type="email" required className={input} />
          </label>
          <label className="text-sm">
            <span className="block text-xs text-stone-500 mb-1">Password (min 8)</span>
            <input name="password" type="text" required minLength={8} className={input} />
          </label>
          <label className="text-sm">
            <span className="block text-xs text-stone-500 mb-1">Role</span>
            <select name="role" className={input} defaultValue="member">
              <option value="member">Member</option>
              <option value="admin">Admin</option>
            </select>
          </label>
          <button className={button}>Add</button>
        </form>
        <p className="text-xs text-stone-500 mt-2">
          Share the password with them directly — new people only see projects you add them to.
        </p>
      </section>
    </div>
  );
}
