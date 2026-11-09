"use client";

import type { DeliveryDto, PaymentDto } from "@qm/contracts";
import { useState } from "react";
import { useSession } from "@/components/session/SessionProvider";
import { StatusBadge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { CopyValue } from "@/components/ui/CopyValue";
import { Dialog } from "@/components/ui/Dialog";
import { ErrorNotice } from "@/components/ui/ErrorNotice";
import { Field, MoneyInput, Textarea } from "@/components/ui/Field";
import { ErrorSummary, useErrorFocus } from "@/components/ui/FormErrors";
import { Notice } from "@/components/ui/Notice";
import { SourceLabel } from "@/components/ui/SourceLabel";
import { Spinner } from "@/components/ui/Spinner";
import { api } from "@/lib/api";
import { date, dateTime, inputToMinor, minorToInput, money } from "@/lib/format";
import { useAction, usePoller } from "@/lib/hooks";
import { DELIVERY_STATUS_TONES, PAYMENT_STATUS_TONES } from "@/lib/labels";

const POLLING = new Set<PaymentDto["status"]>(["CAPTURE_PENDING", "PAYER_APPROVED"]);
const REFUNDABLE = new Set<PaymentDto["status"]>(["COMPLETED", "PARTIALLY_REFUNDED"]);

/** Polls start at 2.5 s and slow down to 20 s; after ~3 minutes the owner refreshes manually. */
const POLL = { intervalMs: 2500, growth: 1.5, maxIntervalMs: 20_000, maxAttempts: 15 } as const;

/** True if `next` is not older than `current`, so a late response can't regress the status. */
export function isSameOrNewer(next: PaymentDto, current: PaymentDto): boolean {
  return Date.parse(next.updated_at) >= Date.parse(current.updated_at);
}

/**
 * Server-reported payment state. Never infers "paid" locally: while PayPal is
 * still settling (CAPTURE_PENDING) it polls `GET /payments/:id`, one request at
 * a time with backoff, and hands over to a manual refresh if it never settles.
 */
export function PaymentStatusPanel({
  payment,
  delivery,
  onPayment,
}: {
  payment: PaymentDto;
  delivery: DeliveryDto | null;
  onPayment: (payment: PaymentDto) => void;
}) {
  const { can } = useSession();
  const polling = POLLING.has(payment.status);
  const poll = usePoller(
    async (signal) => {
      const latest = await api.payments.get(payment.id, { signal });
      if (isSameOrNewer(latest, payment)) onPayment(latest);
    },
    { active: polling, ...POLL },
  );

  const refundable = REFUNDABLE.has(payment.status) && can("refund");
  const captured = payment.captured_amount_minor ?? 0;
  const remainingRefundable = Math.max(0, captured - payment.refunded_amount_minor);

  return (
    <div className="rounded-xl border border-line bg-surface p-4">
      <div className="flex flex-wrap items-center gap-2">
        <p className="text-[13.5px] font-semibold text-ink">Payment</p>
        <StatusBadge status={payment.status} tones={PAYMENT_STATUS_TONES} kind="Payment" />
        {polling && !poll.exhausted ? (
          <span className="flex items-center gap-1.5 text-[12px] text-ink-3" role="status">
            <Spinner className="size-3" /> Checking with PayPal…
          </span>
        ) : null}
        <SourceLabel source="SANDBOX_SUPPLIER" className="ml-auto">
          PayPal sandbox
        </SourceLabel>
      </div>

      <dl className="tnum mt-3 grid grid-cols-1 gap-x-6 gap-y-2 text-[13px] sm:grid-cols-2">
        <div>
          <dt className="text-[12px] text-ink-3">Amount</dt>
          <dd className="font-medium text-ink">{money(payment.amount_minor, payment.currency)}</dd>
        </div>
        <div>
          <dt className="text-[12px] text-ink-3">Captured</dt>
          <dd className="font-medium text-ink">
            {payment.captured_amount_minor !== null ? money(payment.captured_amount_minor, payment.currency) : "—"}
          </dd>
        </div>
        {payment.refunded_amount_minor > 0 ? (
          <div>
            <dt className="text-[12px] text-ink-3">Refunded</dt>
            <dd className="font-medium text-ink">{money(payment.refunded_amount_minor, payment.currency)}</dd>
          </div>
        ) : null}
        <div>
          <dt className="text-[12px] text-ink-3">PayPal capture id</dt>
          <dd>{payment.paypal_capture_id ? <CopyValue value={payment.paypal_capture_id} label="capture id" head={10} tail={4} /> : "—"}</dd>
        </div>
        <div>
          <dt className="text-[12px] text-ink-3">PayPal order id</dt>
          <dd>
            {payment.paypal_order_id ? <CopyValue value={payment.paypal_order_id} label="PayPal order id" head={10} tail={4} /> : "—"}
          </dd>
        </div>
        <div>
          <dt className="text-[12px] text-ink-3">{payment.completed_at ? "Completed" : "Updated"}</dt>
          <dd className="text-ink-2">{dateTime(payment.completed_at ?? payment.updated_at)}</dd>
        </div>
      </dl>

      {payment.failure_code || payment.failure_message ? (
        <Notice tone="block" title={payment.failure_code ?? "Payment failed"} className="mt-3">
          {payment.failure_message}
        </Notice>
      ) : null}

      {delivery ? (
        <div className="mt-3 flex flex-wrap items-center gap-2 rounded-lg border border-line bg-canvas/60 px-3 py-2 text-[13px]">
          <span className="text-ink-3">Delivery</span>
          <StatusBadge status={delivery.status} tones={DELIVERY_STATUS_TONES} kind="Delivery" />
          <span className="text-ink-2">
            expected <span className="tnum font-medium text-ink">{date(delivery.expected_date)}</span>
          </span>
          <SourceLabel source="SYNTHETIC" className="ml-auto">
            Synthetic fulfillment data
          </SourceLabel>
        </div>
      ) : null}

      {poll.exhausted ? (
        <Notice
          tone="review"
          live
          title="PayPal is still settling this payment"
          className="mt-3"
          action={
            <Button size="sm" variant="secondary" onClick={poll.restart}>
              Refresh status
            </Button>
          }
        >
          We stopped checking automatically. Nothing is charged twice by refreshing; it only asks the server for the latest status.
        </Notice>
      ) : polling ? (
        <ErrorNotice error={poll.error} title="Couldn't refresh payment status — retrying" className="mt-3" />
      ) : null}

      {refundable && remainingRefundable > 0 ? (
        <RefundAction payment={payment} maxMinor={remainingRefundable} onPayment={onPayment} />
      ) : null}
    </div>
  );
}

function RefundAction({
  payment,
  maxMinor,
  onPayment,
}: {
  payment: PaymentDto;
  maxMinor: number;
  onPayment: (payment: PaymentDto) => void;
}) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <div className="mt-3">
        <Button size="sm" variant="secondary" onClick={() => setOpen(true)}>
          Refund…
        </Button>
      </div>
      {open ? <RefundDialog payment={payment} maxMinor={maxMinor} onPayment={onPayment} onClose={() => setOpen(false)} /> : null}
    </>
  );
}

/** Mounted per opening, so the default amount is what is refundable *now* (after any partial refund). */
function RefundDialog({
  payment,
  maxMinor,
  onPayment,
  onClose,
}: {
  payment: PaymentDto;
  maxMinor: number;
  onPayment: (payment: PaymentDto) => void;
  onClose: () => void;
}) {
  const [amount, setAmount] = useState(() => minorToInput(maxMinor, payment.currency));
  const [reason, setReason] = useState("");
  const [errors, setErrors] = useState<{ amount?: string; reason?: string }>({});
  const { containerRef, focusFirstError, attempt } = useErrorFocus();
  const refund = useAction(async (amountMinor: number | undefined) => {
    const res = await api.payments.refund(payment.id, { amount_minor: amountMinor, reason: reason.trim() });
    onPayment(res.payment);
    onClose();
  });

  function submit() {
    const next: typeof errors = {};
    const minor = inputToMinor(amount, payment.currency);
    if (minor === null || minor <= 0 || minor > maxMinor) {
      next.amount = `Enter an amount between ${money(1, payment.currency)} and ${money(maxMinor, payment.currency)}.`;
    }
    if (!reason.trim()) next.reason = "Say why you're refunding.";
    setErrors(next);
    if (minor === null || Object.keys(next).length > 0) {
      focusFirstError();
      return;
    }
    void refund.run(minor === maxMinor ? undefined : minor);
  }

  return (
    <Dialog
      open
      onClose={onClose}
      title="Refund payment"
      description={`Up to ${money(maxMinor, payment.currency)} can be refunded through PayPal sandbox.`}
      size="sm"
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button variant="danger" onClick={submit} loading={refund.pending}>
            Issue refund
          </Button>
        </>
      }
    >
      <div ref={containerRef} className="space-y-4">
        <Field label="Amount" required error={errors.amount}>
          {(control) => <MoneyInput {...control} currency={payment.currency} value={amount} onChange={(e) => setAmount(e.target.value)} />}
        </Field>
        <Field label="Reason" required error={errors.reason}>
          {(control) => (
            <Textarea {...control} value={reason} onChange={(e) => setReason(e.target.value)} maxLength={255} className="min-h-16" />
          )}
        </Field>
        <ErrorSummary key={attempt} messages={[errors.amount, errors.reason]} />
        <ErrorNotice error={refund.error} />
      </div>
    </Dialog>
  );
}
