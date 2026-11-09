/**
 * Content Security Policy for every HTML response (applied in proxy.ts with a
 * fresh nonce per request).
 *
 * - Scripts: only Next's own nonced scripts and what they load ('strict-dynamic'),
 *   which covers the PayPal v6 SDK we inject from lib/paypal.ts. The PayPal hosts
 *   are listed as a fallback for browsers without 'strict-dynamic'.
 * - Styles allow inline: AG Grid and AG Charts inject <style> elements at runtime
 *   and React renders style attributes, neither of which can carry a nonce. (A
 *   nonce in style-src would also disable 'unsafe-inline'.) Styles can't run code.
 * - Development additionally needs 'unsafe-eval' (React's dev tooling) and
 *   websocket connections for HMR.
 */
export const PAYPAL_ORIGINS = ["https://www.paypal.com", "https://www.sandbox.paypal.com"] as const;

export interface CspOptions {
  nonce: string;
  dev: boolean;
  /** Add upgrade-insecure-requests (only when served over HTTPS). */
  https: boolean;
}

export function buildCsp({ nonce, dev, https }: CspOptions): string {
  const paypal = PAYPAL_ORIGINS.join(" ");
  const directives: Array<[string, string]> = [
    ["default-src", "'self'"],
    ["script-src", `'self' 'nonce-${nonce}' 'strict-dynamic' ${paypal}${dev ? " 'unsafe-eval'" : ""}`],
    ["style-src", "'self' 'unsafe-inline'"],
    ["img-src", `'self' data: blob: ${paypal} https://www.paypalobjects.com`],
    ["font-src", "'self' data:"],
    ["connect-src", `'self' ${paypal}${dev ? " ws: wss:" : ""}`],
    ["frame-src", paypal],
    ["worker-src", "'self' blob:"],
    ["object-src", "'none'"],
    ["base-uri", "'self'"],
    ["form-action", "'self'"],
    ["frame-ancestors", "'none'"],
  ];
  const policy = directives.map(([name, value]) => `${name} ${value}`);
  if (https) policy.push("upgrade-insecure-requests");
  return policy.join("; ");
}

/** 128 random bits, base64. */
export function createNonce(): string {
  const bytes = new Uint8Array(16);
  crypto.getRandomValues(bytes);
  return btoa(String.fromCharCode(...bytes));
}
