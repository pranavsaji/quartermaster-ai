/**
 * Post-login redirect target validation.
 *
 * `next` comes from the query string, so it is attacker-controlled. Browsers
 * normalise backslashes, tabs and newlines in URLs (`/\evil.example` and
 * `/<TAB>/evil.example` both become `//evil.example`), so prefix checks alone are
 * not enough: the value is resolved against our origin and only a same-origin
 * path is ever returned.
 */

// Backslashes, C0 controls, DEL and spaces, which the URL parser strips or rewrites.
const UNSAFE_RAW = /[\\\u0000- \u007f]/;
// The same once percent-decoded (an encoded space is harmless and stays encoded).
const UNSAFE_DECODED = /[\\\u0000-\u001f\u007f]/;

function decodedOrNull(value: string): string | null {
  try {
    return decodeURIComponent(value);
  } catch {
    return null;
  }
}

/** Returns a same-origin `path?query#hash` for `value`, or "/" if it is unsafe. */
export function safeNext(value: string | null | undefined, origin: string): string {
  const fallback = "/";
  if (!value || !value.startsWith("/") || value.startsWith("//")) return fallback;

  const decoded = decodedOrNull(value);
  if (decoded === null || UNSAFE_RAW.test(value) || UNSAFE_DECODED.test(decoded) || decoded.startsWith("//")) {
    return fallback;
  }

  let base: URL;
  let target: URL;
  try {
    base = new URL(origin);
    target = new URL(value, base);
  } catch {
    return fallback;
  }
  if (target.origin !== base.origin) return fallback;
  // `/.//evil.example` resolves to the path `//evil.example`, which a browser would treat as protocol-relative.
  if (target.pathname.startsWith("//")) return fallback;
  if (target.pathname === "/login" || target.pathname.startsWith("/login/")) return fallback;

  return `${target.pathname}${target.search}${target.hash}`;
}
