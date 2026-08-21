import "server-only";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { randomBytes } from "crypto";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/db";

const COOKIE = "artifact_session";
const THIRTY_DAYS = 1000 * 60 * 60 * 24 * 30;

export type SessionUser = {
  id: string;
  email: string;
  name: string;
  role: string;
};

export async function hashPassword(pw: string) {
  return bcrypt.hash(pw, 10);
}

export async function verifyPassword(pw: string, hash: string) {
  return bcrypt.compare(pw, hash);
}

export async function createSession(userId: string) {
  const token = randomBytes(32).toString("hex");
  const expiresAt = new Date(Date.now() + THIRTY_DAYS);
  await prisma.session.create({ data: { token, userId, expiresAt } });
  const jar = await cookies();
  jar.set(COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    expires: expiresAt,
    path: "/",
  });
}

export async function destroySession() {
  const jar = await cookies();
  const token = jar.get(COOKIE)?.value;
  if (token) await prisma.session.deleteMany({ where: { token } });
  jar.delete(COOKIE);
}

export async function getCurrentUser(): Promise<SessionUser | null> {
  const jar = await cookies();
  const token = jar.get(COOKIE)?.value;
  if (!token) return null;
  const session = await prisma.session.findUnique({
    where: { token },
    include: { user: { select: { id: true, email: true, name: true, role: true } } },
  });
  if (!session || session.expiresAt < new Date()) return null;
  return session.user;
}

/** Current user, or bounce to /login. Call at the top of every protected page. */
export async function requireUser(): Promise<SessionUser> {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  return user;
}

/** Admin, or bounce home. Call at the top of every admin page and action. */
export async function requireAdmin(): Promise<SessionUser> {
  const user = await requireUser();
  if (user.role !== "admin") redirect("/");
  return user;
}

export async function login(email: string, password: string) {
  const user = await prisma.user.findUnique({ where: { email: email.trim().toLowerCase() } });
  // Verify against a constant hash when the account is missing so the two
  // failures take the same time and the login form can't be used to probe
  // which emails have accounts.
  const hash = user?.passwordHash ?? "$2b$10$C6UzMDM.H6dfI/f/IKcEeO7ZUgyMZ0Zr2C1QpO5cN1rIspHDGpTW6";
  const valid = await verifyPassword(password, hash);
  if (!user || !valid) return { ok: false as const, error: "Wrong email or password." };
  await createSession(user.id);
  return { ok: true as const };
}
