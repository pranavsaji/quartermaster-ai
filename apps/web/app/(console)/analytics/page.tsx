"use client";

import type { AnalyticsSummaryDto, PolicyDecisionKind } from "@qm/contracts";
import type { AgChartOptions } from "ag-charts-community";
import { useMemo } from "react";
import { CHART_COLORS, ChartCard } from "@/components/charts/ChartCard";
import { Button } from "@/components/ui/Button";
import { Card, CardBody, CardHeader } from "@/components/ui/Card";
import { ErrorNotice } from "@/components/ui/ErrorNotice";
import { PageHeader } from "@/components/ui/PageHeader";
import { RefreshErrorNotice } from "@/components/ui/RefreshErrorNotice";
import { SkeletonCard } from "@/components/ui/Skeleton";
import { StatTile } from "@/components/ui/StatTile";
import { api } from "@/lib/api";
import { duration, minorToMajor, money, moneyTick, num, shortDate } from "@/lib/format";
import { useResource } from "@/lib/hooks";
import { categoryLabel, DECISION_LABELS, findingLabel } from "@/lib/labels";

const DECISION_COLORS: Record<PolicyDecisionKind, string> = {
  ALLOW: CHART_COLORS.allow,
  REVIEW_REQUIRED: CHART_COLORS.review,
  BLOCK: CHART_COLORS.block,
};

function moneyAxis(currency: string) {
  return {
    type: "number" as const,
    position: "left" as const,
    gridLine: { style: [{ stroke: CHART_COLORS.grid, lineDash: [] }] },
    label: { formatter: ({ value }: { value: number }) => moneyTick(value, currency) },
  };
}

/** Count axis that never shows fractional ticks (e.g. "0.2 findings"). */
function countAxis(position: "left" | "bottom", max: number) {
  return {
    type: "number" as const,
    position,
    gridLine: { style: [{ stroke: CHART_COLORS.grid, lineDash: [] }] },
    ...(max <= 10 ? { interval: { step: 1 } } : {}),
    label: { formatter: ({ value }: { value: number }) => (Number.isInteger(value) ? String(value) : "") },
  };
}

function useChartOptions(s: AnalyticsSummaryDto | undefined) {
  return useMemo(() => {
    if (!s) return null;
    const cur = s.currency;
    // Charts plot major units; tables and tooltips format the exact minor-unit values.
    const weekly = s.spend_by_week.map((w) => ({
      week: shortDate(w.week_start),
      captured: minorToMajor(w.captured_minor, cur),
      reserved: minorToMajor(w.reserved_minor, cur),
      captured_minor: w.captured_minor,
      reserved_minor: w.reserved_minor,
    }));
    const byCategory = [...s.spend_by_category]
      .sort((a, b) => b.captured_minor - a.captured_minor)
      .map((c) => ({
        category: categoryLabel(c.category),
        captured: minorToMajor(c.captured_minor, cur),
        captured_minor: c.captured_minor,
      }));
    const decisions = s.decisions_by_kind.map((d) => ({
      decision: DECISION_LABELS[d.decision],
      count: d.count,
      kind: d.decision,
    }));
    const findings = [...s.findings_by_type]
      .sort((a, b) => b.count - a.count)
      .map((f) => ({ type: findingLabel(f.type), count: f.count }));

    const tooltipMoney = (label: string) => ({
      renderer: ({ datum, yKey }: { datum: Record<string, unknown>; yKey: string }) => ({
        heading: String(datum.week ?? datum.category ?? ""),
        data: [{ label, value: money(Number(datum[`${yKey}_minor`]), cur) }],
      }),
    });

    const spendByWeek: AgChartOptions = {
      data: weekly,
      series: [
        { type: "bar", xKey: "week", yKey: "captured", yName: "Captured", stacked: true, fill: CHART_COLORS.series1, cornerRadius: 4, tooltip: tooltipMoney("Captured") },
        { type: "bar", xKey: "week", yKey: "reserved", yName: "Reserved", stacked: true, fill: CHART_COLORS.series2, cornerRadius: 4, tooltip: tooltipMoney("Reserved") },
      ],
      axes: { x: { type: "category", position: "bottom" }, y: moneyAxis(cur) },
      legend: { position: "top", enabled: true },
    };

    const spendByCategory: AgChartOptions = {
      data: byCategory,
      series: [
        { type: "bar", direction: "horizontal", xKey: "category", yKey: "captured", yName: "Captured spend", fill: CHART_COLORS.series1, cornerRadius: 4, tooltip: tooltipMoney("Captured") },
      ],
      axes: { x: { type: "category", position: "left" }, y: { ...moneyAxis(cur), position: "bottom" } },
      legend: { enabled: false },
    };

    const decisionsByKind: AgChartOptions = {
      data: decisions,
      series: [
        {
          type: "bar",
          xKey: "decision",
          yKey: "count",
          yName: "Decisions",
          cornerRadius: 4,
          itemStyler: ({ datum }: { datum: { kind: PolicyDecisionKind } }) => ({ fill: DECISION_COLORS[datum.kind] }),
          label: { enabled: true, placement: "outside-end", color: CHART_COLORS.text },
        },
      ],
      axes: { x: { type: "category", position: "bottom" }, y: countAxis("left", Math.max(0, ...decisions.map((d) => d.count))) },
      legend: { enabled: false },
    };

    const findingsByType: AgChartOptions = {
      data: findings,
      series: [
        { type: "bar", direction: "horizontal", xKey: "type", yKey: "count", yName: "Findings", fill: CHART_COLORS.series1, cornerRadius: 4, label: { enabled: true, placement: "outside-end", color: CHART_COLORS.text } },
      ],
      axes: { x: { type: "category", position: "left" }, y: countAxis("bottom", Math.max(0, ...findings.map((f) => f.count))) },
      legend: { enabled: false },
    };

    return { weekly, byCategory, decisions, findings, spendByWeek, spendByCategory, decisionsByKind, findingsByType };
  }, [s]);
}

export default function AnalyticsPage() {
  const summary = useResource((signal) => api.analytics.summary({ signal }), []);
  const s = summary.data;
  const charts = useChartOptions(s);
  const cur = s?.currency ?? "USD";

  return (
    <>
      <PageHeader
        title="Analytics"
        description="Spend, policy outcomes and the security results TrustRail delivers."
        actions={
          <Button variant="secondary" onClick={summary.reload} loading={summary.refreshing}>
            Refresh
          </Button>
        }
      />

      {summary.error && !s ? <ErrorNotice error={summary.error} onRetry={summary.reload} /> : null}
      <RefreshErrorNotice error={summary.error} hasData={Boolean(s)} updatedAt={summary.updatedAt} onRetry={summary.reload} className="mb-6" />

      {!s && !summary.error ? (
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          <SkeletonCard lines={6} />
          <SkeletonCard lines={6} />
        </div>
      ) : null}

      {s && charts ? (
        <div className="space-y-6">
          <section aria-labelledby="outcomes-title">
            <h2 id="outcomes-title" className="mb-3 text-[15px] font-semibold text-ink">
              Measurable outcomes
            </h2>
            <div className="grid grid-cols-2 gap-4 lg:grid-cols-3 2xl:grid-cols-6">
              <StatTile label="Blocked attempts" value={num(s.security.blocked_attempts)} tone={s.security.blocked_attempts > 0 ? "block" : "neutral"} sub="Carts TrustRail refused" />
              <StatTile label="Prompt injections detected" value={num(s.security.prompt_injections_detected)} tone="review" sub="Quarantined, never executed" />
              <StatTile label="Duplicate captures" value={num(s.security.duplicate_captures)} tone={s.security.duplicate_captures === 0 ? "allow" : "block"} sub="Idempotent payments: target 0" />
              <StatTile label="Duplicate invoices flagged" value={num(s.security.duplicate_invoices_flagged)} sub="Settlement blocked" />
              <StatTile label="Procurement time (median)" value={duration(s.procurement_time_ms.median)} sub="Request → approved cart" />
              <StatTile label="Procurement time (p90)" value={duration(s.procurement_time_ms.p90)} sub="90th percentile" />
            </div>
          </section>

          <Card aria-labelledby="totals-title">
            <CardHeader id="totals-title" title="Totals" />
            <CardBody>
              <dl className="tnum grid grid-cols-2 gap-x-6 gap-y-4 text-[13px] sm:grid-cols-4 xl:grid-cols-7">
                {[
                  ["Approved spend", money(s.totals.approved_spend_minor, cur)],
                  ["Captured spend", money(s.totals.captured_spend_minor, cur)],
                  ["Refunded", money(s.totals.refunded_minor, cur)],
                  ["Orders paid", num(s.totals.orders_paid)],
                  ["Orders blocked", num(s.totals.orders_blocked)],
                  ["Pending approvals", num(s.totals.pending_approvals)],
                  ["Requests", num(s.totals.requests_total)],
                ].map(([label, value]) => (
                  <div key={label}>
                    <dt className="text-ink-3">{label}</dt>
                    <dd className="mt-0.5 text-[17px] font-semibold text-ink">{value}</dd>
                  </div>
                ))}
              </dl>
            </CardBody>
          </Card>

          <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
            <ChartCard
              title="Spend by week"
              description="Captured (paid via PayPal sandbox) vs reserved (approved, not yet captured)."
              options={charts.spendByWeek}
              rows={charts.weekly}
              table={[
                { label: "Week", value: (r) => r.week },
                { label: "Captured", value: (r) => money(r.captured_minor, cur), numeric: true },
                { label: "Reserved", value: (r) => money(r.reserved_minor, cur), numeric: true },
              ]}
            />
            <ChartCard
              title="Spend by category"
              description="Captured spend per product category."
              options={charts.spendByCategory}
              rows={charts.byCategory}
              table={[
                { label: "Category", value: (r) => r.category },
                { label: "Captured", value: (r) => money(r.captured_minor, cur), numeric: true },
              ]}
            />
            <ChartCard
              title="Policy decisions by kind"
              description="Every TrustRail evaluation: allow, review required, or block."
              options={charts.decisionsByKind}
              rows={charts.decisions}
              table={[
                { label: "Decision", value: (r) => r.decision },
                { label: "Count", value: (r) => num(r.count), numeric: true },
              ]}
            />
            <ChartCard
              title="Findings by type"
              description="Security findings TrustRail raised."
              options={charts.findingsByType}
              rows={charts.findings}
              emptyTitle="No findings recorded"
              table={[
                { label: "Type", value: (r) => r.type },
                { label: "Count", value: (r) => num(r.count), numeric: true },
              ]}
            />
          </div>
        </div>
      ) : null}
    </>
  );
}
