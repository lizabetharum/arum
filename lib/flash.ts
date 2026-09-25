import "server-only";
import { cookies } from "next/headers";

export const FLASH_COOKIE = "flash";

export type Flash = { id: string; message: string; kind: "success" | "error" };

/**
 * Leaves a one-line message for the next page to show as a toast. Every
 * action here ends in redirect(), so there is no return value to carry a
 * "Saved" back to the form; a cookie survives the redirect. It is readable
 * by the page's script (not httpOnly) because the toaster clears it once
 * shown, and it holds nothing but the message.
 */
export async function flash(message: string, kind: Flash["kind"] = "success") {
  const value: Flash = { id: crypto.randomUUID(), message, kind };
  (await cookies()).set(FLASH_COOKIE, JSON.stringify(value), {
    path: "/",
    maxAge: 60,
    sameSite: "lax",
    httpOnly: false,
  });
}

export async function readFlash(): Promise<Flash | null> {
  const raw = (await cookies()).get(FLASH_COOKIE)?.value;
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as Flash;
    return typeof parsed?.message === "string" && typeof parsed?.id === "string" ? parsed : null;
  } catch {
    return null;
  }
}
