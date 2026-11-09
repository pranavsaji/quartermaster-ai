"use client";

import Link from "next/link";
import type { DeliveryDto, PurchaseOrderDto } from "@qm/contracts";
import { StatusBadge } from "@/components/ui/Badge";
import { Card, CardBody, CardHeader } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";
import { ErrorNotice } from "@/components/ui/ErrorNotice";
import { SkeletonRows } from "@/components/ui/Skeleton";
import { SourceLabel } from "@/components/ui/SourceLabel";
import { date, relativeTime } from "@/lib/format";
import { DELIVERY_STATUS_TONES, OPEN_DELIVERY_STATUSES } from "@/lib/labels";

export function UpcomingDeliveries({
  deliveries,
  orders,
  error,
  onRetry,
}: {
  deliveries: DeliveryDto[] | undefined;
  /** Optional, used to show PO numbers / supplier names. */
  orders?: PurchaseOrderDto[];
  error: unknown;
  onRetry: () => void;
}) {
  const poById = new Map((orders ?? []).map((o) => [o.id, o]));
  const upcoming = deliveries
    ?.filter((d) => OPEN_DELIVERY_STATUSES.has(d.status))
    .sort((a, b) => a.expected_date.localeCompare(b.expected_date))
    .slice(0, 6);

  return (
    <Card aria-labelledby="deliveries-title">
      <CardHeader
        id="deliveries-title"
        title="Upcoming deliveries"
        actions={
          <>
            <SourceLabel source="SYNTHETIC">Synthetic fulfillment data</SourceLabel>
            <Link href="/orders" className="text-[13px] font-medium text-accent hover:underline">
              Orders
            </Link>
          </>
        }
      />
      <CardBody>
        {error && !deliveries ? <ErrorNotice error={error} onRetry={onRetry} /> : null}
        {!upcoming && !error ? <SkeletonRows rows={3} /> : null}
        {upcoming && upcoming.length === 0 ? (
          <EmptyState compact title="No deliveries on the way" description="Paid orders will appear here." />
        ) : null}
        {upcoming && upcoming.length > 0 ? (
          <ul className="divide-y divide-line">
            {upcoming.map((d) => {
              const po = poById.get(d.purchase_order_id);
              const slipped = d.expected_date !== d.original_expected_date;
              return (
                <li key={d.id} className="flex items-center justify-between gap-3 py-2.5 first:pt-0 last:pb-0">
                  <div className="min-w-0">
                    <p className="truncate text-[13.5px] font-medium text-ink">
                      {po ? `${po.number} · ${po.supplier_name}` : `Delivery ${d.id.slice(0, 8)}`}
                    </p>
                    <p className="text-[12.5px] text-ink-3">
                      Expected <span className="tnum font-medium text-ink-2">{date(d.expected_date)}</span>{" "}
                      <span className="text-ink-4">({relativeTime(d.expected_date)})</span>
                      {slipped ? <span className="text-review"> · was {date(d.original_expected_date)}</span> : null}
                    </p>
                    {d.delay_reason ? <p className="text-[12px] text-review">{d.delay_reason}</p> : null}
                  </div>
                  <StatusBadge status={d.status} tones={DELIVERY_STATUS_TONES} kind="Delivery" />
                </li>
              );
            })}
          </ul>
        ) : null}
      </CardBody>
    </Card>
  );
}
