/**
 * Server-side pre-check for console pages (used by proxy.ts). It only looks
 * for the API's session cookie, so a visitor with no session goes straight to
 * the sign-in page instead of loading the console shell first. Whether the
 * session is valid, and what the user's role allows, is still decided by the
 * API (`/auth/me`) on the client.
 */

/** Cookie names set by the API: `__Host-` prefixed in production, plain in development. */
export const SESSION_COOKIE_NAMES = ["__Host-qm_session", "qm_session"] as const;

const PUBLIC_PATHS = ["/login"];

function isPublic(pathname: string): boolean {
  return PUBLIC_PATHS.some((p) => pathname === p || pathname.startsWith(`${p}/`));
}

/** The `/login?next=…` URL to redirect to, or null when the request may proceed. */
export function loginRedirectFor(pathname: string, search: string, hasSessionCookie: boolean): string | null {
  if (hasSessionCookie || isPublic(pathname)) return null;
  const next = `${pathname}${search}`;
  return next === "/" ? "/login" : `/login?next=${encodeURIComponent(next)}`;
}
