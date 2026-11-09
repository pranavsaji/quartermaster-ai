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

  /**
   * PayPal answered 5xx: the request reached PayPal but the outcome is unknown. A mutating call
   * (capture, refund) may have taken effect, so reconcile by reading the resource first.
   */
  get ambiguous(): boolean {
    return this.status >= 500;
  }

  /** PayPal throttled the request (429) before processing it: state is known not to have changed. */
  get rateLimited(): boolean {
    return this.status === 429;
  }

  /**
   * True when the same operation may be retried later with the same PayPal-Request-Id: either
   * it was throttled (`rateLimited`, nothing changed) or its outcome is unknown (`ambiguous`,
   * PayPal may have applied it). It does NOT mean state is unchanged; callers deciding whether
   * money may have moved must treat it as unknown, and should prefer `ambiguous`.
   */
  get retryable(): boolean {
    return this.rateLimited || this.ambiguous;
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

/**
 * PayPal answered 2xx with a body that failed schema validation. Treated as ambiguous: a
 * malformed success response to a capture or refund may still mean money moved, so callers
 * must reconcile exactly as they would after a dropped connection.
 */
export class PayPalInvalidResponseError extends PayPalAmbiguousError {
  readonly status: number;
  /** Paths of the invalid fields (never their values). */
  readonly invalidPaths: string[];
  constructor(operation: string, status: number, invalidPaths: string[]) {
    super(operation, new Error(`unexpected ${status} response (invalid: ${invalidPaths.join(", ") || "body"})`));
    this.name = "PayPalInvalidResponseError";
    this.status = status;
    this.invalidPaths = invalidPaths;
  }
}

export class PayPalNotConfiguredError extends Error {
  constructor() {
    super("PayPal is not configured. Set PAYPAL_CLIENT_ID and PAYPAL_CLIENT_SECRET.");
    this.name = "PayPalNotConfiguredError";
  }
}
