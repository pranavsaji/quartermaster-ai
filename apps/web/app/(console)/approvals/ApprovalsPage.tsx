"use client";

import { SETTLED_PAYMENT_STATUSES, type PurchaseOrderDto } from "@qm/contracts";
import { useMemo } from "react";
import { useSession } from "@/components/session/SessionProvider";
import { DecisionBadge } from "@/components/trustrail/DecisionBadge";
import { Badge, StatusBadge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { ButtonLink } from "@/components/ui/ButtonLink";
import { Card, CardHeader } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";
import { LoadMore } from "@/components/ui/LoadMore";
import { Notice } from "@/components/ui/Notice";
import { PageHeader } from "@/components/ui/PageHeader";
import { ResourceView } from "@/components/ui/ResourceView";
import { SkeletonRows } from "@/components/ui/Skeleton";
import { SourceLabel } from "@/components/ui/SourceLabel";
import { api } from "@/lib/api";
import { countdown, money, plural, relativeTime } from "@/lib/format";
import { useNow, usePagedResource } from "@/lib/hooks";
import { PO_STATUS_TONES } from "@/lib/labels";

/** Statuses that wait on the owner; the API filters by them so older items are never crowded out. */
const AWAITING_STATUSES = ["PROPOSED", "APPROVED", "PAYMENT_PENDING"] as const satisfies readonly PurchaseOrderDto["status"][];
const AWAITING = new Set<PurchaseOrderDto["status"]>(AWAITING_STATUSES);
const SETTLED = new Set<string>(SETTLED_PAYMENT_STATUSES);

type Stage = "review" | "pay";

function stageOf(po: PurchaseOrderDto): Stage {
  return po.status === "PROPOSED" ? "review" : "pay";
}

function nextAction(po: PurchaseOrderDto): string {
  if (po.status === "PROPOSED") {
    const reviews = po.policy_decision?.violations.filter((v) => v.severity === "REVIEW").length ?? 0;
    return reviews > 0 ? `Review & approve (${plural(reviews, "item")} to acknowledge)` : "Review & approve";
  }
  if (po.payment?.status === "CAPTURE_PENDING") return "Payment settling with PayPal";
  return "Pay with PayPal";
}

function ApprovalRow({ po, now }: { po: PurchaseOrderDto; now: number }) {
  const href = po.request_id ? `/procurement/${po.request_id}#proposals` : null;
  const certLeft = po.certificate ? countdown(po.certificate.expires_at, now) : null;
  const blockedDecision = po.policy_decision?.decision === "BLOCK";
  return (
    <li className="flex flex-wrap items-center gap-x-4 gap-y-2 px-5 py-4">
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <p className="text-[14px] font-semibold text-ink">{po.supplier_name}</p>
          <StatusBadge status={po.status} tones={PO_STATUS_TONES} kind="Proposal" />
          {po.policy_decision ? <DecisionBadge decision={po.policy_decision.decision} size="sm" /> : null}
        </div>
        <p className="mt-1 flex flex-wrap items-center gap-2 text-[12.5px] text-ink-3">
          <span className="font-mono">{po.number}</span>
          <span>· {plural(po.items.filter((i) => i.kind === "PRODUCT").length, "product")}</span>
          <span>· proposed {relativeTime(po.created_at)}</span>
          {po.certificate ? (
            <span className={certLeft ? "text-ink-2" : "text-block"}>· certificate {certLeft ? `expires in ${certLeft}` : "expired"}</span>
          ) : null}
          <SourceLabel source="SANDBOX_SUPPLIER" />
        </p>
      </div>
      <p className="tnum text-right text-[16px] font-semibold text-ink">{money(po.total_minor, po.currency)}</p>
      <div className="flex w-full items-center justify-between gap-3 sm:w-auto">
        <span className="text-[12.5px] text-ink-3 sm:hidden">{nextAction(po)}</span>
        {href ? (
          <ButtonLink href={href} size="sm" variant={blockedDecision ? "secondary" : "primary"}>
            {po.status === "PROPOSED" ? "Review" : "Open"}
          </ButtonLink>
        ) : (
          <Badge tone="neutral">No linked request</Badge>
        )}
      </div>
      <p className="hidden w-full text-[12.5px] text-ink-3 sm:block">Next: {nextAction(po)}</p>
    </li>
  );
}

export function ApprovalsPage() {
  const { can } = useSession();
  const now = useNow(5000);
  const orders = usePagedResource(
    (cursor, signal) => api.purchaseOrders.list({ limit: 100, cursor, statuses: AWAITING_STATUSES }, { signal }),
    [],
  );

  const awaiting = useMemo(
    () =>
      (orders.items ?? [])
        .filter((po) => AWAITING.has(po.status))
        .filter((po) => !(po.payment && SETTLED.has(po.payment.status)))
        .sort((a, b) => a.created_at.localeCompare(b.created_at)),
    [orders.items],
  );
  const groups: Record<Stage, PurchaseOrderDto[]> = { review: [], pay: [] };
  for (const po of awaiting) groups[stageOf(po)].push(po);

  return (
    <>
      <PageHeader
        title="Approvals"
        description="Every proposal waiting on the owner, across all requests. Each supplier cart is approved and paid on its own."
        actions={
          <Button variant="secondary" onClick={orders.reload} loading={orders.refreshing}>
            Refresh
          </Button>
        }
      />

      {!can("approve") ? (
        <Notice tone="info" className="mb-6" title="Read-only">
          Only the owner can approve, sign and pay. You can review what&apos;s waiting.
        </Notice>
      ) : null}

      <ResourceView resource={orders} hasData={Boolean(orders.items)} className="mb-6" />

      <div className="space-y-6">
        {(
          [
            ["review", "Awaiting approval", "TrustRail has evaluated these carts. Review violations, acknowledge review items and sign."],
            ["pay", "Approved — awaiting payment", "Signed Intent Certificates ready for PayPal sandbox checkout."],
          ] as const
        ).map(([stage, title, description]) => (
          <Card key={stage} aria-labelledby={`stage-${stage}`}>
            <CardHeader
              id={`stage-${stage}`}
              title={title}
              description={description}
              actions={orders.items ? <Badge tone={groups[stage].length > 0 ? "accent" : "neutral"}>{groups[stage].length}</Badge> : null}
            />
            {!orders.items && !orders.error ? (
              <div className="p-5">
                <SkeletonRows rows={2} />
              </div>
            ) : groups[stage].length === 0 ? (
              <EmptyState
                compact
                title="Nothing waiting"
                description={stage === "review" ? "No proposals need approval." : "No approved carts awaiting payment."}
              />
            ) : (
              <ul className="divide-y divide-line">
                {groups[stage].map((po) => (
                  <ApprovalRow key={po.id} po={po} now={now} />
                ))}
              </ul>
            )}
          </Card>
        ))}
        <LoadMore state={orders} noun="proposals awaiting you (newest first)" />
      </div>
    </>
  );
}
