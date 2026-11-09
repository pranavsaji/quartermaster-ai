"use client";

import { useCallback, useEffect, useMemo, useRef, useState, type DependencyList } from "react";
import { isAbortError } from "./http";

export interface ResourceState<T> {
  data: T | undefined;
  error: unknown;
  /** True only while there is no data yet. */
  loading: boolean;
  /** True while a background reload is in flight (data may be stale). */
  refreshing: boolean;
  reload: () => void;
  /** Replace the cached value, e.g. with a mutation response. */
  setData: (next: T | ((prev: T | undefined) => T)) => void;
}

/**
 * Fetches a resource on mount and whenever `deps` change. Requests are aborted
 * when superseded or on unmount, so out-of-order responses can't clobber state.
 */
export function useResource<T>(
  fetcher: (signal: AbortSignal) => Promise<T>,
  deps: DependencyList,
  options: { enabled?: boolean } = {},
): ResourceState<T> {
  const enabled = options.enabled ?? true;
  const [data, setDataState] = useState<T | undefined>(undefined);
  const [error, setError] = useState<unknown>(undefined);
  const [inFlight, setInFlight] = useState(enabled);
  const [version, setVersion] = useState(0);
  const fetcherRef = useRef(fetcher);
  fetcherRef.current = fetcher;

  useEffect(() => {
    if (!enabled) {
      setInFlight(false);
      return;
    }
    const controller = new AbortController();
    setInFlight(true);
    fetcherRef
      .current(controller.signal)
      .then((result) => {
        if (controller.signal.aborted) return;
        setDataState(result);
        setError(undefined);
      })
      .catch((err: unknown) => {
        if (controller.signal.aborted || isAbortError(err)) return;
        setError(err);
      })
      .finally(() => {
        if (!controller.signal.aborted) setInFlight(false);
      });
    return () => controller.abort();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enabled, version, ...deps]);

  const reload = useCallback(() => setVersion((v) => v + 1), []);
  const setData = useCallback((next: T | ((prev: T | undefined) => T)) => {
    setDataState((prev) => (typeof next === "function" ? (next as (p: T | undefined) => T)(prev) : next));
  }, []);

  return {
    data,
    error,
    loading: inFlight && data === undefined,
    refreshing: inFlight && data !== undefined,
    reload,
    setData,
  };
}

export interface ActionState<A extends unknown[], R> {
  run: (...args: A) => Promise<R | undefined>;
  pending: boolean;
  error: unknown;
  reset: () => void;
}

/**
 * Wraps a user-triggered async action. Guards against double submission and
 * captures the error for display instead of throwing into React.
 */
export function useAction<A extends unknown[], R>(action: (...args: A) => Promise<R>): ActionState<A, R> {
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<unknown>(undefined);
  const busy = useRef(false);
  const actionRef = useRef(action);
  actionRef.current = action;

  const run = useCallback(async (...args: A): Promise<R | undefined> => {
    if (busy.current) return undefined;
    busy.current = true;
    setPending(true);
    setError(undefined);
    try {
      return await actionRef.current(...args);
    } catch (err) {
      setError(err);
      return undefined;
    } finally {
      busy.current = false;
      setPending(false);
    }
  }, []);

  const reset = useCallback(() => setError(undefined), []);
  return { run, pending, error, reset };
}

/** Current time, re-rendered every `intervalMs`. For countdowns and "x minutes ago". */
export function useNow(intervalMs = 1000): number {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const id = window.setInterval(() => setNow(Date.now()), intervalMs);
    return () => window.clearInterval(id);
  }, [intervalMs]);
  return now;
}

/** Calls `tick` every `intervalMs` while `active` is true. */
export function useInterval(tick: () => void, intervalMs: number, active: boolean): void {
  const tickRef = useRef(tick);
  tickRef.current = tick;
  useEffect(() => {
    if (!active) return;
    const id = window.setInterval(() => tickRef.current(), intervalMs);
    return () => window.clearInterval(id);
  }, [intervalMs, active]);
}

export interface PagedState<T> {
  items: T[] | undefined;
  error: unknown;
  hasMore: boolean;
  loadingMore: boolean;
  loadMore: () => void;
  reload: () => void;
  refreshing: boolean;
}

/** Cursor-paginated list: first page on mount, "load more" appends the next one. */
export function usePagedResource<T>(
  fetchPage: (cursor: string | null, signal?: AbortSignal) => Promise<{ items: T[]; next_cursor: string | null }>,
  deps: DependencyList,
): PagedState<T> {
  const first = useResource((signal) => fetchPage(null, signal), deps);
  const [extra, setExtra] = useState<{ items: T[]; cursor: string | null } | null>(null);
  const [loadingMore, setLoadingMore] = useState(false);
  const [moreError, setMoreError] = useState<unknown>(undefined);
  const fetchRef = useRef(fetchPage);
  fetchRef.current = fetchPage;

  // Reset appended pages whenever the first page is (re)loaded.
  useEffect(() => {
    setExtra(null);
    setMoreError(undefined);
  }, [first.data]);

  const cursor = extra ? extra.cursor : (first.data?.next_cursor ?? null);

  const loadMore = useCallback(() => {
    if (!cursor || loadingMore) return;
    setLoadingMore(true);
    fetchRef
      .current(cursor)
      .then((page) => setExtra((prev) => ({ items: [...(prev?.items ?? []), ...page.items], cursor: page.next_cursor })))
      .catch(setMoreError)
      .finally(() => setLoadingMore(false));
  }, [cursor, loadingMore]);

  const items = useMemo(
    () => (first.data ? [...first.data.items, ...(extra?.items ?? [])] : undefined),
    [first.data, extra],
  );

  return {
    items,
    error: first.error ?? moreError,
    hasMore: Boolean(cursor),
    loadingMore,
    loadMore,
    reload: first.reload,
    refreshing: first.refreshing,
  };
}
