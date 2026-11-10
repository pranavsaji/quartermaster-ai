import type { BudgetDto } from "@qm/contracts";
import { money } from "@/lib/format";
import { cn } from "./cn";

/**
 * Weekly budget meter: spent (captured) + reserved (approved, not yet captured)
 * against the mandate's weekly limit.
 */
export function BudgetMeter({ budget, className, compact = false }: { budget: BudgetDto; className?: string; compact?: boolean }) {
  const limit = Math.max(budget.limit_minor, 0);
  const spentPct = limit > 0 ? Math.min(100, (budget.spent_minor / limit) * 100) : 0;
  const reservedPct = limit > 0 ? Math.min(100 - spentPct, (budget.reserved_minor / limit) * 100) : 0;
  const used = budget.spent_minor + budget.reserved_minor;
  const usedPct = limit > 0 ? Math.round((used / limit) * 100) : 0;
  const over = used > limit;

  return (
    <div className={className}>
      <div
        role="meter"
        aria-label="Weekly budget used"
        aria-valuemin={0}
        aria-valuemax={limit}
        aria-valuenow={Math.min(used, limit)}
        aria-valuetext={`${money(used, budget.currency)} of ${money(limit, budget.currency)} used`}
        className={cn("flex w-full overflow-hidden rounded-full bg-ink/[0.06]", compact ? "h-1.5" : "h-2.5")}
      >
        <div className={cn("h-full", over ? "bg-block" : "bg-accent")} style={{ width: `${spentPct}%` }} />
        <div
          className="h-full bg-accent/35 bg-[repeating-linear-gradient(45deg,transparent,transparent_3px,rgb(255_255_255/0.5)_3px,rgb(255_255_255/0.5)_6px)]"
          style={{ width: `${reservedPct}%` }}
        />
      </div>
      {!compact ? (
        <dl className="tnum mt-3 grid grid-cols-2 gap-x-4 gap-y-2 text-sm sm:grid-cols-4">
          <div>
            <dt className="flex items-center gap-1.5 text-ink-3">
              <span aria-hidden className="size-2 rounded-sm bg-accent" />
              Spent
            </dt>
            <dd className="font-medium text-ink">{money(budget.spent_minor, budget.currency)}</dd>
          </div>
          <div>
            <dt className="flex items-center gap-1.5 text-ink-3">
              <span aria-hidden className="size-2 rounded-sm bg-accent/35" />
              Reserved
            </dt>
            <dd className="font-medium text-ink">{money(budget.reserved_minor, budget.currency)}</dd>
          </div>
          <div>
            <dt className="text-ink-3">Remaining</dt>
            <dd className={cn("font-medium", budget.remaining_minor <= 0 ? "text-block" : "text-ink")}>
              {money(budget.remaining_minor, budget.currency)}
            </dd>
          </div>
          <div>
            <dt className="text-ink-3">Weekly limit</dt>
            <dd className="font-medium text-ink">
              {money(limit, budget.currency)} <span className="text-ink-3">({usedPct}% used)</span>
            </dd>
          </div>
        </dl>
      ) : null}
    </div>
  );
}
