import { describe, expect, it } from "vitest";
import { PayPalApiError } from "@qm/payments";

describe("PayPalApiError classification", () => {
  it("classifies 5xx as ambiguous (PayPal may have applied the change)", () => {
    const err = new PayPalApiError(503, { name: "SERVICE_UNAVAILABLE" }, "orders.capture");
    expect(err.ambiguous).toBe(true);
    expect(err.rateLimited).toBe(false);
    // Kept for existing callers: anything not definitively rejected stays retryable.
    expect(err.retryable).toBe(true);
  });

  it("classifies 429 as rate limited, not ambiguous", () => {
    const err = new PayPalApiError(429, { name: "RATE_LIMIT_REACHED" }, "orders.capture");
    expect(err.rateLimited).toBe(true);
    expect(err.ambiguous).toBe(false);
    expect(err.retryable).toBe(true);
  });

  it("classifies 4xx rejections as definite failures", () => {
    const err = new PayPalApiError(422, { name: "UNPROCESSABLE_ENTITY", details: [{ issue: "ORDER_NOT_APPROVED" }] }, "orders.capture");
    expect(err.ambiguous).toBe(false);
    expect(err.rateLimited).toBe(false);
    expect(err.retryable).toBe(false);
    expect(err.issue).toBe("ORDER_NOT_APPROVED");
  });
});
