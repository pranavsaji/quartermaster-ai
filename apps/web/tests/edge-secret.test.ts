// @vitest-environment node
import { NextRequest } from "next/server";
import { describe, expect, it } from "vitest";
import { config, EDGE_HEADER, proxy, withEdgeSecret } from "@/proxy";

/** Request headers a middleware response asks Next.js to forward upstream (to the API rewrite). */
function forwarded(res: Response): Record<string, string | null> {
  const names = (res.headers.get("x-middleware-override-headers") ?? "").split(",").filter(Boolean);
  return Object.fromEntries(names.map((n) => [n, res.headers.get(`x-middleware-request-${n}`)]));
}

describe("edge secret on API requests", () => {
  it("attaches EDGE_SECRET to proxied API requests and drops a browser-supplied value", () => {
    const req = new NextRequest("https://app.example/api/v1/auth/me", { headers: { [EDGE_HEADER]: "forged", cookie: "qm_session=x" } });
    const res = withEdgeSecret(req, "s3cret-edge-value-0123456789");
    expect(forwarded(res)[EDGE_HEADER]).toBe("s3cret-edge-value-0123456789");
    expect(forwarded(res).cookie).toBe("qm_session=x");
    // Never echoed to the browser as a response header.
    expect(res.headers.get(EDGE_HEADER)).toBeNull();
  });

  it("forwards no edge header when EDGE_SECRET is unset", () => {
    const req = new NextRequest("https://app.example/api/v1/auth/me", { headers: { [EDGE_HEADER]: "forged" } });
    expect(forwarded(withEdgeSecret(req, undefined))[EDGE_HEADER]).toBeUndefined();
  });

  it("routes /api requests through the edge branch, not the sign-in redirect", () => {
    const res = proxy(new NextRequest("https://app.example/api/v1/inventory"));
    expect(res.status).toBe(200);
    expect(res.headers.get("location")).toBeNull();
    expect(res.headers.get("content-security-policy")).toBeNull();
    expect(config.matcher).toContain("/api/:path*");
  });
});
