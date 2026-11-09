import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { PayPalCheckout } from "@/components/payments/PayPalCheckout";
import type { PayPalOneTimePaymentSessionOptions, PayPalSdkInstance } from "@/lib/paypal";
import { jsonResponse, mockFetch, payment, PUBLIC_CONFIG } from "./helpers";

vi.mock("@/components/session/SessionProvider", () => ({
  useSession: () => ({ config: PUBLIC_CONFIG }),
}));

let sessionOptions: PayPalOneTimePaymentSessionOptions | null = null;
const fakeSdk: PayPalSdkInstance = {
  findEligibleMethods: async () => ({ isEligible: () => true }),
  createPayPalOneTimePaymentSession: (options) => {
    sessionOptions = options;
    return {
      // Mirrors the SDK: wait for the order, then the buyer approves it in the popup.
      start: async (_opts, createOrder) => {
        const { orderId } = await createOrder!;
        await options.onApprove({ orderId });
      },
    };
  },
};

vi.mock("@/components/payments/usePayPalSdk", () => ({
  usePayPalSdk: () => ({ state: { status: "ready", sdk: fakeSdk }, retry: () => undefined }),
}));

describe("PayPalCheckout", () => {
  beforeEach(() => {
    sessionOptions = null;
  });

  it("reports an ambiguous capture as unknown, re-reads the payment, and retries with the same idempotency key", async () => {
    const captured = { payment: payment({ status: "COMPLETED", captured_amount_minor: 12345 }), purchase_order: { id: "po-1" } };
    const { calls } = mockFetch({
      "POST /api/v1/intents/intent-1/paypal-order": [jsonResponse({ payment: payment(), paypal_order_id: "ORDER-1" })],
      "POST /api/v1/payments/pay-1/capture": [
        new Response("<html>Bad gateway</html>", { status: 502, headers: { "content-type": "text/html" } }),
        jsonResponse(captured),
      ],
      "GET /api/v1/payments/pay-1": [jsonResponse(payment({ status: "PAYER_APPROVED" }))],
    });
    const onPayment = vi.fn();
    const onCaptured = vi.fn();
    const { container } = render(
      <PayPalCheckout intentId="intent-1" amountMinor={12345} currency="USD" onPayment={onPayment} onCaptured={onCaptured} />,
    );
    expect(sessionOptions).not.toBeNull();

    fireEvent.click(container.querySelector("paypal-button")!);

    expect(await screen.findByText("Payment outcome unknown")).toBeInTheDocument();
    expect(screen.queryByText("Payment didn't go through")).not.toBeInTheDocument();
    expect(screen.getByText(/may or may not have captured/)).toBeInTheDocument();
    expect(onCaptured).not.toHaveBeenCalled();
    await waitFor(() => expect(onPayment).toHaveBeenLastCalledWith(expect.objectContaining({ status: "PAYER_APPROVED" })));

    fireEvent.click(screen.getByRole("button", { name: "Retry capture" }));
    await waitFor(() => expect(onCaptured).toHaveBeenCalledWith(captured));
    expect(screen.queryByText("Payment outcome unknown")).not.toBeInTheDocument();

    const captures = calls.filter((c) => c.url.endsWith("/capture"));
    expect(captures).toHaveLength(2);
    expect(captures[0]!.headers["idempotency-key"]).toBeTruthy();
    expect(captures[1]!.headers["idempotency-key"]).toBe(captures[0]!.headers["idempotency-key"]);
    expect(captures[1]!.body).toEqual({ paypal_order_id: "ORDER-1" });
  });

  it("shows a definitive refusal as a failure, not as an unknown outcome", async () => {
    mockFetch({
      "POST /api/v1/intents/intent-1/paypal-order": [jsonResponse({ payment: payment(), paypal_order_id: "ORDER-1" })],
      "POST /api/v1/payments/pay-1/capture": [
        jsonResponse({ error: { code: "AMOUNT_MISMATCH", message: "The captured amount does not match." } }, 422),
      ],
    });
    const { container } = render(
      <PayPalCheckout intentId="intent-1" amountMinor={12345} currency="USD" onPayment={vi.fn()} onCaptured={vi.fn()} />,
    );
    fireEvent.click(container.querySelector("paypal-button")!);

    expect(await screen.findByText("Payment didn't go through")).toBeInTheDocument();
    expect(screen.getByText("The captured amount does not match.")).toBeInTheDocument();
    expect(screen.queryByText("Payment outcome unknown")).not.toBeInTheDocument();
  });
});
