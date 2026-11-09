/**
 * A tiny shared cache for read-mostly GETs that several pages load (e.g. the
 * analytics summary on Overview and the Security center): concurrent callers
 * share one request, and a result is reused for `ttlMs`. Any successful
 * mutation clears it (see `request` in http.ts), so a write is never followed
 * by a cached pre-write read.
 *
 * Each caller keeps its own AbortSignal: aborting one caller (unmount, new
 * filter) rejects only that caller, never the shared request the others await.
 */

interface Entry {
  promise: Promise<unknown>;
  /** When the response arrived; undefined while in flight. */
  settledAt: number | undefined;
}

const entries = new Map<string, Entry>();

export function clearSharedCache(): void {
  entries.clear();
}

function abortError(): DOMException {
  return new DOMException("Aborted", "AbortError");
}

/** Resolves with `promise` unless `signal` aborts first. */
function untilAborted<T>(promise: Promise<T>, signal: AbortSignal | undefined): Promise<T> {
  if (!signal) return promise;
  if (signal.aborted) return Promise.reject(abortError());
  return new Promise<T>((resolve, reject) => {
    const onAbort = () => reject(abortError());
    signal.addEventListener("abort", onAbort, { once: true });
    promise.then(
      (value) => {
        signal.removeEventListener("abort", onAbort);
        resolve(value);
      },
      (error: unknown) => {
        signal.removeEventListener("abort", onAbort);
        reject(error);
      },
    );
  });
}

export function sharedRequest<T>(
  key: string,
  load: () => Promise<T>,
  options: { ttlMs: number; signal?: AbortSignal; fresh?: boolean; now?: () => number },
): Promise<T> {
  const now = options.now ?? Date.now;
  const existing = entries.get(key);
  const usable =
    existing && !options.fresh && (existing.settledAt === undefined || now() - existing.settledAt < options.ttlMs) ? existing : null;
  if (usable) return untilAborted(usable.promise as Promise<T>, options.signal);

  const entry: Entry = { promise: Promise.resolve(), settledAt: undefined };
  entry.promise = load().then(
    (value) => {
      if (entries.get(key) === entry) entry.settledAt = now();
      return value;
    },
    (error: unknown) => {
      // Never cache a failure: the next caller tries again.
      if (entries.get(key) === entry) entries.delete(key);
      throw error;
    },
  );
  entries.set(key, entry);
  return untilAborted(entry.promise as Promise<T>, options.signal);
}
