import { act, renderHook, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { api } from "@/lib/api";
import { useResource } from "@/lib/hooks";
import { isAbortError } from "@/lib/http";
import { clearSharedCache, sharedRequest } from "@/lib/shared-cache";
import { jsonResponse, mockFetch } from "./helpers";

afterEach(() => clearSharedCache());

describe("sharedRequest", () => {
  it("shares one in-flight request and reuses the result within the TTL", async () => {
    let t = 0;
    const load = vi.fn(async () => ({ n: load.mock.calls.length }));
    const opts = { ttlMs: 1000, now: () => t };
    const [a, b] = await Promise.all([sharedRequest("k", load, opts), sharedRequest("k", load, opts)]);
    expect(load).toHaveBeenCalledTimes(1);
    expect(a).toBe(b);

    t = 999;
    await sharedRequest("k", load, opts);
    expect(load).toHaveBeenCalledTimes(1);

    t = 1000;
    await sharedRequest("k", load, opts);
    expect(load).toHaveBeenCalledTimes(2);
  });

  it("bypasses the cache when asked for a fresh value", async () => {
    const load = vi.fn(async () => "v");
    await sharedRequest("k", load, { ttlMs: 60_000 });
    await sharedRequest("k", load, { ttlMs: 60_000, fresh: true });
    expect(load).toHaveBeenCalledTimes(2);
  });

  it("never caches a failure", async () => {
    const load = vi.fn().mockRejectedValueOnce(new Error("down")).mockResolvedValueOnce("ok");
    await expect(sharedRequest("k", load, { ttlMs: 60_000 })).rejects.toThrow("down");
    await expect(sharedRequest("k", load, { ttlMs: 60_000 })).resolves.toBe("ok");
  });

  it("aborting one caller doesn't cancel the request the others share", async () => {
    let resolve!: (v: string) => void;
    const load = vi.fn(() => new Promise<string>((r) => (resolve = r)));
    const controller = new AbortController();
    const first = sharedRequest("k", load, { ttlMs: 1000, signal: controller.signal });
    const second = sharedRequest("k", load, { ttlMs: 1000 });
    controller.abort();
    resolve("v");
    expect(isAbortError(await first.catch((e: unknown) => e))).toBe(true);
    await expect(second).resolves.toBe("v");
  });
});

describe("analytics summary", () => {
  const summaryRoute = () => ({ "GET /api/v1/analytics/summary": [jsonResponse({ currency: "USD" })] });

  it("is fetched once for two pages and again after a successful mutation", async () => {
    const { fetchMock } = mockFetch({ ...summaryRoute(), "POST /api/v1/inventory/forecast": [jsonResponse({ id: "f-1" })] });
    await api.analytics.summary();
    await api.analytics.summary();
    expect(fetchMock).toHaveBeenCalledTimes(1);

    await api.inventory.forecast({ demand_multiplier: 1 });
    await api.analytics.summary();
    expect(fetchMock.mock.calls.filter(([url]) => String(url).includes("/analytics/summary"))).toHaveLength(2);
  });

  it("is refetched when the user presses Refresh (useResource reload)", async () => {
    const { fetchMock } = mockFetch(summaryRoute());
    const { result } = renderHook(() => useResource((signal, { refresh }) => api.analytics.summary({ signal, fresh: refresh }), []));
    await waitFor(() => expect(result.current.data).toBeDefined());
    act(() => result.current.reload());
    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(2));
  });
});
