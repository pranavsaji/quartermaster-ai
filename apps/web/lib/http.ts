/**
 * Minimal typed HTTP layer for the Quartermaster API.
 *
 * - Same-origin only: every call goes to `/api/v1/*`, which Next.js rewrites to
 *   the Express API, so the httpOnly session cookie is first-party.
 * - Every mutating request carries the CSRF guard header and a JSON content type.
 * - Errors are normalised into `ApiRequestError`, which always carries the API's
 *   `message` and (when present) `correlation_id` for support/debugging.
 * - A 401 redirects to `/login` unless the caller opts out (e.g. the login form).
 */
import type { ApiError } from "@qm/contracts";

export const API_BASE = "/api/v1";

export type HttpMethod = "GET" | "POST" | "PUT";

export type QueryValue = string | number | boolean | null | undefined;

export interface RequestOptions {
  body?: unknown;
  query?: Record<string, QueryValue>;
  /** Required by the API for endpoints marked (I). */
  idempotencyKey?: string;
  signal?: AbortSignal;
  /** Defaults to true. Set false where a 401 is an expected, displayable outcome. */
  redirectOnUnauthorized?: boolean;
}

export class ApiRequestError extends Error {
  readonly status: number;
  readonly code: string;
  readonly correlationId: string | null;
  readonly details: unknown;

  constructor(init: { status: number; code: string; message: string; correlationId?: string | null; details?: unknown }) {
    super(init.message);
    this.name = "ApiRequestError";
    this.status = init.status;
    this.code = init.code;
    this.correlationId = init.correlationId ?? null;
    this.details = init.details;
  }

  get isUnauthorized(): boolean {
    return this.status === 401;
  }

  get isForbidden(): boolean {
    return this.status === 403;
  }

  /**
   * The caller's role is too low for the action (`requireRole` in the API).
   * Other 403s (CSRF guard, "only the approving owner can pay", disabled
   * synthetic actions) carry their own explanation and are not role problems.
   */
  get isRoleDenied(): boolean {
    return this.status === 403 && this.code === "FORBIDDEN" && /\brequires the (OWNER|MANAGER|VIEWER) role\b/i.test(this.message);
  }

  /** Network failure, gateway problem or 5xx: the outcome on the server is unknown. */
  get isAmbiguous(): boolean {
    return this.status === 0 || this.status >= 500;
  }
}

export function isApiErrorBody(value: unknown): value is ApiError {
  if (typeof value !== "object" || value === null || !("error" in value)) return false;
  const error = (value as { error: unknown }).error;
  return (
    typeof error === "object" &&
    error !== null &&
    typeof (error as { code?: unknown }).code === "string" &&
    typeof (error as { message?: unknown }).message === "string"
  );
}

function buildUrl(path: string, query?: Record<string, QueryValue>): string {
  const url = `${API_BASE}${path.startsWith("/") ? path : `/${path}`}`;
  if (!query) return url;
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(query)) {
    if (value === undefined || value === null || value === "") continue;
    params.set(key, String(value));
  }
  const qs = params.toString();
  return qs ? `${url}?${qs}` : url;
}

let redirecting = false;

function redirectToLogin(): void {
  if (typeof window === "undefined" || redirecting) return;
  if (window.location.pathname.startsWith("/login")) return;
  redirecting = true;
  const next = `${window.location.pathname}${window.location.search}`;
  // A full page load: the session is gone, so drop all client state with it.
  window.location.replace(`/login?next=${encodeURIComponent(next)}`);
}

async function readBody(response: Response): Promise<unknown> {
  if (response.status === 204 || response.status === 205) return undefined;
  const text = await response.text();
  if (!text) return undefined;
  const type = response.headers.get("content-type") ?? "";
  if (type.includes("application/json")) {
    try {
      return JSON.parse(text) as unknown;
    } catch {
      return text;
    }
  }
  return text;
}

function errorFromResponse(response: Response, body: unknown): ApiRequestError {
  const headerCorrelation = response.headers.get("x-correlation-id") ?? response.headers.get("x-request-id");
  if (isApiErrorBody(body)) {
    return new ApiRequestError({
      status: response.status,
      code: body.error.code,
      message: body.error.message,
      correlationId: body.error.correlation_id ?? headerCorrelation,
      details: body.error.details,
    });
  }
  const fallback: Record<number, string> = {
    401: "Your session has expired. Please sign in again.",
    403: "You don't have permission to do that.",
    404: "That resource could not be found.",
    502: "The Quartermaster API is unreachable. Is it running?",
    503: "The Quartermaster API is temporarily unavailable.",
    504: "The Quartermaster API took too long to respond.",
  };
  return new ApiRequestError({
    status: response.status,
    code: response.status >= 500 ? "UPSTREAM_ERROR" : "HTTP_ERROR",
    message: fallback[response.status] ?? `Request failed with status ${response.status}.`,
    correlationId: headerCorrelation,
  });
}

export async function request<T>(method: HttpMethod, path: string, options: RequestOptions = {}): Promise<T> {
  const headers: Record<string, string> = { Accept: "application/json" };
  const mutating = method !== "GET";
  if (mutating) {
    headers["X-Requested-With"] = "quartermaster";
    headers["Content-Type"] = "application/json";
  }
  if (options.idempotencyKey) headers["Idempotency-Key"] = options.idempotencyKey;

  let response: Response;
  try {
    response = await fetch(buildUrl(path, options.query), {
      method,
      headers,
      credentials: "same-origin",
      cache: "no-store",
      signal: options.signal,
      body: mutating ? JSON.stringify(options.body ?? {}) : undefined,
    });
  } catch (cause) {
    if (cause instanceof DOMException && cause.name === "AbortError") throw cause;
    throw new ApiRequestError({
      status: 0,
      code: "NETWORK_ERROR",
      message: "Could not reach Quartermaster. Check your connection and try again.",
    });
  }

  const body = await readBody(response);

  if (!response.ok) {
    const error = errorFromResponse(response, body);
    if (error.isUnauthorized && options.redirectOnUnauthorized !== false) redirectToLogin();
    throw error;
  }

  return body as T;
}

export function isAbortError(error: unknown): boolean {
  return error instanceof DOMException && error.name === "AbortError";
}

/** Human-readable message for any thrown value, preferring the API's message. */
export function describeError(error: unknown): string {
  if (error instanceof ApiRequestError) return error.message;
  if (error instanceof Error) return error.message;
  return "Something went wrong.";
}
