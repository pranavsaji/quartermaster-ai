import { NextResponse, type NextRequest } from "next/server";
import { buildCsp, createNonce } from "./lib/csp";
import { loginRedirectFor, PATH_HEADER, SESSION_COOKIE_NAMES } from "./lib/session-gate";

/**
 * Runs before every page request:
 * 1. Sends visitors without a session cookie to /login?next=… (the console layout
 *    then asks the API whether the session is valid and what the role allows).
 * 2. Sets a per-request nonce-based Content-Security-Policy. Next.js reads the
 *    nonce from the request's CSP header and attaches it to its own scripts,
 *    which is why pages render dynamically (see app/layout.tsx). Nothing of ours
 *    reads the nonce, so it isn't passed on separately (e.g. as x-nonce).
 */
export function proxy(request: NextRequest) {
  const { pathname, search } = request.nextUrl;
  const hasSession = SESSION_COOKIE_NAMES.some((name) => request.cookies.has(name));
  const loginUrl = loginRedirectFor(pathname, search, hasSession);
  if (loginUrl) return NextResponse.redirect(new URL(loginUrl, request.url));

  const nonce = createNonce();
  const https = request.nextUrl.protocol === "https:" || request.headers.get("x-forwarded-proto") === "https";
  const csp = buildCsp({ nonce, dev: process.env.NODE_ENV === "development", https });

  const requestHeaders = new Headers(request.headers);
  requestHeaders.set("Content-Security-Policy", csp);
  // For the console layout's sign-in redirect when the API rejects the session (lib/server-session).
  requestHeaders.set(PATH_HEADER, `${pathname}${search}`);

  const response = NextResponse.next({ request: { headers: requestHeaders } });
  response.headers.set("Content-Security-Policy", csp);
  return response;
}

export const config = {
  matcher: [
    {
      // Pages only: not the API rewrite, build assets, or files with an extension (icon.svg, …).
      source: "/((?!api/|_next/static|_next/image|favicon\\.ico|.*\\.[a-z0-9]+$).*)",
      missing: [
        { type: "header", key: "next-router-prefetch" },
        { type: "header", key: "purpose", value: "prefetch" },
      ],
    },
  ],
};
