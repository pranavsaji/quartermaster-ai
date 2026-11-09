"use client";

import type { PaymentDto } from "@qm/contracts";
import { useEffect, useRef, useState } from "react";
import { useSession } from "@/components/session/SessionProvider";
import { Button } from "@/components/ui/Button";
import { ErrorNotice } from "@/components/ui/ErrorNotice";
import { Notice } from "@/components/ui/Notice";
import { Skeleton } from "@/components/ui/Skeleton";
import { Spinner } from "@/components/ui/Spinner";
import { api, type CaptureResponse } from "@/lib/api";
import { money } from "@/lib/format";
import type { PayPalOneTimePaymentSession } from "@/lib/paypal";
import { usePayPalSdk } from "./usePayPalSdk";

type Phase = "idle" | "creating" | "approving" | "capturing";

/**
 * PayPal JS SDK v6 one-time payment.
 *
 * On click we synchronously call `session.start()` (so popups aren't blocked)
 * with the *pending* promise of `POST /intents/:id/paypal-order`. The API only
 * creates the PayPal order after re-verifying the signed Intent Certificate.
 * On approval we ask the API to capture; whatever status it returns is shown.
 */
export function PayPalCheckout({
  intentId,
  amountMinor,
  currency,
  disabledReason,
  onPayment,
  onCaptured,
}: {
  intentId: string;
  amountMinor: number;
  currency: string;
  /** When set, the button is not offered and this reason is shown instead. */
  disabledReason?: string | null;
  onPayment: (payment: PaymentDto) => void;
  onCaptured: (result: CaptureResponse) => void;
}) {
  const { config } = useSession();
  const { state, retry } = usePayPalSdk(config.paypal, currency);
  const [phase, setPhase] = useState<Phase>("idle");
  const [error, setError] = useState<unknown>(null);
  const [message, setMessage] = useState<string | null>(null);
  const sessionRef = useRef<PayPalOneTimePaymentSession | null>(null);
  const paymentIdRef = useRef<string | null>(null);
  const callbacks = useRef({ onPayment, onCaptured });
  callbacks.current = { onPayment, onCaptured };

  const sdk = state.status === "ready" ? state.sdk : null;

  useEffect(() => {
    if (!sdk) return;
    const session = sdk.createPayPalOneTimePaymentSession({
      onApprove: async ({ orderId }) => {
        const paymentId = paymentIdRef.current;
        if (!paymentId) {
          setError(new Error("PayPal approved an order, but no Quartermaster payment is in progress. Refresh and check the payment status."));
          setPhase("idle");
          return;
        }
        setPhase("capturing");
        try {
          const result = await api.payments.capture(paymentId, { paypal_order_id: orderId });
          callbacks.current.onCaptured(result);
          setMessage(null);
        } catch (err) {
          setError(err);
        } finally {
          setPhase("idle");
        }
      },
      onCancel: () => {
        setPhase("idle");
        setMessage("Checkout was cancelled. Nothing was charged.");
      },
      onError: (err) => {
        setPhase("idle");
        setError(err instanceof Error ? err : new Error("PayPal reported an error during checkout."));
      },
    });
    sessionRef.current = session;
    return () => {
      sessionRef.current = null;
      session.destroy?.();
    };
  }, [sdk, intentId]);

  function startCheckout() {
    const session = sessionRef.current;
    if (!session || phase !== "idle") return;
    setError(null);
    setMessage(null);
    setPhase("creating");

    // Deliberately NOT awaited: PayPal needs session.start() inside the click.
    const orderPromise = api.intents.createPayPalOrder(intentId).then((res) => {
      paymentIdRef.current = res.payment.id;
      callbacks.current.onPayment(res.payment);
      setPhase("approving");
      return { orderId: res.paypal_order_id };
    });
    orderPromise.catch((err: unknown) => {
      setError(err);
      setPhase("idle");
    });

    session.start({ presentationMode: "auto" }, orderPromise).catch((err: unknown) => {
      setError(err);
      setPhase("idle");
    });
  }

  if (disabledReason) {
    return <Notice tone="neutral">{disabledReason}</Notice>;
  }

  if (state.status === "disabled") {
    return (
      <Notice tone="review" title="PayPal sandbox not configured">
        The API has no PayPal sandbox client id, so checkout is unavailable. Approval and certificate verification still
        work; set the PayPal sandbox credentials on the API to enable payment.
      </Notice>
    );
  }

  if (state.status === "loading") {
    return (
      <div role="status" aria-label="Loading PayPal">
        <Skeleton className="h-11 w-full rounded-full" />
      </div>
    );
  }

  if (state.status === "ineligible") {
    return (
      <Notice tone="review" title="PayPal isn't available for this checkout">
        PayPal reported this buyer/currency as ineligible ({currency}).
      </Notice>
    );
  }

  if (state.status === "error") {
    return (
      <Notice
        tone="block"
        title="PayPal SDK failed to load"
        action={
          <Button size="sm" onClick={retry}>
            Retry
          </Button>
        }
      >
        {state.error instanceof Error ? state.error.message : "Unknown error loading the PayPal SDK."}
      </Notice>
    );
  }

  const busy = phase !== "idle";
  return (
    <div className="space-y-3">
      <div className="relative">
        {/* The SDK's web component renders its own accessible, keyboard-operable button;
            its click events bubble to the host element. */}
        <paypal-button
          type="pay"
          aria-disabled={busy || undefined}
          onClick={busy ? undefined : startCheckout}
          className={busy ? "pointer-events-none opacity-60" : undefined}
        />
        <span className="sr-only">Pay {money(amountMinor, currency)} with PayPal (sandbox).</span>
      </div>
      {busy ? (
        <p className="flex items-center gap-2 text-[12.5px] text-ink-3" role="status">
          <Spinner className="size-3.5" />
          {phase === "creating" && "Verifying the certificate and creating the PayPal order…"}
          {phase === "approving" && "Waiting for approval in the PayPal window…"}
          {phase === "capturing" && "Capturing payment on the server…"}
        </p>
      ) : (
        <p className="text-[12px] text-ink-3">
          PayPal sandbox — use a sandbox buyer account. The amount is fixed by the signed certificate:{" "}
          <span className="tnum font-medium text-ink-2">{money(amountMinor, currency)}</span>.
        </p>
      )}
      {message ? (
        <Notice tone="neutral" live>
          {message}
        </Notice>
      ) : null}
      <ErrorNotice error={error} title="Payment didn't go through" />
    </div>
  );
}
