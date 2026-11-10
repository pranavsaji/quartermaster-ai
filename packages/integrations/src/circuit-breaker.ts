/**
 * A small consecutive-failure circuit breaker for outbound provider calls (OpenAI, Channel3).
 *
 * After `threshold` consecutive provider failures the breaker opens for `cooldownMs`: callers skip
 * the provider and use their deterministic fallback straight away, instead of every research run
 * waiting out a timeout against a provider that is down. After the cooldown one trial call is let
 * through (half-open); its success closes the breaker, its failure re-opens it for another
 * cooldown. Only provider-side failures count (network errors, timeouts, 429 and 5xx), never a
 * caller's own abort or an unusable model answer. `threshold: 0` disables the breaker.
 */

export interface CircuitBreakerOptions {
  /** Consecutive failures that open the breaker; 0 disables it. */
  threshold: number;
  cooldownMs: number;
  /** Monotonic-enough clock in milliseconds (injected by tests). */
  now?: () => number;
  /** Called when the breaker opens or closes. Must not throw. */
  onChange?: (state: "open" | "closed", failures: number) => void;
}

export type CircuitState = "closed" | "open" | "half_open";

export class CircuitBreaker {
  private failures = 0;
  private openedAt: number | null = null;
  private trialInFlight = false;
  private readonly now: () => number;

  constructor(private readonly options: CircuitBreakerOptions) {
    this.now = options.now ?? Date.now;
  }

  get state(): CircuitState {
    if (this.openedAt === null) return "closed";
    return this.now() - this.openedAt >= this.options.cooldownMs ? "half_open" : "open";
  }

  /** Whether a call may go to the provider now. In half-open state only one trial call is allowed. */
  allow(): boolean {
    if (this.options.threshold <= 0) return true;
    const state = this.state;
    if (state === "closed") return true;
    if (state === "open" || this.trialInFlight) return false;
    this.trialInFlight = true;
    return true;
  }

  success(): void {
    const wasOpen = this.openedAt !== null;
    this.failures = 0;
    this.openedAt = null;
    this.trialInFlight = false;
    if (wasOpen) this.notify("closed");
  }

  failure(): void {
    if (this.options.threshold <= 0) return;
    this.failures++;
    const trial = this.trialInFlight;
    this.trialInFlight = false;
    if (trial || (this.openedAt === null && this.failures >= this.options.threshold)) {
      this.openedAt = this.now();
      this.notify("open");
    }
  }

  /** A call that ended without saying anything about the provider's health (e.g. aborted by the caller). */
  neutral(): void {
    this.trialInFlight = false;
  }

  private notify(state: "open" | "closed"): void {
    try {
      this.options.onChange?.(state, this.failures);
    } catch {
      // Observability must never break the call path.
    }
  }
}

/** True for HTTP statuses that indicate the provider (not the request) is failing. */
export function isProviderFailureStatus(status: number | null): boolean {
  return status === null || status === 429 || status >= 500;
}
