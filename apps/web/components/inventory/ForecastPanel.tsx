"use client";

import type { ForecastRunDto } from "@qm/contracts";
import { useState } from "react";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card, CardBody, CardHeader } from "@/components/ui/Card";
import { Checkbox } from "@/components/ui/Field";
import { ErrorNotice } from "@/components/ui/ErrorNotice";
import { SkeletonRows } from "@/components/ui/Skeleton";
import { api } from "@/lib/api";
import { dateTime, describeDemandMultiplier, num } from "@/lib/format";
import { useAction } from "@/lib/hooks";
import { DemandSlider } from "./DemandSlider";
import { ForecastLines } from "./ForecastLines";

export function ForecastPanel({ canRun }: { canRun: boolean }) {
  const [multiplier, setMultiplier] = useState(1.25);
  const [onlyReorders, setOnlyReorders] = useState(true);
  const [run, setRun] = useState<ForecastRunDto | null>(null);
  const forecast = useAction(async (demand: number) => {
    const result = await api.inventory.forecast({ demand_multiplier: demand });
    setRun(result);
    return result;
  });

  const stale = run !== null && Math.abs(run.demand_multiplier - multiplier) > 1e-9;
  const reorderCount = run?.lines.filter((l) => l.needs_reorder).length ?? 0;

  return (
    <Card aria-labelledby="forecast-title">
      <CardHeader
        id="forecast-title"
        title="Demand forecast"
        description="Reorder-point model: lead-time demand plus safety stock, scaled by your demand assumption."
      />
      <CardBody className="space-y-4">
        <DemandSlider value={multiplier} onChange={setMultiplier} disabled={!canRun || forecast.pending} />
        <div className="flex flex-wrap items-center gap-3">
          <Button variant="primary" onClick={() => void forecast.run(multiplier)} loading={forecast.pending} disabled={!canRun}>
            {run ? "Re-run forecast" : "Run forecast"}
          </Button>
          {!canRun ? <span className="text-xs text-ink-3">Managers and owners can run forecasts.</span> : null}
        </div>

        <ErrorNotice error={forecast.error} onRetry={() => void forecast.run(multiplier)} />

        {forecast.pending && !run ? <SkeletonRows rows={4} /> : null}

        {run ? (
          <div className="space-y-3 border-t border-line pt-4" aria-busy={forecast.pending}>
            <div className="flex flex-wrap items-center gap-2">
              <Badge tone="accent">{run.method}</Badge>
              <span className="tnum text-xs text-ink-3">
                {num(run.demand_multiplier, 2)}× · {dateTime(run.created_at)}
              </span>
              <span className="text-xs font-medium text-ink-2">
                {reorderCount} of {run.lines.length} items need reordering
              </span>
            </div>
            <p className="text-xs text-ink-3">{describeDemandMultiplier(run.demand_multiplier)}.</p>
            {stale ? (
              <p className="text-xs font-medium text-review" role="status">
                The slider changed since this run — re-run to update.
              </p>
            ) : null}
            <Checkbox
              label="Only show items that need reordering"
              checked={onlyReorders}
              onChange={(e) => setOnlyReorders(e.target.checked)}
            />
            <div className="max-h-[520px] overflow-y-auto pr-1">
              <ForecastLines lines={run.lines} onlyReorders={onlyReorders} />
            </div>
          </div>
        ) : null}
      </CardBody>
    </Card>
  );
}
