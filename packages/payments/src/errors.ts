/** A definitive error response from PayPal (the request reached PayPal and was rejected). */
export class PayPalApiError extends Error {
  readonly status: number;
  readonly issue: string | null;
  readonly debugId: string | null;
  readonly details: unknown;

  constructor(status: number, body: unknown, operation: string) {
    const b = (body ?? {}) as { name?: string; message?: string; debug_id?: string; details?: { issue?: string; description?: string }[] };
    const issue = b.details?.[0]?.issue ?? b.name ?? null;
    super(`PayPal ${operation} failed (${status}${issue ? ` ${issue}` : ""}): ${b.details?.[0]?.description ?? b.message ?? "no message"}`);
    this.name = "PayPalApiError";
    this.status = status;
    this.issue = issue;
    this.debugId = b.debug_id ?? null;
    this.details = body;
  }

  /** True when the outcome is known not to have changed state (safe to retry the same operation). */
  get retryable(): boolean {
    return this.status === 429 || this.status >= 500;
  }
}

/**
 * The outcome of the request is unknown: it timed out or the connection dropped. For mutating
 * operations the caller must reconcile by reading the resource, never by blindly re-creating it.
 */
export class PayPalAmbiguousError extends Error {
  readonly operation: string;
  constructor(operation: string, cause: unknown) {
    super(`PayPal ${operation} outcome unknown: ${cause instanceof Error ? cause.message : String(cause)}`);
    this.name = "PayPalAmbiguousError";
    this.operation = operation;
    this.cause = cause;
  }
}

export class PayPalNotConfiguredError extends Error {
  constructor() {
    super("PayPal is not configured. Set PAYPAL_CLIENT_ID and PAYPAL_CLIENT_SECRET.");
    this.name = "PayPalNotConfiguredError";
  }
}
