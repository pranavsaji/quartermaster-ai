import { describe, expect, it } from "vitest";
import { formatUnitPrice } from "../../apps/api/src/services/procurement/research";
import { minorSum } from "../../apps/api/src/services/analytics";
import { isApprovableRequestStatus } from "../../apps/api/src/services/procurement/status";
import { isCommittedOrder, isPayableOrder, isPreCapturePayment, isSettledPayment } from "@qm/contracts";

describe("formatUnitPrice", () => {
  it("formats fractional minor units per unit in the request's currency", () => {
    expect(formatUnitPrice(4.375, "USD")).toBe("$0.0438");
    expect(formatUnitPrice(32, "USD")).toBe("$0.32");
    expect(formatUnitPrice(4.375, "EUR")).toBe("€0.0438");
    // A zero-decimal currency: the minor unit is the major unit.
    expect(formatUnitPrice(4.375, "JPY")).toBe("¥4.38");
  });
});

describe("minorSum", () => {
  it("converts PostgreSQL bigint sums (strings) to exact numbers", () => {
    expect(minorSum("12345")).toBe(12_345);
    expect(minorSum(0)).toBe(0);
    expect(minorSum(null)).toBe(0);
    expect(minorSum(undefined)).toBe(0);
    expect(() => minorSum("90071992547409930")).toThrow(/safe integer/);
    expect(() => minorSum("12.5")).toThrow(/safe integer/);
  });
});

describe("status predicates", () => {
  it("narrow plain strings to their status groups", () => {
    expect(isCommittedOrder("PAID")).toBe(true);
    expect(isCommittedOrder("PROPOSED")).toBe(false);
    expect(isPayableOrder("PAYMENT_PENDING")).toBe(true);
    expect(isPayableOrder("PAID")).toBe(false);
    expect(isPreCapturePayment("PAYER_APPROVED")).toBe(true);
    expect(isPreCapturePayment("CAPTURE_PENDING")).toBe(false);
    expect(isSettledPayment("PARTIALLY_REFUNDED")).toBe(true);
    expect(isSettledPayment("FAILED")).toBe(false);
    expect(isApprovableRequestStatus("READY_FOR_REVIEW")).toBe(true);
    expect(isApprovableRequestStatus("FAILED")).toBe(false);
  });
});
