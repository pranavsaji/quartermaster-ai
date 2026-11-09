import { describe, expect, it } from "vitest";
import { buildCsp, createNonce } from "@/lib/csp";

const directive = (csp: string, name: string) => csp.split("; ").find((d) => d.startsWith(`${name} `)) ?? "";

describe("buildCsp", () => {
  it("locks scripts to the request nonce and PayPal, with no eval in production", () => {
    const csp = buildCsp({ nonce: "abc123", dev: false, https: true });
    const script = directive(csp, "script-src");
    expect(script).toContain("'nonce-abc123'");
    expect(script).toContain("'strict-dynamic'");
    expect(script).toContain("https://www.sandbox.paypal.com");
    expect(script).not.toContain("unsafe-eval");
    expect(script).not.toContain("unsafe-inline");
    expect(directive(csp, "frame-ancestors")).toBe("frame-ancestors 'none'");
    expect(directive(csp, "object-src")).toBe("object-src 'none'");
    expect(directive(csp, "base-uri")).toBe("base-uri 'self'");
    expect(directive(csp, "frame-src")).toBe("frame-src https://www.paypal.com https://www.sandbox.paypal.com");
    expect(csp).toContain("upgrade-insecure-requests");
  });

  it("allows eval and HMR websockets only in development, and never upgrades plain-http hosts", () => {
    const csp = buildCsp({ nonce: "n", dev: true, https: false });
    expect(directive(csp, "script-src")).toContain("'unsafe-eval'");
    expect(directive(csp, "connect-src")).toContain("ws:");
    expect(csp).not.toContain("upgrade-insecure-requests");
  });

  it("creates unpredictable 128-bit nonces", () => {
    const a = createNonce();
    expect(a).toMatch(/^[A-Za-z0-9+/]{22}==$/);
    expect(createNonce()).not.toBe(a);
  });
});
