"use client";

import type { AnalyticsSummaryDto } from "@qm/contracts";
import { BudgetMeter } from "@/components/ui/Meter";
import { ResourceView, type ResourceLike } from "@/components/ui/ResourceView";
import { StatTile } from "@/components/ui/StatTile";
import { money, num } from "@/lib/format";

/** The overview KPIs: loading tiles, the load error with Retry, or the tiles (with a notice if a refresh failed). */
export function KpiRow({ summary, resource }: { summary: AnalyticsSummaryDto | undefined; resource: ResourceLike }) {
  return (
    <ResourceView resource={resource} hasData={Boolean(summary)} errorTitle="Couldn't load KPIs" loading={<KpiTiles summary={undefined} />}>
      <KpiTiles summary={summary} />
    </ResourceView>
  );
}

function KpiTiles({ summary }: { summary: AnalyticsSummaryDto | undefined }) {
  const loading = !summary;
  const b = summary?.budget;
  const used = b ? b.spent_minor + b.reserved_minor : 0;
  const lowCount = summary ? summary.inventory.items_low + summary.inventory.items_critical + summary.inventory.items_out : 0;

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
      <StatTile
        label="Weekly budget used"
        loading={loading}
        value={b ? money(used, b.currency) : ""}
        sub={b ? `of ${money(b.limit_minor, b.currency)} · ${money(b.remaining_minor, b.currency)} remaining` : undefined}
        href="/mandate"
        tone={b && b.remaining_minor <= 0 ? "block" : "neutral"}
      >
        {b ? <BudgetMeter budget={b} compact className="mt-3" /> : null}
      </StatTile>
      <StatTile
        label="Pending approvals"
        loading={loading}
        value={summary ? num(summary.totals.pending_approvals) : ""}
        sub="Proposals awaiting the owner"
        href="/approvals"
        tone={summary && summary.totals.pending_approvals > 0 ? "accent" : "neutral"}
      />
      <StatTile
        label="Low or critical stock"
        loading={loading}
        value={summary ? num(lowCount) : ""}
        sub={summary ? `${summary.inventory.items_critical} critical · ${summary.inventory.items_out} out of stock` : undefined}
        href="/inventory"
        tone={
          summary && (summary.inventory.items_critical > 0 || summary.inventory.items_out > 0) ? "block" : lowCount > 0 ? "review" : "allow"
        }
      />
      <StatTile
        label="Blocked attempts"
        loading={loading}
        value={summary ? num(summary.security.blocked_attempts) : ""}
        sub={
          summary
            ? `${summary.security.prompt_injections_detected} prompt injection${summary.security.prompt_injections_detected === 1 ? "" : "s"} detected`
            : undefined
        }
        href="/security"
        tone={summary && summary.security.blocked_attempts > 0 ? "block" : "neutral"}
      />
    </div>
  );
}
