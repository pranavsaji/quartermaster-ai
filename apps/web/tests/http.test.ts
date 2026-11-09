import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { jsonResponse, mockFetch } from "./helpers";

// `request` remembers that a login redirect is under way, so every test gets a fresh module.
async function loadHttp() {
  vi.resetModules();
  const http = await import("@/lib/http");
  const replace = vi.spyOn(http.navigation, "replace").mockImplementation(() => undefined);
  return { ...http, replace };
}

const API_ERROR = { error: { code: "UNAUTHENTICATED", message: "Sign in to continue.", correlation_id: "corr-1" } };

describe("request", () => {
  beforeEach(() => window.history.replaceState({}, "", "/orders?tab=open"));
  afterEach(() => window.history.replaceState({}, "", "/"));

  it("returns the parsed JSON body and sends the CSRF header on mutations", async () => {
    const { request } = await loadHttp();
    const { calls } = mockFetch({ "POST /api/v1/things": [jsonResponse({ ok: true })] });
    await expect(request("POST", "/things", { body: { a: 1 }, idempotencyKey: "k-1" })).resolves.toEqual({ ok: true });
    expect(calls[0]).toMatchObject({
      headers: { "x-requested-with": "quartermaster", "content-type": "application/json", "idempotency-key": "k-1" },
      body: { a: 1 },
    });
  });

  it("resolves an empty 204 to undefined", async () => {
    const { request } = await loadHttp();
    mockFetch({ "POST /api/v1/auth/logout": [new Response(null, { status: 204 })] });
    await expect(request("POST", "/auth/logout")).resolves.toBeUndefined();
  });

  it("redirects to sign-in on a 401, keeping the current page as `next`, and still throws", async () => {
    const { request, replace, ApiRequestError } = await loadHttp();
    mockFetch({ "GET /api/v1/inventory": [jsonResponse(API_ERROR, 401)] });

    const error = await request("GET", "/inventory").catch((e: unknown) => e);
    expect(error).toBeInstanceOf(ApiRequestError);
    expect(error).toMatchObject({ status: 401, code: "UNAUTHENTICATED", message: "Sign in to continue.", correlationId: "corr-1" });
    expect(replace).toHaveBeenCalledExactlyOnceWith(`/login?next=${encodeURIComponent("/orders?tab=open")}`);

    // A burst of 401s from parallel requests redirects once.
    await request("GET", "/inventory").catch(() => undefined);
    expect(replace).toHaveBeenCalledTimes(1);
  });

  it("does not redirect when the caller opts out of the 401 redirect", async () => {
    const { request, replace } = await loadHttp();
    mockFetch({ "POST /api/v1/auth/login": [jsonResponse(API_ERROR, 401)] });
    await expect(request("POST", "/auth/login", { redirectOnUnauthorized: false })).rejects.toMatchObject({ status: 401 });
    expect(replace).not.toHaveBeenCalled();
  });

  it("turns a non-JSON 200 (e.g. a proxy's HTML page) into an ambiguous error instead of returning a string", async () => {
    const { request, ApiRequestError } = await loadHttp();
    mockFetch({
      "GET /api/v1/inventory": [
        new Response("<!doctype html><title>Welcome to nginx</title>", { headers: { "content-type": "text/html" } }),
      ],
    });
    const error = await request("GET", "/inventory").catch((e: unknown) => e);
    expect(error).toBeInstanceOf(ApiRequestError);
    expect(error).toMatchObject({ code: "UNEXPECTED_RESPONSE", isAmbiguous: true });
  });

  it("rejects a 200 that claims JSON but doesn't parse", async () => {
    const { request } = await loadHttp();
    mockFetch({ "GET /api/v1/inventory": [new Response("{not json", { headers: { "content-type": "application/json" } })] });
    await expect(request("GET", "/inventory")).rejects.toMatchObject({ code: "UNEXPECTED_RESPONSE" });
  });

  it("uses a readable fallback for a non-JSON error page", async () => {
    const { request } = await loadHttp();
    mockFetch({ "GET /api/v1/inventory": [new Response("Bad Gateway", { status: 502, headers: { "x-request-id": "req-9" } })] });
    await expect(request("GET", "/inventory")).rejects.toMatchObject({
      status: 502,
      code: "UPSTREAM_ERROR",
      message: "The Quartermaster API is unreachable. Is it running?",
      correlationId: "req-9",
      isAmbiguous: true,
    });
  });

  it("maps a network failure to an ambiguous NETWORK_ERROR", async () => {
    const { request } = await loadHttp();
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => {
        throw new TypeError("Failed to fetch");
      }),
    );
    await expect(request("GET", "/inventory")).rejects.toMatchObject({ status: 0, code: "NETWORK_ERROR", isAmbiguous: true });
  });

  it("rethrows an abort untouched so callers can ignore it", async () => {
    const { request, isAbortError } = await loadHttp();
    const controller = new AbortController();
    controller.abort();
    mockFetch({ "GET /api/v1/inventory": [jsonResponse({ items: [] })] });
    const error = await request("GET", "/inventory", { signal: controller.signal }).catch((e: unknown) => e);
    expect(isAbortError(error)).toBe(true);
  });
});
