/**
 * Minimal typed HTTP layer for the Quartermaster API.
 *
 * - Same-origin only: every call goes to `/api/v1/*`, which Next.js rewrites to
 *   the Express API, so the httpOnly session cookie is first-party.
 * - Every mutating request carries the CSRF guard header and a JSON content type.
 * - Errors are normalised into `ApiRequestError`, which always carries the API's
 *   `message` and (when present) `correlation_id` for support/debugging.
 * - A 401 redirects to `/login` unless the caller opts out (e.g. the login form).
 * - A successful response must be JSON (or empty); anything else is an ambiguous
 *   `UNEXPECTED_RESPONSE` error rather than a string handed to a component.
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
    return this.status === 403 && this.code === "ROLE_REQUIRED";
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

/** Browser navigation used for the 401 redirect; a seam so tests can observe it (jsdom can't navigate). */
export const navigation = {
  replace(url: string): void {
    window.location.replace(url);
  },
};

let redirecting = false;

function redirectToLogin(): void {
  if (typeof window === "undefined" || redirecting) return;
  if (window.location.pathname.startsWith("/login")) return;
  redirecting = true;
  const next = `${window.location.pathname}${window.location.search}`;
  // A full page load: the session is gone, so drop all client state with it.
  navigation.replace(`/login?next=${encodeURIComponent(next)}`);
}

type Body = { kind: "empty" } | { kind: "json"; value: unknown } | { kind: "other"; text: string };

async function readBody(response: Response): Promise<Body> {
  if (response.status === 204 || response.status === 205) return { kind: "empty" };
  const text = await response.text();
  if (!text) return { kind: "empty" };
  const type = response.headers.get("content-type") ?? "";
  if (/\bapplication\/(?:[\w.+-]+\+)?json\b/i.test(type)) {
    try {
      return { kind: "json", value: JSON.parse(text) as unknown };
    } catch {
      return { kind: "other", text };
    }
  }
  return { kind: "other", text };
}

/**
 * A 2xx whose body isn't JSON (e.g. an HTML page from a misconfigured proxy or
 * rewrite) never reaches components as a string. The request may or may not have
 * reached the API, so it is reported as ambiguous, like a gateway error.
 */
function unexpectedResponse(response: Response): ApiRequestError {
  return new ApiRequestError({
    status: 502,
    code: "UNEXPECTED_RESPONSE",
    message: "Quartermaster sent a response the console couldn't read. The API may be unreachable or misconfigured; try again shortly.",
    correlationId: response.headers.get("x-correlation-id") ?? response.headers.get("x-request-id"),
  });
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
    const error = errorFromResponse(response, body.kind === "json" ? body.value : undefined);
    if (error.isUnauthorized && options.redirectOnUnauthorized !== false) redirectToLogin();
    throw error;
  }

  if (body.kind === "other") throw unexpectedResponse(response);
  return (body.kind === "json" ? body.value : undefined) as T;
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
