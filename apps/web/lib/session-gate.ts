/**
 * Server-side pre-check for console pages (used by proxy.ts). It only looks
 * for the API's session cookie, so a visitor with no session goes straight to
 * the sign-in page instead of loading the console shell first. Whether the
 * session is valid, and what the user's role allows, is still decided by the
 * API (`/auth/me`): by the console layout on the server (lib/server-session),
 * or by the client when that could not reach the API.
 */

/**
 * Request header proxy.ts sets to the page's path and query (overwriting anything the client
 * sent), so the console layout can build `/login?next=…` when the API rejects the session.
 */
export const PATH_HEADER = "x-qm-path";

/** Cookie names set by the API: `__Host-` prefixed in production, plain in development. */
export const SESSION_COOKIE_NAMES = ["__Host-qm_session", "qm_session"] as const;

/** Pages for signed-out visitors: sign-in, sign-up, password reset and invitation links. */
export const PUBLIC_PATHS = ["/login", "/signup", "/forgot-password", "/reset-password", "/invite"];

function isPublic(pathname: string): boolean {
  return PUBLIC_PATHS.some((p) => pathname === p || pathname.startsWith(`${p}/`));
}

/** The `/login?next=…` URL to redirect to, or null when the request may proceed. */
export function loginRedirectFor(pathname: string, search: string, hasSessionCookie: boolean): string | null {
  if (hasSessionCookie || isPublic(pathname)) return null;
  const next = `${pathname}${search}`;
  return next === "/" ? "/login" : `/login?next=${encodeURIComponent(next)}`;
}
