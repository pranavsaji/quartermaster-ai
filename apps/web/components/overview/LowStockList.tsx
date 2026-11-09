"use client";

import Link from "next/link";
import type { InventoryItemDto } from "@qm/contracts";
import { useSession } from "@/components/session/SessionProvider";
import { StatusBadge } from "@/components/ui/Badge";
import { Card, CardBody, CardHeader } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";
import { ErrorNotice } from "@/components/ui/ErrorNotice";
import { SkeletonRows } from "@/components/ui/Skeleton";
import { SourceLabel } from "@/components/ui/SourceLabel";
import { num } from "@/lib/format";
import { STOCK_LABELS, STOCK_TONES } from "@/lib/labels";

const SEVERITY_ORDER: Record<InventoryItemDto["status"], number> = { OUT: 0, CRITICAL: 1, LOW: 2, OK: 3 };

export function sortByUrgency(items: InventoryItemDto[]): InventoryItemDto[] {
  return [...items].sort(
    (a, b) =>
      SEVERITY_ORDER[a.status] - SEVERITY_ORDER[b.status] ||
      (a.days_of_cover ?? Number.POSITIVE_INFINITY) - (b.days_of_cover ?? Number.POSITIVE_INFINITY),
  );
}

function CoverBar({ days, leadTime }: { days: number | null; leadTime: number }) {
  if (days === null) return <span className="text-ink-4">—</span>;
  const horizon = Math.max(leadTime * 2, 7);
  const pctWidth = Math.max(4, Math.min(100, (days / horizon) * 100));
  const tone = days <= leadTime ? "bg-block" : days <= leadTime * 1.5 ? "bg-review" : "bg-allow";
  return (
    <div className="flex items-center gap-2">
      <div className="h-1.5 w-16 overflow-hidden rounded-full bg-ink/[0.06]" aria-hidden>
        <div className={`h-full ${tone}`} style={{ width: `${pctWidth}%` }} />
      </div>
      <span className="tnum text-[13px] text-ink-2">{num(days, 1)} d</span>
    </div>
  );
}

export function LowStockList({
  items,
  error,
  onRetry,
}: {
  items: InventoryItemDto[] | undefined;
  error: unknown;
  onRetry: () => void;
}) {
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
            <Link href="/inventory" className="text-[13px] font-medium text-accent hover:underline">
              Inventory
            </Link>
          </>
        }
      />
      <CardBody className="pt-2">
        {error && !items ? <ErrorNotice error={error} onRetry={onRetry} /> : null}
        {!low && !error ? <SkeletonRows rows={4} className="pt-2" /> : null}
        {low && low.length === 0 ? (
          <EmptyState compact title="Everything is above its reorder point" description="Nice. Nothing needs restocking." />
        ) : null}
        {low && low.length > 0 ? (
          <table className="w-full text-left text-[13px]">
            <thead className="text-[12px] text-ink-3">
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
                    <p className="font-mono text-[11.5px] text-ink-4">{item.sku}</p>
                  </td>
                  <td className="tnum py-2.5 text-right text-ink-2">
                    {num(item.available)} <span className="text-ink-4">{item.unit}</span>
                  </td>
                  <td className="hidden py-2.5 pl-4 sm:table-cell">
                    <CoverBar days={item.days_of_cover} leadTime={item.lead_time_days} />
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
            <Link
              href="/procurement?compose=1"
              className="inline-flex h-9 items-center gap-2 rounded-lg bg-accent px-3.5 text-sm font-medium text-white shadow-sm hover:bg-accent-strong"
            >
              Restock with Quartermaster
            </Link>
          </div>
        ) : null}
      </CardBody>
    </Card>
  );
}
