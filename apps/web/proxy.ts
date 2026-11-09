import { NextResponse, type NextRequest } from "next/server";
import { buildCsp, createNonce } from "./lib/csp";

/**
 * Runs before every page request: sets a per-request nonce-based
 * Content-Security-Policy. Next.js reads the nonce from the request's CSP
 * header and attaches it to its own scripts, which is why pages render
 * dynamically (see app/layout.tsx).
 */
export function proxy(request: NextRequest) {
  const nonce = createNonce();
  const https = request.nextUrl.protocol === "https:" || request.headers.get("x-forwarded-proto") === "https";
  const csp = buildCsp({ nonce, dev: process.env.NODE_ENV === "development", https });

  const requestHeaders = new Headers(request.headers);
  requestHeaders.set("x-nonce", nonce);
  requestHeaders.set("Content-Security-Policy", csp);

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
