"use client";

import { useCallback, useEffect, useEffectEvent, useLayoutEffect, useMemo, useRef, useState, type DependencyList } from "react";
import { isAbortError } from "./http";

/**
 * Counts how often `deps` have changed (shallow, like an effect's dependency
 * array) without spreading them into a hook's own dependency list. Uses the
 * "store information from previous renders" pattern, so no effect or ref write.
 */
function useDepsVersion(deps: DependencyList): number {
  const [tracked, setTracked] = useState({ deps, version: 0 });
  const changed = tracked.deps.length !== deps.length || tracked.deps.some((d, i) => !Object.is(d, deps[i]));
  if (changed) {
    const next = { deps, version: tracked.version + 1 };
    setTracked(next);
    return next.version;
  }
  return tracked.version;
}

export interface ResourceState<T> {
  data: T | undefined;
  error: unknown;
  /** True only while there is no data yet. */
  loading: boolean;
  /** True while a background reload is in flight (data may be stale). */
  refreshing: boolean;
  /** `data` was loaded for previous `deps` (e.g. an old filter) and its replacement is in flight. */
  stale: boolean;
  /** When `data` was last loaded or replaced (epoch ms), for "showing data from …" notices. */
  updatedAt: number | undefined;
  reload: () => void;
  /** Replace the cached value, e.g. with a mutation response. */
  setData: (next: T | ((prev: T | undefined) => T)) => void;
}

interface Loaded<T> {
  value: T | undefined;
  version: number;
  at: number | undefined;
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
  const depsVersion = useDepsVersion(deps);
  const [loaded, setLoaded] = useState<Loaded<T>>({ value: undefined, version: -1, at: undefined });
  const [failure, setFailure] = useState<{ error: unknown; version: number } | null>(null);
  const [reloads, setReloads] = useState(0);
  // A request is identified by (deps version, reload count); it is in flight until it settles.
  const requestKey = `${depsVersion}:${reloads}`;
  const [settledKey, setSettledKey] = useState<string | null>(null);
  const inFlight = enabled && settledKey !== requestKey;
  const fetchLatest = useEffectEvent(fetcher);

  useEffect(() => {
    if (!enabled) return;
    const controller = new AbortController();
    fetchLatest(controller.signal)
      .then((result) => {
        if (controller.signal.aborted) return;
        setLoaded({ value: result, version: depsVersion, at: Date.now() });
        setFailure(null);
      })
      .catch((err: unknown) => {
        if (controller.signal.aborted || isAbortError(err)) return;
        setFailure({ error: err, version: depsVersion });
      })
      .finally(() => {
        if (!controller.signal.aborted) setSettledKey(requestKey);
      });
    return () => controller.abort();
  }, [enabled, requestKey, depsVersion]);

  const reload = useCallback(() => setReloads((n) => n + 1), []);
  const setData = useCallback(
    (next: T | ((prev: T | undefined) => T)) => {
      setLoaded((prev) => ({
        value: typeof next === "function" ? (next as (p: T | undefined) => T)(prev.value) : next,
        version: depsVersion,
        at: Date.now(),
      }));
    },
    [depsVersion],
  );

  const data = loaded.value;
  return {
    data,
    error: failure && failure.version === depsVersion ? failure.error : undefined,
    loading: inFlight && data === undefined,
    refreshing: inFlight && data !== undefined,
    stale: data !== undefined && loaded.version !== depsVersion,
    updatedAt: loaded.at,
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
  // `run` is stable but must call the latest `action`; refs are updated after render, never during it.
  useLayoutEffect(() => {
    actionRef.current = action;
  });

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

export interface PollerOptions {
  /** Poll only while true. */
  active: boolean;
  /** Delay before the first poll and between successful polls. */
  intervalMs: number;
  /** Upper bound for the delay after failures (and successes, with `growth`). */
  maxIntervalMs?: number;
  /** Multiply the delay by this after each successful poll (default 1: constant). Failures always double it. */
  growth?: number;
  /** Stop after this many polls; `exhausted` then becomes true until `restart()`. */
  maxAttempts?: number;
}

export interface PollerState {
  /** The last poll failed (cleared by the next success). */
  error: unknown;
  /** `maxAttempts` was reached while still active. */
  exhausted: boolean;
  /** Reset the attempt count and delay and poll again now. */
  restart: () => void;
}

/**
 * Sequential poller: the next poll is scheduled only after the previous one
 * settles (so a slow request is never aborted by the next tick), failures back
 * off, polling pauses while the tab is hidden, and the in-flight request is
 * aborted when polling stops or the component unmounts.
 */
export function usePoller(task: (signal: AbortSignal) => Promise<void>, options: PollerOptions): PollerState {
  const { active, intervalMs, maxIntervalMs = intervalMs * 8, growth = 1, maxAttempts } = options;
  const runTask = useEffectEvent(task);
  const [error, setError] = useState<unknown>(undefined);
  const [exhausted, setExhausted] = useState(false);
  const [generation, setGeneration] = useState(0);
  const [wasActive, setWasActive] = useState(active);
  if (wasActive !== active) {
    setWasActive(active);
    if (active) setExhausted(false);
  }
  const startImmediately = generation > 0;

  useEffect(() => {
    if (!active || exhausted) return;
    let stopped = false;
    let timer: number | undefined;
    let controller: AbortController | null = null;
    let waitingForVisible = false;
    let attempts = 0;
    let delay = intervalMs;

    const schedule = (ms: number) => {
      timer = window.setTimeout(() => void tick(), ms);
    };

    const tick = async () => {
      if (stopped) return;
      if (document.hidden) {
        waitingForVisible = true;
        return;
      }
      controller = new AbortController();
      attempts += 1;
      try {
        await runTask(controller.signal);
        if (stopped) return;
        setError(undefined);
        delay = Math.min(delay * growth, maxIntervalMs);
      } catch (err) {
        if (stopped || isAbortError(err)) return;
        setError(err);
        delay = Math.min(delay * 2, maxIntervalMs);
      } finally {
        controller = null;
      }
      if (maxAttempts !== undefined && attempts >= maxAttempts) {
        setExhausted(true);
        return;
      }
      schedule(delay);
    };

    const onVisibilityChange = () => {
      if (!document.hidden && waitingForVisible) {
        waitingForVisible = false;
        schedule(0);
      }
    };
    document.addEventListener("visibilitychange", onVisibilityChange);
    schedule(startImmediately ? 0 : intervalMs);

    return () => {
      stopped = true;
      window.clearTimeout(timer);
      controller?.abort();
      document.removeEventListener("visibilitychange", onVisibilityChange);
    };
  }, [active, exhausted, intervalMs, maxIntervalMs, growth, maxAttempts, generation, startImmediately]);

  const restart = useCallback(() => {
    setExhausted(false);
    setError(undefined);
    setGeneration((g) => g + 1);
  }, []);

  return { error, exhausted: active && exhausted, restart };
}

export interface PagedState<T> {
  items: T[] | undefined;
  /** Failure loading the first page. */
  error: unknown;
  /** Failure loading the next page; the items already shown are still valid. */
  moreError: unknown;
  hasMore: boolean;
  loadingMore: boolean;
  loadMore: () => void;
  reload: () => void;
  refreshing: boolean;
  /** The items belong to previous `deps` (e.g. an old filter) while the new first page loads. */
  stale: boolean;
  updatedAt: number | undefined;
}

interface Page<T> {
  items: T[];
  next_cursor: string | null;
}

/**
 * Cursor-paginated list: first page on mount, "load more" appends the next one.
 * Appended pages belong to the first page they were loaded after, so a reload
 * or filter change discards them, and a "load more" still in flight for the old
 * first page is aborted and can never be appended to the new one.
 */
export function usePagedResource<T>(
  fetchPage: (cursor: string | null, signal?: AbortSignal) => Promise<Page<T>>,
  deps: DependencyList,
): PagedState<T> {
  const first = useResource((signal) => fetchPage(null, signal), deps);
  const base = first.data;
  const [extra, setExtra] = useState<{ base: Page<T>; items: T[]; cursor: string | null } | null>(null);
  const [more, setMore] = useState<{ base: Page<T>; loading: boolean; error: unknown } | null>(null);
  const controllerRef = useRef<AbortController | null>(null);

  const current = extra && extra.base === base ? extra : null;
  const moreState = more && more.base === base ? more : null;
  const cursor = current ? current.cursor : (base?.next_cursor ?? null);
  const loadingMore = moreState?.loading ?? false;

  // Abort a "load more" that belongs to a superseded first page.
  useEffect(() => () => controllerRef.current?.abort(), [base]);

  const loadMore = useCallback(() => {
    if (!base || !cursor || loadingMore) return;
    controllerRef.current?.abort();
    const controller = new AbortController();
    controllerRef.current = controller;
    setMore({ base, loading: true, error: undefined });
    fetchPage(cursor, controller.signal)
      .then((page) => {
        if (controller.signal.aborted) return;
        setExtra((prev) => ({
          base,
          items: [...(prev && prev.base === base ? prev.items : []), ...page.items],
          cursor: page.next_cursor,
        }));
        setMore({ base, loading: false, error: undefined });
      })
      .catch((err: unknown) => {
        if (controller.signal.aborted || isAbortError(err)) return;
        setMore({ base, loading: false, error: err });
      })
      .finally(() => {
        if (controllerRef.current === controller) controllerRef.current = null;
      });
  }, [base, cursor, loadingMore, fetchPage]);

  const items = useMemo(() => (base ? [...base.items, ...(current?.items ?? [])] : undefined), [base, current]);

  return {
    items,
    error: first.error,
    moreError: moreState?.error,
    hasMore: Boolean(cursor),
    loadingMore,
    loadMore,
    reload: first.reload,
    refreshing: first.refreshing,
    stale: first.stale,
    updatedAt: first.updatedAt,
  };
}
