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

/**
 * A capture whose outcome on the server is unknown: a network failure, gateway error or 5xx, or a
 * 409 saying another capture of this payment is still running.
 */
interface UncertainCapture {
  paymentId: string;
  orderId: string;
  reason: string;
}

/**
 * 409s that mean "a capture is already running", not "refused": money may be moving, so the outcome
 * is as unknown as after a timeout. (lib/idempotency keeps the key for these too.)
 */
const IN_PROGRESS_CODES = new Set(["CAPTURE_IN_PROGRESS", "IDEMPOTENCY_IN_PROGRESS"]);

function isAmbiguousCaptureFailure(error: unknown): boolean {
  if (!(error instanceof ApiRequestError)) return true;
  return error.isAmbiguous || (error.status === 409 && IN_PROGRESS_CODES.has(error.code));
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
  payment,
  onPayment,
  onCaptured,
}: {
  intentId: string;
  /** The current payment for this intent, if one exists (e.g. after a reload). */
  payment?: PaymentDto | null;
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
      if (!isAmbiguousCaptureFailure(err)) {
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

  /**
   * PayPal's SDK reports a cancel whenever its window closes without a result, including when the
   * buyer finished in a relaunched window. Ask the server what PayPal really recorded: if the buyer
   * approved, complete the payment exactly as onApprove would. Also behind "Check with PayPal".
   */
  async function recover(paymentId: string | null) {
    if (!paymentId) {
      setPhase("idle");
      setMessage("Checkout was cancelled. Nothing was charged.");
      return;
    }
    setPhase("approving");
    try {
      const synced = await api.payments.sync(paymentId);
      onPayment(synced);
      if (synced.status === "PAYER_APPROVED" && synced.paypal_order_id) {
        setMessage("PayPal shows the order as approved. Completing the payment…");
        await capture(paymentId, synced.paypal_order_id);
        return;
      }
      setMessage("Checkout was cancelled. Nothing was charged.");
    } catch {
      setMessage("The PayPal window closed. If you approved the payment, use “Check with PayPal” below.");
    }
    setPhase("idle");
  }

  const onCancel = useEffectEvent(() => void recover(paymentIdRef.current));

  useEffect(() => {
    if (!sdk) return;
    const session = sdk.createPayPalOneTimePaymentSession({
      onApprove: ({ orderId }) => onApprove(orderId),
      onCancel: () => onCancel(),
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
    let orderFailed = false;
    const orderPromise = api.intents.createPayPalOrder(intentId).then((res) => {
      paymentIdRef.current = res.payment.id;
      onPayment(res.payment);
      setPhase("approving");
      return { orderId: res.paypal_order_id };
    });
    orderPromise.catch((err: unknown) => {
      // The API's refusal (TrustRail's reason, its code and correlation id) always wins.
      orderFailed = true;
      setError(err);
      setPhase("idle");
    });

    session.start({ presentationMode: "auto" }, orderPromise).catch((err: unknown) => {
      // When the order call failed the SDK rejects too, often with a generic error that would hide
      // the API's explanation, so the SDK's error is shown only when nothing else explains the failure.
      if (!orderFailed) setError((prev: unknown) => prev ?? err);
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
      {/* The SDK's web component renders its own accessible, keyboard-operable button inside its
          shadow root, so aria-disabled on the host wouldn't reach it. While busy the wrapper is
          `inert`: the button can't be focused or activated and leaves the accessibility tree, and
          the status line below says why. Its click events bubble to the host element. */}
      <div className="relative" inert={busy} data-busy={busy || undefined}>
        <paypal-button
          type="pay"
          onClick={busy ? undefined : startCheckout}
          className={busy ? "pointer-events-none opacity-60" : undefined}
        />
        <span className="sr-only">Pay {money(amountMinor, currency)} with PayPal (sandbox).</span>
      </div>
      {busy ? (
        <p className="flex items-center gap-2 text-xs text-ink-3" role="status">
          <Spinner className="size-3.5" />
          {phase === "creating" && "Verifying the certificate and creating the PayPal order…"}
          {phase === "approving" && "Waiting for approval in the PayPal window…"}
          {phase === "capturing" && "Capturing payment on the server…"}
        </p>
      ) : (
        <p className="text-xs text-ink-3">
          PayPal sandbox — use a sandbox buyer account. The amount is fixed by the signed certificate:{" "}
          <span className="tnum font-medium text-ink-2">{money(amountMinor, currency)}</span>.
        </p>
      )}
      {message ? (
        <Notice tone="neutral" live>
          {message}
        </Notice>
      ) : null}
      {!busy && payment?.status === "PAYER_APPROVED" && payment.paypal_order_id ? (
        <Notice
          tone="review"
          title="Approved in PayPal, not yet paid"
          action={
            <Button size="sm" onClick={() => void capture(payment.id, payment.paypal_order_id!)}>
              Complete payment
            </Button>
          }
        >
          The buyer approved this order in PayPal, but the payment hasn&apos;t been captured yet. Completing it captures exactly{" "}
          {money(amountMinor, currency)}.
        </Notice>
      ) : null}
      {!busy && payment && payment.paypal_order_id && (payment.status === "ORDER_CREATED" || payment.status === "PAYER_APPROVED") ? (
        <Button size="sm" variant="secondary" onClick={() => void recover(payment.id)}>
          Check with PayPal
        </Button>
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
        <p className="text-xs text-ink-2">Nothing was charged. Use the PayPal button again to choose another way to pay.</p>
      ) : null}
    </div>
  );
}
