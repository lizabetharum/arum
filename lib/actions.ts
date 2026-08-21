"use server";

import { redirect } from "next/navigation";
import { login, destroySession } from "@/lib/auth";

export type LoginState = { error: string } | null;

export async function loginAction(_prev: LoginState, formData: FormData): Promise<LoginState> {
  const email = String(formData.get("email") ?? "");
  const password = String(formData.get("password") ?? "");
  if (!email || !password) return { error: "Enter your email and password." };
  const result = await login(email, password);
  if (!result.ok) return { error: result.error };
  redirect("/");
}

export async function logoutAction() {
  await destroySession();
  redirect("/login");
}
