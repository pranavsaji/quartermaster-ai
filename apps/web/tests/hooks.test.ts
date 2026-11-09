import { act, renderHook, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { usePagedResource, usePoller, useResource } from "@/lib/hooks";

interface Deferred<T> {
  promise: Promise<T>;
  resolve: (value: T) => void;
  reject: (error: unknown) => void;
}

function deferred<T>(): Deferred<T> {
  let resolve!: (value: T) => void;
  let reject!: (error: unknown) => void;
  const promise = new Promise<T>((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return { promise, resolve, reject };
}

describe("useResource", () => {
  it("ignores a superseded response that arrives late and aborts its request", async () => {
    const calls: Array<{ key: string; signal: AbortSignal; d: Deferred<string> }> = [];
    const { result, rerender } = renderHook(
      ({ key }) =>
        useResource(
          (signal) => {
            const d = deferred<string>();
            calls.push({ key, signal, d });
            return d.promise;
          },
          [key],
        ),
      { initialProps: { key: "a" } },
    );

    rerender({ key: "b" });
    const a = calls.find((c) => c.key === "a")!;
    const b = calls.find((c) => c.key === "b")!;
    expect(a.signal.aborted).toBe(true);

    await act(async () => b.d.resolve("data for b"));
    await act(async () => a.d.resolve("data for a"));

    expect(result.current.data).toBe("data for b");
    expect(result.current.loading).toBe(false);
  });

  it("marks data from previous deps as stale until the new response lands", async () => {
    const pending = new Map<string, Deferred<string>>();
    const { result, rerender } = renderHook(
      ({ key }) =>
        useResource(() => {
          const d = deferred<string>();
          pending.set(key, d);
          return d.promise;
        }, [key]),
      { initialProps: { key: "all" } },
    );
    await act(async () => pending.get("all")!.resolve("all rows"));
    expect(result.current.stale).toBe(false);
    expect(result.current.updatedAt).toEqual(expect.any(Number));

    rerender({ key: "HIGH" });
    expect(result.current.data).toBe("all rows");
    expect(result.current.stale).toBe(true);

    await act(async () => pending.get("HIGH")!.resolve("high rows"));
    expect(result.current).toMatchObject({ data: "high rows", stale: false });
  });

  it("keeps the last data and exposes the refresh error alongside it", async () => {
    let fail = false;
    const { result } = renderHook(() =>
      useResource(async () => {
        if (fail) throw new Error("boom");
        return "rows";
      }, []),
    );
    await waitFor(() => expect(result.current.data).toBe("rows"));
    fail = true;
    act(() => result.current.reload());
    await waitFor(() => expect(result.current.error).toBeInstanceOf(Error));
    expect(result.current.data).toBe("rows");
  });
});

type Page = { items: string[]; next_cursor: string | null };

describe("usePagedResource", () => {
  it("never appends a page loaded for an old filter to the new filter's results", async () => {
    const requests: Array<{ filter: string; cursor: string | null; signal?: AbortSignal; d: Deferred<Page> }> = [];
    const { result, rerender } = renderHook(
      ({ filter }) =>
        usePagedResource<string>(
          (cursor, signal) => {
            const d = deferred<Page>();
            requests.push({ filter, cursor, signal, d });
            return d.promise;
          },
          [filter],
        ),
      { initialProps: { filter: "all" } },
    );

    await act(async () => requests[0]!.d.resolve({ items: ["a1", "a2"], next_cursor: "c1" }));
    expect(result.current.hasMore).toBe(true);

    act(() => result.current.loadMore());
    const more = requests.find((r) => r.cursor === "c1")!;
    expect(result.current.loadingMore).toBe(true);

    rerender({ filter: "HIGH" });
    const highFirst = requests.find((r) => r.filter === "HIGH" && r.cursor === null)!;
    await act(async () => highFirst.d.resolve({ items: ["h1"], next_cursor: null }));
    expect(more.signal?.aborted).toBe(true);

    await act(async () => more.d.resolve({ items: ["a3"], next_cursor: null }));
    expect(result.current.items).toEqual(["h1"]);
    expect(result.current.loadingMore).toBe(false);
    expect(result.current.hasMore).toBe(false);
  });

  it("appends the next page and reports a load-more failure without hiding loaded items", async () => {
    let call = 0;
    const { result } = renderHook(() =>
      usePagedResource<string>(async (cursor) => {
        call += 1;
        if (cursor === null) return { items: ["1"], next_cursor: "c1" };
        if (call === 2) return { items: ["2"], next_cursor: "c2" };
        throw new Error("page 3 failed");
      }, []),
    );
    await waitFor(() => expect(result.current.items).toEqual(["1"]));

    act(() => result.current.loadMore());
    await waitFor(() => expect(result.current.items).toEqual(["1", "2"]));

    act(() => result.current.loadMore());
    await waitFor(() => expect(result.current.moreError).toBeInstanceOf(Error));
    expect(result.current.items).toEqual(["1", "2"]);
    expect(result.current.error).toBeUndefined();
    expect(result.current.hasMore).toBe(true);
  });
});

describe("usePoller", () => {
  afterEach(() => {
    vi.useRealTimers();
    Object.defineProperty(document, "hidden", { configurable: true, value: false });
  });

  it("waits for a slow poll to settle instead of aborting it on the next tick", async () => {
    vi.useFakeTimers();
    const signals: AbortSignal[] = [];
    let inFlight = 0;
    let maxConcurrent = 0;
    const task = vi.fn(async (signal: AbortSignal) => {
      signals.push(signal);
      inFlight += 1;
      maxConcurrent = Math.max(maxConcurrent, inFlight);
      await new Promise((resolve) => setTimeout(resolve, 7000)); // slower than the 3 s interval
      inFlight -= 1;
    });
    renderHook(() => usePoller(task, { active: true, intervalMs: 3000 }));

    await act(async () => vi.advanceTimersByTimeAsync(3000));
    expect(task).toHaveBeenCalledTimes(1);
    await act(async () => vi.advanceTimersByTimeAsync(6000)); // still in flight
    expect(task).toHaveBeenCalledTimes(1);
    expect(signals[0]!.aborted).toBe(false);

    await act(async () => vi.advanceTimersByTimeAsync(1000 + 3000)); // settles, then the next interval
    expect(task).toHaveBeenCalledTimes(2);
    expect(maxConcurrent).toBe(1);
  });

  it("backs off after failures and stops after maxAttempts until restarted", async () => {
    vi.useFakeTimers();
    const task = vi.fn(async () => {
      throw new Error("down");
    });
    const { result } = renderHook(() => usePoller(task, { active: true, intervalMs: 1000, maxIntervalMs: 4000, maxAttempts: 3 }));

    await act(async () => vi.advanceTimersByTimeAsync(1000));
    expect(task).toHaveBeenCalledTimes(1);
    await act(async () => vi.advanceTimersByTimeAsync(1999)); // next delay doubled to 2000
    expect(task).toHaveBeenCalledTimes(1);
    await act(async () => vi.advanceTimersByTimeAsync(1));
    expect(task).toHaveBeenCalledTimes(2);
    await act(async () => vi.advanceTimersByTimeAsync(4000));
    expect(task).toHaveBeenCalledTimes(3);
    expect(result.current.exhausted).toBe(true);
    expect(result.current.error).toBeInstanceOf(Error);

    await act(async () => vi.advanceTimersByTimeAsync(60_000));
    expect(task).toHaveBeenCalledTimes(3);

    act(() => result.current.restart());
    await act(async () => vi.advanceTimersByTimeAsync(0));
    expect(task).toHaveBeenCalledTimes(4);
    expect(result.current.exhausted).toBe(false);
  });

  it("pauses while the tab is hidden and resumes when it is visible again", async () => {
    vi.useFakeTimers();
    const task = vi.fn(async () => undefined);
    Object.defineProperty(document, "hidden", { configurable: true, value: true });
    renderHook(() => usePoller(task, { active: true, intervalMs: 1000 }));

    await act(async () => vi.advanceTimersByTimeAsync(10_000));
    expect(task).not.toHaveBeenCalled();

    Object.defineProperty(document, "hidden", { configurable: true, value: false });
    await act(async () => {
      document.dispatchEvent(new Event("visibilitychange"));
      await vi.advanceTimersByTimeAsync(0);
    });
    expect(task).toHaveBeenCalledTimes(1);
  });

  it("aborts the in-flight poll when polling stops", async () => {
    vi.useFakeTimers();
    let signal: AbortSignal | undefined;
    const task = (s: AbortSignal) => {
      signal = s;
      return new Promise<void>(() => undefined);
    };
    const { rerender } = renderHook(({ active }) => usePoller(task, { active, intervalMs: 1000 }), {
      initialProps: { active: true },
    });
    await act(async () => vi.advanceTimersByTimeAsync(1000));
    expect(signal?.aborted).toBe(false);
    rerender({ active: false });
    expect(signal?.aborted).toBe(true);
  });
});
