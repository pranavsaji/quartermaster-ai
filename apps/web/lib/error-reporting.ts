/**
 * Browser error reporting for the API's error tracking (`POST /api/v1/client-errors`).
 *
 * Reports are best effort: they never throw, never retry, and are capped per page load so a
 * render loop or a noisy third-party script can't flood the API. Only the page's path is sent
 * (no query string or fragment, which can carry one-time tokens), and messages and stacks are
 * trimmed to the sizes the API accepts.
 */
import type { ClientErrorReport } from "@qm/contracts";
import { API_BASE } from "./http";

export type ClientErrorKind = ClientErrorReport["kind"];

/** At most this many reports leave one page load. */
export const MAX_REPORTS_PER_PAGE = 5;

const LIMITS = { message: 500, path: 300, stack: 4000, digest: 64 } as const;

function clip(value: string, max: number): string {
  return value.length > max ? value.slice(0, max) : value;
}

function describe(error: unknown): { message: string; stack?: string } {
  if (error instanceof Error) return { message: error.message || error.name, stack: error.stack };
  if (typeof error === "string") return { message: error };
  return { message: "Non-error value thrown" };
}

/** The report body for `error`, sized and stripped for the API. */
export function buildReport(error: unknown, kind: ClientErrorKind, options: { digest?: string; path?: string } = {}): ClientErrorReport {
  const { message, stack } = describe(error);
  const path = options.path ?? (typeof window === "undefined" ? "/" : window.location.pathname);
  const digest = options.digest ?? (error instanceof Error ? (error as Error & { digest?: unknown }).digest : undefined);
  return {
    kind,
    message: clip(message || "Unknown error", LIMITS.message),
    path: clip(path || "/", LIMITS.path),
    ...(stack ? { stack: clip(stack, LIMITS.stack) } : {}),
    ...(typeof digest === "string" && digest ? { digest: clip(digest, LIMITS.digest) } : {}),
  };
}

export interface ErrorReporter {
  report: (error: unknown, kind: ClientErrorKind, options?: { digest?: string }) => void;
  /** Reports sent so far (for tests). */
  readonly sent: number;
}

/** A reporter with its own per-page budget. `send` is injectable for tests. */
export function createErrorReporter(
  send: (body: ClientErrorReport) => Promise<unknown> = sendReport,
  max = MAX_REPORTS_PER_PAGE,
): ErrorReporter {
  let sent = 0;
  const seen = new Set<string>();
  return {
    report(error, kind, options) {
      try {
        if (sent >= max) return;
        const body = buildReport(error, kind, options);
        // The same error rendered twice (StrictMode, retries) is one report.
        const key = `${body.kind}|${body.message}|${body.digest ?? ""}`;
        if (seen.has(key)) return;
        seen.add(key);
        sent += 1;
        void send(body).catch(() => undefined);
      } catch {
        // Reporting must never become a second error.
      }
    },
    get sent() {
      return sent;
    },
  };
}

async function sendReport(body: ClientErrorReport): Promise<void> {
  await fetch(`${API_BASE}/client-errors`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Accept: "application/json", "X-Requested-With": "quartermaster" },
    credentials: "same-origin",
    // Survives the page unloading (an error during navigation still gets reported).
    keepalive: true,
    body: JSON.stringify(body),
  });
}

/** The page-wide reporter shared by error boundaries and the global listeners. */
export const errorReporter: ErrorReporter = createErrorReporter();
