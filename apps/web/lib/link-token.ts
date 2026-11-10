/**
 * One-time tokens from invitation and password-reset links.
 *
 * The API puts them in the URL fragment (`/invite#token=…`), which browsers never send to a
 * server: the token stays out of access logs, proxies and `Referer` headers. A token in the query
 * string is ignored on purpose. Once read, the fragment is removed from the address bar (and from
 * history) so it isn't left on screen, bookmarked or shared by accident.
 */

const TOKEN = /^[\w-]{20,200}$/;

/** Parses `#token=…` from a location hash; null when absent or malformed. */
export function parseHashToken(hash: string): string | null {
  const raw = hash.startsWith("#") ? hash.slice(1) : hash;
  const value = new URLSearchParams(raw).get("token");
  return value && TOKEN.test(value) ? value : null;
}

/** Reads the token from the current page's fragment and clears the fragment. Browser only. */
export function takeHashToken(): string | null {
  if (typeof window === "undefined") return null;
  const token = parseHashToken(window.location.hash);
  if (window.location.hash) {
    const { pathname, search } = window.location;
    window.history.replaceState(window.history.state, "", `${pathname}${search}`);
  }
  return token;
}

/** Last token read, per path: the fragment is cleared after the first read, but re-renders still need it. */
let captured: { path: string; token: string | null } | null = null;

/**
 * Snapshot for `useSyncExternalStore`: the token of the current page's link. The first read takes
 * it from the fragment (and clears the fragment); later reads on the same path return it again.
 */
export function hashTokenSnapshot(): string | null {
  const path = window.location.pathname;
  if (window.location.hash || captured?.path !== path) captured = { path, token: takeHashToken() };
  return captured.token;
}

/** Forget the captured token (tests, or after the token has been used). */
export function resetHashToken(): void {
  captured = null;
}
