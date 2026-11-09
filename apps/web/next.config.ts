import type { NextConfig } from "next";

/**
 * The browser only ever talks to this Next.js origin. `/api/*` is proxied to the
 * Express API so the httpOnly session cookie it sets is first-party.
 *
 * Note: rewrites are resolved when the server starts / the app is built, so
 * `API_URL` must be present in the environment at that time.
 */
// On Render, the API's private-network address arrives as API_HOSTPORT ("host:port").
const apiUrl = (process.env.API_URL ?? (process.env.API_HOSTPORT ? `http://${process.env.API_HOSTPORT}` : "http://localhost:4000")).replace(/\/+$/, "");

// The Content-Security-Policy needs a per-request nonce, so it is set in proxy.ts, not here.
const securityHeaders = [
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=(), payment=(self \"https://www.paypal.com\" \"https://www.sandbox.paypal.com\")" },
  ...(process.env.NODE_ENV === "production"
    ? [{ key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains" }]
    : []),
];

const nextConfig: NextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  transpilePackages: ["@qm/contracts"],
  async rewrites() {
    return [{ source: "/api/:path*", destination: `${apiUrl}/api/:path*` }];
  },
  async headers() {
    return [{ source: "/:path*", headers: securityHeaders }];
  },
};

export default nextConfig;
