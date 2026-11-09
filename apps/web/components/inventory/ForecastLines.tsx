import type { ForecastLineDto } from "@qm/contracts";
import { Badge } from "@/components/ui/Badge";
import { EmptyState } from "@/components/ui/EmptyState";
import { num } from "@/lib/format";

/** Forecast output: what to reorder, how much, and the reasoning for each line. */
export function ForecastLines({ lines, onlyReorders = false }: { lines: ForecastLineDto[]; onlyReorders?: boolean }) {
  const shown = onlyReorders ? lines.filter((l) => l.needs_reorder) : lines;
  const sorted = [...shown].sort((a, b) => Number(b.needs_reorder) - Number(a.needs_reorder) || a.name.localeCompare(b.name));
  if (sorted.length === 0) {
    return <EmptyState compact title="No lines need reordering" description="Every item covers its lead time plus safety stock." />;
  }
  return (
    <ul className="divide-y divide-line">
      {sorted.map((line) => (
        <li key={line.inventory_item_id} className="py-3 first:pt-0 last:pb-0">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="min-w-0">
              <p className="text-[13.5px] font-medium text-ink">{line.name}</p>
              <p className="font-mono text-[11.5px] text-ink-4">{line.sku}</p>
            </div>
            {line.needs_reorder ? (
              <Badge tone="accent" size="md">
                Order <span className="tnum font-semibold">{num(line.suggested_quantity)}</span> {line.unit}
              </Badge>
            ) : (
              <Badge tone="allow">Covered</Badge>
            )}
          </div>
          <dl className="tnum mt-2 grid grid-cols-2 gap-x-4 gap-y-1 text-[12px] sm:grid-cols-4">
            <div>
              <dt className="text-ink-4">Daily use</dt>
              <dd className="text-ink-2">
                {num(line.base_daily_usage, 1)} → <span className="font-medium text-ink">{num(line.forecast_daily_usage, 1)}</span>
              </dd>
            </div>
            <div>
              <dt className="text-ink-4">Available</dt>
              <dd className="text-ink-2">
                {num(line.available)} {line.unit}
              </dd>
            </div>
            <div>
              <dt className="text-ink-4">Reorder point</dt>
              <dd className="text-ink-2">{num(line.reorder_point)}</dd>
            </div>
            <div>
              <dt className="text-ink-4">Target stock</dt>
              <dd className="text-ink-2">{num(line.target_stock)}</dd>
            </div>
          </dl>
          <p className="mt-2 text-[13px] leading-relaxed text-ink-3">{line.explanation}</p>
        </li>
      ))}
    </ul>
  );
}
