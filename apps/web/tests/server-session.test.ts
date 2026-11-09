import { beforeEach, describe, expect, it, vi } from "vitest";
import { apiOrigin, loadInitialSession, signInUrl } from "@/lib/server-session";
import { jsonResponse, mockFetch, PUBLIC_CONFIG, sessionUser } from "./helpers";

const incoming = new Headers();
vi.mock("next/headers", () => ({ headers: async () => incoming }));
const redirect = vi.fn((url: string) => {
  throw new Error(`NEXT_REDIRECT ${url}`);
});
vi.mock("next/navigation", () => ({ redirect: (url: string) => redirect(url) }));

describe("apiOrigin", () => {
  it("uses the same environment as the /api rewrite", () => {
    expect(apiOrigin({ API_URL: "https://api.example.com/" })).toBe("https://api.example.com");
    expect(apiOrigin({ API_HOSTPORT: "qm-api:10000" })).toBe("http://qm-api:10000");
    expect(apiOrigin({})).toBe("http://localhost:4000");
  });
});

describe("signInUrl", () => {
  it("sends the visitor back to the page they asked for", () => {
    expect(signInUrl("/approvals?x=1")).toBe(`/login?next=${encodeURIComponent("/approvals?x=1")}`);
    expect(signInUrl("/")).toBe("/login");
    expect(signInUrl(null)).toBe("/login");
    expect(signInUrl("//evil.example")).toBe("/login");
  });
});

describe("loadInitialSession", () => {
  beforeEach(() => {
    for (const key of [...incoming.keys()]) incoming.delete(key);
    redirect.mockClear();
  });

  it("loads the user and config from the API with the visitor's cookie", async () => {
    incoming.set("cookie", "qm_session=abc");
    incoming.set("x-forwarded-for", "203.0.113.7");
    const user = sessionUser("MANAGER");
    const { calls } = mockFetch({
      "GET /api/v1/auth/me": [jsonResponse({ user })],
      "GET /api/v1/config/public": [jsonResponse(PUBLIC_CONFIG)],
    });

    await expect(loadInitialSession()).resolves.toEqual({ user, config: PUBLIC_CONFIG });
    expect(calls[0]!.url).toBe("http://localhost:4000/api/v1/auth/me");
    expect(calls[0]!.headers.cookie).toBe("qm_session=abc");
    expect(calls[0]!.headers["x-forwarded-for"]).toBe("203.0.113.7");
  });

  it("redirects to sign in, back to the page, when the API rejects the session", async () => {
    incoming.set("cookie", "qm_session=revoked");
    incoming.set("x-qm-path", "/orders?tab=invoices");
    mockFetch({
      "GET /api/v1/auth/me": [jsonResponse({ error: { code: "UNAUTHORIZED", message: "Session expired" } }, 401)],
      "GET /api/v1/config/public": [jsonResponse(PUBLIC_CONFIG)],
    });

    await expect(loadInitialSession()).rejects.toThrow("NEXT_REDIRECT");
    expect(redirect).toHaveBeenCalledWith(`/login?next=${encodeURIComponent("/orders?tab=invoices")}`);
  });

  it("leaves it to the client when the API can't be reached or fails", async () => {
    mockFetch({
      "GET /api/v1/auth/me": [() => Promise.reject(new TypeError("fetch failed"))],
      "GET /api/v1/config/public": [jsonResponse(PUBLIC_CONFIG)],
    });
    await expect(loadInitialSession()).resolves.toBeNull();

    mockFetch({
      "GET /api/v1/auth/me": [jsonResponse({ user: sessionUser() })],
      "GET /api/v1/config/public": [jsonResponse({ error: { code: "INTERNAL", message: "boom" } }, 500)],
    });
    await expect(loadInitialSession()).resolves.toBeNull();
    expect(redirect).not.toHaveBeenCalled();
  });
});
