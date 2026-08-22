import { NextRequest, NextResponse } from "next/server";

/**
 * Sends signed-out visitors to the sign-in page carrying where they were
 * headed, so a link you share with someone lands them on that page once they
 * are in, rather than dropping them at the home page having lost it.
 *
 * This only looks for the presence of a session cookie — middleware runs before
 * the database is reachable, so it cannot tell a valid session from an expired
 * one. That is fine: it decides where to send people, not who gets in. Every
 * protected page still calls requireUser(), which is what actually checks.
 */
export function middleware(request: NextRequest) {
  if (request.cookies.has("artifact_session")) return NextResponse.next();

  const { pathname, search } = request.nextUrl;
  const url = request.nextUrl.clone();
  url.pathname = "/login";
  url.search = "";
  url.searchParams.set("next", pathname + search);
  return NextResponse.redirect(url);
}

export const config = {
  // Everything except the pages a signed-out person is supposed to reach
  // (sign in, accepting an invite), the API, and Next's own asset routes.
  matcher: ["/((?!login|invite|api|_next/static|_next/image|favicon.ico).*)"],
};
