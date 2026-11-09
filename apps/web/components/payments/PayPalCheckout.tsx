"use client";

import type { CaptureResponse, PaymentDto } from "@qm/contracts";
import { useEffect, useEffectEvent, useRef, useState } from "react";
import { useSession } from "@/components/session/SessionProvider";
import { Button } from "@/components/ui/Button";
import { ErrorNotice } from "@/components/ui/ErrorNotice";
import { Notice } from "@/components/ui/Notice";
import { Skeleton } from "@/components/ui/Skeleton";
import { Spinner } from "@/components/ui/Spinner";
import { api } from "@/lib/api";
import { money } from "@/lib/format";
import { ApiRequestError, describeError } from "@/lib/http";
import type { PayPalOneTimePaymentSession } from "@/lib/paypal";
import { usePayPalSdk } from "./usePayPalSdk";

type Phase = "idle" | "creating" | "approving" | "capturing";

/** A capture whose outcome on the server is unknown (network failure, gateway error, 5xx). */
interface UncertainCapture {
  paymentId: string;
  orderId: string;
  reason: string;
}

function isAmbiguousFailure(error: unknown): boolean {
  return error instanceof ApiRequestError ? error.isAmbiguous : true;
}

/** A definitive decline (e.g. INSTRUMENT_DECLINED) the buyer can recover from by paying again. */
function canRestart(error: unknown): boolean {
  if (!(error instanceof ApiRequestError) || typeof error.details !== "object" || error.details === null) return false;
  return (error.details as { restart?: unknown }).restart === true;
}

/**
 * PayPal JS SDK v6 one-time payment.
 *
 * On click we synchronously call `session.start()` (so popups aren't blocked)
 * with the *pending* promise of `POST /intents/:id/paypal-order`. The API only
 * creates the PayPal order after re-verifying the signed Intent Certificate.
 * On approval we ask the API to capture; whatever status it returns is shown (a
 * CAPTURE_PENDING answer hands over to PaymentStatusPanel, which polls it).
 *
 * If the capture call fails ambiguously the money may or may not have moved:
 * we say so, re-read the payment from the API (so the status panel can poll)
 * and offer a retry that reuses the same idempotency key, so it can't double-charge.
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
  const [uncertain, setUncertain] = useState<UncertainCapture | null>(null);
  const sessionRef = useRef<PayPalOneTimePaymentSession | null>(null);
  const paymentIdRef = useRef<string | null>(null);

  const sdk = state.status === "ready" ? state.sdk : null;

  async function capture(paymentId: string, orderId: string) {
    setPhase("capturing");
    setError(null);
    setUncertain(null);
    try {
      const result = await api.payments.capture(paymentId, { paypal_order_id: orderId });
      setMessage(null);
      onCaptured(result);
    } catch (err) {
      if (!isAmbiguousFailure(err)) {
        setError(err);
        return;
      }
      setUncertain({ paymentId, orderId, reason: describeError(err) });
      try {
        onPayment(await api.payments.get(paymentId));
      } catch {
        // Still unknown: the notice offers a retry and the status panel a manual refresh.
      }
    } finally {
      setPhase("idle");
    }
  }

  const onApprove = useEffectEvent((orderId: string) => {
    const paymentId = paymentIdRef.current;
    if (!paymentId) {
      setError(new Error("PayPal approved an order, but no Quartermaster payment is in progress. Refresh and check the payment status."));
      setPhase("idle");
      return;
    }
    void capture(paymentId, orderId);
  });

  useEffect(() => {
    if (!sdk) return;
    const session = sdk.createPayPalOneTimePaymentSession({
      onApprove: ({ orderId }) => onApprove(orderId),
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
    setUncertain(null);
    setPhase("creating");

    // Deliberately NOT awaited: PayPal needs session.start() inside the click.
    const orderPromise = api.intents.createPayPalOrder(intentId).then((res) => {
      paymentIdRef.current = res.payment.id;
      onPayment(res.payment);
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
        The API has no PayPal sandbox client id, so checkout is unavailable. Approval and certificate verification still work; set the
        PayPal sandbox credentials on the API to enable payment.
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
      {uncertain ? (
        <Notice
          tone="review"
          live
          title="Payment outcome unknown"
          action={
            <Button size="sm" variant="secondary" onClick={() => void capture(uncertain.paymentId, uncertain.orderId)}>
              Retry capture
            </Button>
          }
        >
          {uncertain.reason} PayPal may or may not have captured this payment, so we&apos;re checking its status with the server. Retrying
          repeats the same capture request and can&apos;t charge you twice.
        </Notice>
      ) : null}
      <ErrorNotice error={error} title="Payment didn't go through" />
      {canRestart(error) ? (
        <p className="text-[12.5px] text-ink-2">Nothing was charged. Use the PayPal button again to choose another way to pay.</p>
      ) : null}
    </div>
  );
}
