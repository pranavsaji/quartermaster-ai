"use client";

import { SETTLED_PAYMENT_STATUSES, type ApprovalResponse, type CaptureResponse, type PaymentDto, type PurchaseOrderDto } from "@qm/contracts";
import { PayPalCheckout } from "@/components/payments/PayPalCheckout";
import { PaymentStatusPanel } from "@/components/payments/PaymentStatusPanel";
import { useSession } from "@/components/session/SessionProvider";
import { CertificatePanel } from "@/components/trustrail/CertificatePanel";
import { DecisionBadge } from "@/components/trustrail/DecisionBadge";
import { DecisionPanel } from "@/components/trustrail/DecisionPanel";
import { StatusBadge } from "@/components/ui/Badge";
import { cn } from "@/components/ui/cn";
import { CopyValue } from "@/components/ui/CopyValue";
import { Notice } from "@/components/ui/Notice";
import { SourceLabel } from "@/components/ui/SourceLabel";
import { Icons } from "@/components/shell/icons";
import { countdown, money } from "@/lib/format";
import { useNow } from "@/lib/hooks";
import { PO_STATUS_TONES } from "@/lib/labels";
import { ApprovalForm } from "./ApprovalForm";
import { ProposalLines } from "./ProposalLines";

const SETTLED_OR_SETTLING = new Set<PaymentDto["status"]>([...SETTLED_PAYMENT_STATUSES, "CAPTURE_PENDING"]);

export function isEvidenceOnly(po: PurchaseOrderDto): boolean {
  return po.status === "BLOCKED" || po.status === "SUPERSEDED";
}

export function isApprovable(po: PurchaseOrderDto): boolean {
  return po.status === "PROPOSED" && po.policy_decision !== null && po.policy_decision.decision !== "BLOCK";
}

export function ProposalCard({
  requestId,
  po,
  onChange,
  onRejected,
}: {
  requestId: string;
  po: PurchaseOrderDto;
  onChange: (po: PurchaseOrderDto) => void;
  onRejected: () => void;
}) {
  const { can } = useSession();
  const now = useNow(5000);
  const decision = po.policy_decision;
  const blocked = isEvidenceOnly(po) || decision?.decision === "BLOCK";
  const approvable = isApprovable(po);
  const cert = po.certificate;
  const certUsable = cert !== null && cert.status === "ACTIVE" && countdown(cert.expires_at, now) !== null;
  const payable =
    cert !== null &&
    (po.status === "APPROVED" || po.status === "PAYMENT_PENDING") &&
    !(po.payment && SETTLED_OR_SETTLING.has(po.payment.status));

  function handleApproved(result: ApprovalResponse) {
    onChange(result.purchase_order);
  }

  function handlePayment(payment: PaymentDto) {
    onChange({ ...po, payment });
  }

  function handleCaptured(result: CaptureResponse) {
    onChange({ ...result.purchase_order, payment: result.payment });
  }

  return (
    <article
      aria-labelledby={`po-${po.id}-title`}
      className={cn(
        "flex flex-col overflow-hidden rounded-[var(--radius-card)] border bg-surface shadow-[var(--shadow-card)]",
        blocked ? "border-block-line" : approvable ? "border-accent-line" : "border-line",
      )}
    >
      {blocked ? (
        <div className="flex items-center gap-2 bg-block px-5 py-2 text-[12.5px] font-semibold text-white">
          <Icons.shield className="size-4" strokeWidth={2} />
          TrustRail blocked this cart
          {po.status === "SUPERSEDED" ? <span className="font-normal text-white/80">· superseded, kept as evidence</span> : null}
        </div>
      ) : null}

      <header className="flex flex-wrap items-start justify-between gap-3 border-b border-line px-5 py-4">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <h3 id={`po-${po.id}-title`} className="text-[15px] font-semibold text-ink">
              {po.supplier_name}
            </h3>
            <StatusBadge status={po.status} tones={PO_STATUS_TONES} kind="Proposal" />
            {decision && !(po.status === "BLOCKED" && decision.decision === "BLOCK") ? (
              <DecisionBadge decision={decision.decision} size="sm" />
            ) : null}
          </div>
          <p className="mt-1 flex flex-wrap items-center gap-2 text-[12px] text-ink-3">
            <span className="font-mono">{po.number}</span>
            <SourceLabel source="SANDBOX_SUPPLIER">Sandbox supplier — PayPal sandbox checkout</SourceLabel>
          </p>
        </div>
        <div className="text-right">
          <p className="text-[12px] text-ink-3">Total</p>
          <p
            className={cn(
              "tnum text-[20px] font-semibold tracking-[-0.01em]",
              blocked ? "text-ink-3 line-through decoration-block/60" : "text-ink",
            )}
          >
            {money(po.total_minor, po.currency)}
          </p>
        </div>
      </header>

      <div className="space-y-4 px-5 py-4">
        <ProposalLines po={po} />

        <div className="flex flex-wrap items-center gap-2 text-[12.5px]">
          <span className="text-ink-3">Cart hash</span>
          <CopyValue value={po.cart_hash} label="cart hash" head={18} tail={10} />
        </div>

        {decision ? (
          <DecisionPanel decision={decision} />
        ) : (
          <Notice tone="neutral">TrustRail hasn&apos;t evaluated this proposal yet.</Notice>
        )}

        {approvable && can("approve") ? (
          <ApprovalForm requestId={requestId} po={po} onApproved={handleApproved} onRejected={onRejected} />
        ) : null}
        {approvable && !can("approve") ? (
          <Notice tone="info" title="Awaiting owner approval">
            Only the restaurant owner can approve, sign and pay for proposals.
          </Notice>
        ) : null}

        {cert ? <CertificatePanel certificate={cert} /> : null}

        {payable && can("pay") && cert ? (
          <section aria-label="Pay with PayPal" className="rounded-xl border border-line bg-canvas/50 p-4">
            <p className="mb-3 text-[13.5px] font-semibold text-ink">Pay with PayPal</p>
            <PayPalCheckout
              intentId={cert.id}
              amountMinor={cert.payload.approved_amount_minor}
              currency={cert.payload.currency}
              disabledReason={
                certUsable
                  ? null
                  : cert.status !== "ACTIVE"
                    ? `The certificate is ${cert.status.toLowerCase()}, so this cart can't be paid. Re-run TrustRail evaluation and approve again.`
                    : "The certificate has expired. Re-run TrustRail evaluation and approve again to pay."
              }
              onPayment={handlePayment}
              onCaptured={handleCaptured}
            />
          </section>
        ) : null}
        {payable && !can("pay") ? <Notice tone="info">Approved — waiting for the owner to pay with PayPal.</Notice> : null}

        {po.payment ? <PaymentStatusPanel payment={po.payment} delivery={po.delivery} onPayment={handlePayment} /> : null}
      </div>
    </article>
  );
}
