import { describe, expect, it } from "vitest";
import { api } from "@/lib/api";
import { ApiRequestError } from "@/lib/http";
import {
  ensureShape,
  isApprovalResponse,
  isCaptureResponse,
  isPayment,
  isPayPalOrderResponse,
  isRefundResponse,
} from "@/lib/response-guards";
import { jsonResponse, mockFetch, payment } from "./helpers";

describe("response guards", () => {
  it("accept the shapes the console relies on", () => {
    expect(isPayment(payment())).toBe(true);
    expect(isPayPalOrderResponse({ payment: payment(), paypal_order_id: "ORDER-1" })).toBe(true);
    expect(isCaptureResponse({ payment: payment(), purchase_order: { id: "po-1", status: "PAID" } })).toBe(true);
    expect(isRefundResponse({ payment: payment({ status: "REFUNDED" }) })).toBe(true);
    expect(isApprovalResponse({ purchase_order: { id: "po-1", status: "APPROVED" }, certificate: { id: "intent-1" } })).toBe(true);
  });

  it("reject what would make the console show a state it doesn't know", () => {
    expect(isPayment({ ...payment(), status: "PAID_MAYBE" })).toBe(false);
    expect(isPayment({ ...payment(), amount_minor: 12.5 })).toBe(false);
    expect(isPayment("<html>")).toBe(false);
    expect(isPayPalOrderResponse({ payment: payment(), paypal_order_id: "" })).toBe(false);
    expect(isCaptureResponse({ payment: payment() })).toBe(false);
    expect(isApprovalResponse({ purchase_order: { id: "po-1", status: "APPROVED" }, certificate: "signed" })).toBe(false);
  });

  it("report a mismatch as an ambiguous, readable error", () => {
    expect(() => ensureShape({}, isPayment, "a payment")).toThrow(ApiRequestError);
    try {
      ensureShape({}, isPayment, "a payment");
    } catch (err) {
      expect(err).toMatchObject({ status: 502, code: "UNEXPECTED_RESPONSE", isAmbiguous: true });
      expect((err as Error).message).toContain("a payment");
    }
  });
});

describe("guarded API calls", () => {
  it("keeps the idempotency key when a capture answer can't be read, so the retry is the same action", async () => {
    const { calls } = mockFetch({
      "POST /api/v1/payments/pay-9/capture": [
        jsonResponse({ ok: true }),
        jsonResponse({ payment: payment({ id: "pay-9", status: "COMPLETED" }), purchase_order: { id: "po-1", status: "PAID" } }),
      ],
    });
    await expect(api.payments.capture("pay-9", { paypal_order_id: "ORDER-9" })).rejects.toMatchObject({ code: "UNEXPECTED_RESPONSE" });
    await expect(api.payments.capture("pay-9", { paypal_order_id: "ORDER-9" })).resolves.toMatchObject({
      payment: { status: "COMPLETED" },
    });
    expect(calls[1]!.headers["idempotency-key"]).toBe(calls[0]!.headers["idempotency-key"]);
  });

  it("checks a payment read", async () => {
    mockFetch({ "GET /api/v1/payments/pay-1": [jsonResponse({ id: "pay-1" })] });
    await expect(api.payments.get("pay-1")).rejects.toMatchObject({ code: "UNEXPECTED_RESPONSE" });
  });
});
