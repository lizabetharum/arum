/**
 * A "come back here after signing in" path, made safe to redirect to.
 *
 * The value arrives in a query string, so anyone can put anything in it. Only
 * a path inside this site is allowed: it must start with a single slash, which
 * rules out `https://elsewhere.example` and the protocol-relative `//elsewhere`
 * that browsers also treat as another site. Anything else falls back to home.
 */
export function safeNextPath(value: unknown): string {
  const path = typeof value === "string" ? value : "";
  if (!path.startsWith("/") || path.startsWith("//") || path.startsWith("/\\")) return "/";
  // A shared link is a page to read, never a sign-out or an action.
  if (path === "/login" || path.startsWith("/login?")) return "/";
  return path;
}
