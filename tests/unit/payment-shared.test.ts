import { describe, expect, it } from "vitest";
import { PayPalAmbiguousError, PayPalApiError, PayPalInvalidResponseError, PayPalNotConfiguredError } from "@qm/payments";
import { failureMessageFor, isAmbiguousPayPalFailure, paypalFailureCode } from "../../apps/api/src/services/payments/shared";

const apiError = (status: number, issue?: string) =>
  new PayPalApiError(status, issue ? { name: "ERR", details: [{ issue }] } : {}, "orders.capture");

describe("isAmbiguousPayPalFailure", () => {
  it("treats outcomes PayPal may have applied as ambiguous", () => {
    expect(isAmbiguousPayPalFailure(new PayPalAmbiguousError("orders.capture", new Error("socket hang up")))).toBe(true);
    expect(isAmbiguousPayPalFailure(new PayPalInvalidResponseError("orders.capture", 201, ["id"]))).toBe(true);
    expect(isAmbiguousPayPalFailure(apiError(500))).toBe(true);
    expect(isAmbiguousPayPalFailure(apiError(429))).toBe(true);
    // Already captured means money moved: reconcile, never retry blindly.
    expect(isAmbiguousPayPalFailure(apiError(422, "ORDER_ALREADY_CAPTURED"))).toBe(true);
    // Anything unrecognised is assumed ambiguous.
    expect(isAmbiguousPayPalFailure(new TypeError("fetch failed"))).toBe(true);
    expect(isAmbiguousPayPalFailure("weird")).toBe(true);
  });

  it("treats definitive rejections and missing configuration as not ambiguous", () => {
    expect(isAmbiguousPayPalFailure(apiError(422, "INSTRUMENT_DECLINED"))).toBe(false);
    expect(isAmbiguousPayPalFailure(apiError(400))).toBe(false);
    expect(isAmbiguousPayPalFailure(new PayPalNotConfiguredError())).toBe(false);
  });
});

describe("paypalFailureCode", () => {
  it("uses PayPal's issue, else the HTTP status, else a fallback", () => {
    expect(paypalFailureCode(apiError(422, "INSTRUMENT_DECLINED"), "X")).toBe("INSTRUMENT_DECLINED");
    expect(paypalFailureCode(new PayPalApiError(502, null, "orders.create"), "X")).toBe("HTTP_502");
    expect(paypalFailureCode(apiError(422, "A".repeat(100)), "X")).toHaveLength(64);
    expect(paypalFailureCode(new PayPalAmbiguousError("orders.create", new Error("timeout")), "X")).toBe("PAYPAL_UNREACHABLE");
    expect(paypalFailureCode(new Error("boom"), "ORDER_CREATE_ERROR")).toBe("ORDER_CREATE_ERROR");
  });
});

describe("failureMessageFor", () => {
  it("describes known codes for the buyer and never echoes provider text for others", () => {
    expect(failureMessageFor("INSTRUMENT_DECLINED")).toBe("PayPal declined the funding source.");
    expect(failureMessageFor("PAYER_ACTION_REQUIRED")).toBe("The buyer must complete an action in PayPal.");
    expect(failureMessageFor("PAYPAL_UNREACHABLE")).toBe("PayPal could not be reached.");
    expect(failureMessageFor("HTTP_503")).toBe("PayPal reported HTTP_503.");
  });
});
