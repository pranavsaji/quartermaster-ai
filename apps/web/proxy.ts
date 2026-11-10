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
  if (pathname.startsWith("/api/")) return withEdgeSecret(request);
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

/** Header carrying EDGE_SECRET to the API (apps/api/src/http/middleware/edge.ts). */
export const EDGE_HEADER = "x-qm-edge";

/**
 * API requests (proxied to the Express API by the `/api/:path*` rewrite) carry EDGE_SECRET, which
 * tells the API that this proxy set X-Forwarded-For, so per-client rate limits can trust it. A
 * value sent by the browser is always dropped. The secret is a request header only: it is never
 * copied into the response.
 */
export function withEdgeSecret(request: NextRequest, secret = process.env.EDGE_SECRET) {
  const headers = new Headers(request.headers);
  headers.delete(EDGE_HEADER);
  if (secret) headers.set(EDGE_HEADER, secret);
  return NextResponse.next({ request: { headers } });
}

export const config = {
  matcher: [
    // API calls: only to attach the edge secret (see withEdgeSecret).
    "/api/:path*",
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
