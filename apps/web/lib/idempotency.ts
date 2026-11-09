/**
 * Idempotency keys for endpoints marked (I).
 *
 * A key identifies one *user action*. If the same action is retried (same scope,
 * same request body) after an ambiguous failure — a network error, a 5xx, or a
 * 409 "request in progress" — the same key is reused so the server can
 * deduplicate. Once the server has given a definitive answer (success, or a
 * definitive 4xx) the key is retired, and the next attempt is a new action.
 */
import { ApiRequestError } from "./http";

const pending = new Map<string, string>();

function fallbackUuid(): string {
  const bytes = new Uint8Array(16);
  crypto.getRandomValues(bytes);
  bytes[6] = ((bytes[6] ?? 0) & 0x0f) | 0x40;
  bytes[8] = ((bytes[8] ?? 0) & 0x3f) | 0x80;
  const hex = Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}

export function newIdempotencyKey(): string {
  // randomUUID is only exposed in secure contexts (https / localhost).
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") return crypto.randomUUID();
  return fallbackUuid();
}

/** Deterministic JSON with sorted object keys, so equal bodies fingerprint equally. */
export function stableStringify(value: unknown): string {
  if (value === null || typeof value !== "object") return JSON.stringify(value) ?? "null";
  if (Array.isArray(value)) return `[${value.map(stableStringify).join(",")}]`;
  const entries = Object.entries(value as Record<string, unknown>)
    .filter(([, v]) => v !== undefined)
    .sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0));
  return `{${entries.map(([k, v]) => `${JSON.stringify(k)}:${stableStringify(v)}`).join(",")}}`;
}

function shouldKeepKey(error: unknown): boolean {
  if (!(error instanceof ApiRequestError)) return true; // unknown failure: outcome ambiguous
  return error.isAmbiguous || error.status === 409;
}

/**
 * Runs `perform` with an idempotency key bound to `action` + `body`.
 * Retries of an identical action reuse the key until a definitive response.
 */
export async function withIdempotency<T>(
  action: string,
  body: unknown,
  perform: (idempotencyKey: string) => Promise<T>,
): Promise<T> {
  const scope = `${action}::${stableStringify(body ?? null)}`;
  let key = pending.get(scope);
  if (!key) {
    key = newIdempotencyKey();
    pending.set(scope, key);
  }
  try {
    const result = await perform(key);
    pending.delete(scope);
    return result;
  } catch (error) {
    if (!shouldKeepKey(error)) pending.delete(scope);
    throw error;
  }
}
