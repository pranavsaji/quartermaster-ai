"use client";

import Link from "next/link";
import type { InventoryItemDto } from "@qm/contracts";
import { useSession } from "@/components/session/SessionProvider";
import { StatusBadge } from "@/components/ui/Badge";
import { ButtonLink } from "@/components/ui/ButtonLink";
import { Card, CardBody, CardHeader } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";
import { ResourceView, type ResourceLike } from "@/components/ui/ResourceView";
import { SkeletonRows } from "@/components/ui/Skeleton";
import { SourceLabel } from "@/components/ui/SourceLabel";
import { num } from "@/lib/format";
import { lookup, STOCK_LABELS, STOCK_TONES, stockSeverity } from "@/lib/labels";

export function sortByUrgency(items: InventoryItemDto[]): InventoryItemDto[] {
  return [...items].sort(
    (a, b) =>
      stockSeverity(a.status) - stockSeverity(b.status) ||
      (a.days_of_cover ?? Number.POSITIVE_INFINITY) - (b.days_of_cover ?? Number.POSITIVE_INFINITY),
  );
}

/** Bar fill per stock status: the same tone as the item's status pill beside it. */
const COVER_FILL: Record<InventoryItemDto["status"], string> = { OK: "bg-allow", LOW: "bg-review", CRITICAL: "bg-block", OUT: "bg-block" };

function CoverBar({ days, leadTime, status }: { days: number | null; leadTime: number; status: InventoryItemDto["status"] }) {
  if (days === null) return <span className="text-ink-4">—</span>;
  const horizon = Math.max(leadTime * 2, 7);
  const pctWidth = Math.max(4, Math.min(100, (days / horizon) * 100));
  const tone = lookup(COVER_FILL, status, "bg-ink-4");
  return (
    <div className="flex items-center gap-2">
      <div className="h-1.5 w-16 overflow-hidden rounded-full bg-ink/[0.06]" aria-hidden>
        <div className={`h-full ${tone}`} style={{ width: `${pctWidth}%` }} />
      </div>
      <span className="tnum text-sm text-ink-2">{num(days, 1)} d</span>
    </div>
  );
}

export function LowStockList({ items, resource }: { items: InventoryItemDto[] | undefined; resource: ResourceLike }) {
  const { can } = useSession();
  const low = items ? sortByUrgency(items.filter((i) => i.status !== "OK")).slice(0, 8) : undefined;
  const source = items?.[0]?.data_source;
  return (
    <Card aria-labelledby="low-stock-title">
      <CardHeader
        id="low-stock-title"
        title="Low stock"
        description="Items below their reorder point, most urgent first."
        actions={
          <>
            {source ? <SourceLabel source={source} /> : null}
            <Link href="/inventory" className="text-sm font-medium text-accent hover:underline">
              Inventory
            </Link>
          </>
        }
      />
      <CardBody className="pt-2">
        <ResourceView resource={resource} hasData={Boolean(items)} loading={<SkeletonRows rows={4} className="pt-2" />} />
        {low && low.length === 0 ? (
          <EmptyState
            compact
            icon="inventory"
            title="Everything is above its reorder point"
            description="Nothing needs restocking right now."
          />
        ) : null}
        {low && low.length > 0 ? (
          <table className="w-full text-left text-sm">
            <thead className="text-xs text-ink-3">
              <tr>
                <th scope="col" className="py-2 font-medium">
                  Item
                </th>
                <th scope="col" className="py-2 text-right font-medium">
                  Available
                </th>
                <th scope="col" className="hidden py-2 pl-4 font-medium sm:table-cell">
                  Days of cover
                </th>
                <th scope="col" className="py-2 text-right font-medium">
                  Status
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {low.map((item) => (
                <tr key={item.id}>
                  <td className="py-2.5 pr-3">
                    <p className="font-medium text-ink">{item.name}</p>
                    <p className="font-mono text-2xs text-ink-4">{item.sku}</p>
                  </td>
                  <td className="tnum py-2.5 text-right text-ink-2">
                    {num(item.available)} <span className="text-ink-4">{item.unit}</span>
                  </td>
                  <td className="hidden py-2.5 pl-4 sm:table-cell">
                    <CoverBar days={item.days_of_cover} leadTime={item.lead_time_days} status={item.status} />
                  </td>
                  <td className="py-2.5 text-right">
                    <StatusBadge status={item.status} tones={STOCK_TONES} labels={STOCK_LABELS} kind="Stock" />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : null}
        {low && low.length > 0 && can("createRequest") ? (
          <div className="mt-4">
            <ButtonLink href="/procurement?compose=1" variant="primary">
              Restock with Quartermaster
            </ButtonLink>
          </div>
        ) : null}
      </CardBody>
    </Card>
  );
}
