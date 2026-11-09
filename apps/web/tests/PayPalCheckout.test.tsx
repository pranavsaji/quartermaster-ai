import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { PayPalCheckout } from "@/components/payments/PayPalCheckout";
import type { PayPalOneTimePaymentSessionOptions, PayPalSdkInstance } from "@/lib/paypal";
import { jsonResponse, mockFetch, payment, PUBLIC_CONFIG } from "./helpers";

vi.mock("@/components/session/SessionProvider", () => ({
  useSession: () => ({ config: PUBLIC_CONFIG }),
}));

let sessionOptions: PayPalOneTimePaymentSessionOptions | null = null;
/** When set, start() rejects with this once the order promise settles, like an SDK that wraps errors. */
let sdkStartError: Error | null = null;
const fakeSdk: PayPalSdkInstance = {
  findEligibleMethods: async () => ({ isEligible: () => true }),
  createPayPalOneTimePaymentSession: (options) => {
    sessionOptions = options;
    return {
      // Mirrors the SDK: wait for the order, then the buyer approves it in the popup.
      start: async (_opts, createOrder) => {
        if (sdkStartError) {
          await createOrder!.catch(() => undefined);
          throw sdkStartError;
        }
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
    sdkStartError = null;
  });

  it("reports an ambiguous capture as unknown, re-reads the payment, and retries with the same idempotency key", async () => {
    const captured = {
      payment: payment({ status: "COMPLETED", captured_amount_minor: 12345 }),
      purchase_order: { id: "po-1", status: "PAID" },
    };
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
        jsonResponse(
          { error: { code: "INSTRUMENT_DECLINED", message: "PayPal declined the funding source.", details: { restart: true } } },
          422,
        ),
      ],
    });
    const { container } = render(
      <PayPalCheckout intentId="intent-1" amountMinor={12345} currency="USD" onPayment={vi.fn()} onCaptured={vi.fn()} />,
    );
    const button = container.querySelector("paypal-button")!;
    fireEvent.click(button);
    // While the order is being created the button is inert (unfocusable, out of the a11y tree),
    // not merely aria-disabled on a host element whose shadow-DOM button never sees it.
    expect(button.parentElement).toHaveAttribute("inert");
    expect(button).not.toHaveAttribute("aria-disabled");

    expect(await screen.findByText("Payment didn't go through")).toBeInTheDocument();
    expect(button.parentElement).not.toHaveAttribute("inert");
    expect(screen.getByText("PayPal declined the funding source.")).toBeInTheDocument();
    expect(screen.getByText(/Use the PayPal button again/)).toBeInTheDocument();
    expect(screen.queryByText("Payment outcome unknown")).not.toBeInTheDocument();
  });

  it.each(["CAPTURE_IN_PROGRESS", "IDEMPOTENCY_IN_PROGRESS"])("treats a 409 %s as an unknown outcome and starts polling", async (code) => {
    mockFetch({
      "POST /api/v1/intents/intent-1/paypal-order": [jsonResponse({ payment: payment(), paypal_order_id: "ORDER-1" })],
      "POST /api/v1/payments/pay-1/capture": [
        jsonResponse({ error: { code, message: "A capture for this payment is already in progress." } }, 409),
      ],
      "GET /api/v1/payments/pay-1": [jsonResponse(payment({ status: "CAPTURE_PENDING" }))],
    });
    const onPayment = vi.fn();
    const { container } = render(
      <PayPalCheckout intentId="intent-1" amountMinor={12345} currency="USD" onPayment={onPayment} onCaptured={vi.fn()} />,
    );
    fireEvent.click(container.querySelector("paypal-button")!);

    expect(await screen.findByText("Payment outcome unknown")).toBeInTheDocument();
    expect(screen.queryByText("Payment didn't go through")).not.toBeInTheDocument();
    // The re-read payment goes up to the card, whose PaymentStatusPanel polls it until it settles.
    await waitFor(() => expect(onPayment).toHaveBeenLastCalledWith(expect.objectContaining({ status: "CAPTURE_PENDING" })));
  });

  it("keeps the API's refusal when the SDK's start() rejects afterwards with its own error", async () => {
    sdkStartError = new Error("PayPal: createOrder failed");
    mockFetch({
      "POST /api/v1/intents/intent-1/paypal-order": [
        jsonResponse(
          { error: { code: "CERTIFICATE_EXPIRED", message: "The Intent Certificate has expired.", correlation_id: "corr-42" } },
          422,
        ),
      ],
    });
    const { container } = render(
      <PayPalCheckout intentId="intent-1" amountMinor={12345} currency="USD" onPayment={vi.fn()} onCaptured={vi.fn()} />,
    );
    fireEvent.click(container.querySelector("paypal-button")!);

    expect(await screen.findByText("The Intent Certificate has expired.")).toBeInTheDocument();
    // Let the SDK's later rejection land: it must not replace the API's reason or correlation id.
    await new Promise((resolve) => setTimeout(resolve, 10));
    expect(screen.getByText("The Intent Certificate has expired.")).toBeInTheDocument();
    expect(screen.getByText("corr-42")).toBeInTheDocument();
    expect(screen.queryByText("PayPal: createOrder failed")).not.toBeInTheDocument();
  });
});
