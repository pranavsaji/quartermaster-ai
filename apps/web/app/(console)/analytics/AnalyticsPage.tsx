"use client";

import type { AnalyticsSummaryDto, InventoryItemDto, PolicyDecisionKind } from "@qm/contracts";
import type { AgChartOptions } from "ag-charts-community";
import { useMemo } from "react";
import { ChartCard } from "@/components/charts/ChartCard";
import { Button } from "@/components/ui/Button";
import { Card, CardBody, CardHeader } from "@/components/ui/Card";
import { PageHeader } from "@/components/ui/PageHeader";
import { ResourceView } from "@/components/ui/ResourceView";
import { SkeletonCard } from "@/components/ui/Skeleton";
import { StatTile } from "@/components/ui/StatTile";
import { api } from "@/lib/api";
import { duration, minorToMajor, money, moneyTick, num, shortDate } from "@/lib/format";
import { useResource } from "@/lib/hooks";
import { categoryLabel, DECISION_LABELS, findingLabel, lookup, STOCK_LABELS } from "@/lib/labels";
import type { ChartColors } from "@/lib/theme";

function decisionColors(c: ChartColors): Record<PolicyDecisionKind, string> {
  return { ALLOW: c.allow, REVIEW_REQUIRED: c.review, BLOCK: c.block };
}

function stockColors(c: ChartColors): Record<InventoryItemDto["status"], string> {
  return { OK: c.allow, LOW: c.review, CRITICAL: c.block, OUT: c.block };
}

/** Rows for the stock-cover chart: items with recorded usage, least cover first. */
export function stockCoverRows(items: readonly InventoryItemDto[]) {
  return items
    .filter((i) => i.days_of_cover !== null)
    .map((i) => ({
      item: i.name,
      days: Math.round((i.days_of_cover ?? 0) * 10) / 10,
      target: i.coverage_days + i.lead_time_days,
      status: i.status,
    }))
    .sort((a, b) => a.days - b.days);
}

function moneyAxis(currency: string, c: ChartColors) {
  return {
    type: "number" as const,
    position: "left" as const,
    gridLine: { style: [{ stroke: c.grid, lineDash: [] }] },
    label: { formatter: ({ value }: { value: number }) => moneyTick(value, currency) },
  };
}

/** Count axis that never shows fractional ticks (e.g. "0.2 findings"). */
function countAxis(position: "left" | "bottom", max: number, c: ChartColors) {
  return {
    type: "number" as const,
    position,
    gridLine: { style: [{ stroke: c.grid, lineDash: [] }] },
    ...(max <= 10 ? { interval: { step: 1 } } : {}),
    label: { formatter: ({ value }: { value: number }) => (Number.isInteger(value) ? String(value) : "") },
  };
}

function useChartOptions(s: AnalyticsSummaryDto | undefined, inventory: InventoryItemDto[] | undefined) {
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
      decision: lookup(DECISION_LABELS, d.decision, d.decision),
      count: d.count,
      kind: d.decision,
    }));
    const bySupplier = s.spend_by_supplier.map((r) => ({
      supplier: r.supplier,
      captured: minorToMajor(r.captured_minor, cur),
      captured_minor: r.captured_minor,
      orders: r.orders,
    }));
    const cover = stockCoverRows(inventory ?? []);
    const findings = [...s.findings_by_type].sort((a, b) => b.count - a.count).map((f) => ({ type: findingLabel(f.type), count: f.count }));

    const tooltipMoney = (label: string) => ({
      renderer: ({ datum, yKey }: { datum: Record<string, unknown>; yKey: string }) => ({
        heading: String(datum.week ?? datum.category ?? datum.supplier ?? ""),
        data: [{ label, value: money(Number(datum[`${yKey}_minor`]), cur) }],
      }),
    });

    const spendByWeek = (c: ChartColors): AgChartOptions => ({
      data: weekly,
      series: [
        {
          type: "bar",
          xKey: "week",
          yKey: "captured",
          yName: "Captured",
          stacked: true,
          fill: c.series1,
          cornerRadius: 4,
          tooltip: tooltipMoney("Captured"),
        },
        {
          type: "bar",
          xKey: "week",
          yKey: "reserved",
          yName: "Reserved",
          stacked: true,
          fill: c.series2,
          cornerRadius: 4,
          tooltip: tooltipMoney("Reserved"),
        },
      ],
      axes: { x: { type: "category", position: "bottom" }, y: moneyAxis(cur, c) },
      legend: { position: "top", enabled: true },
    });

    const spendByCategory = (c: ChartColors): AgChartOptions => ({
      data: byCategory,
      series: [
        {
          type: "bar",
          direction: "horizontal",
          xKey: "category",
          yKey: "captured",
          yName: "Captured spend",
          fill: c.series1,
          cornerRadius: 4,
          tooltip: tooltipMoney("Captured"),
        },
      ],
      axes: { x: { type: "category", position: "left" }, y: { ...moneyAxis(cur, c), position: "bottom" } },
      legend: { enabled: false },
    });

    const spendBySupplier = (c: ChartColors): AgChartOptions => ({
      data: bySupplier,
      series: [
        {
          type: "bar",
          direction: "horizontal",
          xKey: "supplier",
          yKey: "captured",
          yName: "Captured spend",
          fill: c.series1,
          cornerRadius: 4,
          tooltip: tooltipMoney("Captured"),
        },
      ],
      axes: { x: { type: "category", position: "left" }, y: { ...moneyAxis(cur, c), position: "bottom" } },
      legend: { enabled: false },
    });

    // Decisions as shares of all TrustRail evaluations; status colours, never the categorical palette.
    const decisionsByKind = (c: ChartColors): AgChartOptions => ({
      data: decisions.filter((d) => d.count > 0),
      series: [
        {
          type: "donut",
          angleKey: "count",
          legendItemKey: "decision",
          calloutLabelKey: "decision",
          innerRadiusRatio: 0.62,
          fills: decisions.filter((d) => d.count > 0).map((d) => lookup(decisionColors(c), d.kind, c.muted)),
          strokes: decisions.filter((d) => d.count > 0).map(() => "transparent"),
          // Counts sit in the callouts (not on the sectors), so they never depend on fill contrast.
          calloutLabel: {
            color: c.text,
            formatter: ({ datum }: { datum: { decision: string; count: number } }) => `${datum.decision} (${datum.count})`,
          },
          innerLabels: [
            { text: num(decisions.reduce((a, d) => a + d.count, 0)), fontSize: 20, color: c.text },
            { text: "evaluations", fontSize: 11, color: c.text },
          ],
        },
      ],
      legend: { enabled: true, position: "bottom" },
    });

    // Days of cover per item, coloured by stock status, against each item's target (lead time +
    // days of cover to order): bars below the line are what the agent will restock.
    const stockCover = (c: ChartColors): AgChartOptions => ({
      data: cover,
      series: [
        {
          type: "bar",
          xKey: "item",
          yKey: "days",
          yName: "Days of cover",
          cornerRadius: 4,
          itemStyler: ({ datum }: { datum: { status: InventoryItemDto["status"] } }) => ({
            fill: lookup(stockColors(c), datum.status, c.muted),
          }),
          label: { enabled: true, placement: "outside-end", color: c.text },
        },
        {
          type: "line",
          xKey: "item",
          yKey: "target",
          yName: "Target cover",
          stroke: c.text,
          strokeWidth: 1.5,
          lineDash: [4, 4],
          marker: { enabled: true, size: 6, fill: c.text, stroke: c.text },
        },
      ],
      axes: {
        x: { type: "category", position: "bottom" },
        y: {
          type: "number",
          position: "left",
          gridLine: { style: [{ stroke: c.grid, lineDash: [] }] },
          label: { formatter: ({ value }: { value: number }) => `${value} d` },
        },
      },
      legend: { position: "top", enabled: true },
    });

    const findingsByType = (c: ChartColors): AgChartOptions => ({
      data: findings,
      series: [
        {
          type: "bar",
          direction: "horizontal",
          xKey: "type",
          yKey: "count",
          yName: "Findings",
          fill: c.series1,
          cornerRadius: 4,
          label: { enabled: true, placement: "outside-end", color: c.text },
        },
      ],
      axes: { x: { type: "category", position: "left" }, y: countAxis("bottom", Math.max(0, ...findings.map((f) => f.count)), c) },
      legend: { enabled: false },
    });

    return {
      weekly,
      byCategory,
      bySupplier,
      decisions,
      findings,
      cover,
      spendByWeek,
      spendByCategory,
      spendBySupplier,
      decisionsByKind,
      findingsByType,
      stockCover,
    };
  }, [s, inventory]);
}

export function AnalyticsPage() {
  const summary = useResource((signal, { refresh }) => api.analytics.summary({ signal, fresh: refresh }), []);
  // Stock cover comes from the live inventory; the page still renders if this one call fails.
  const inventory = useResource((signal) => api.inventory.list({ signal }).then((r) => r.items), []);
  const s = summary.data;
  const charts = useChartOptions(s, inventory.data);
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

      <ResourceView
        resource={summary}
        hasData={Boolean(s)}
        className="mb-6"
        loading={
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
            <SkeletonCard lines={6} />
            <SkeletonCard lines={6} />
          </div>
        }
      />

      {s && charts ? (
        <div className="space-y-6">
          <section aria-labelledby="outcomes-title">
            <h2 id="outcomes-title" className="mb-3 text-[15px] font-semibold text-ink">
              Measurable outcomes
            </h2>
            <div className="grid grid-cols-2 gap-4 lg:grid-cols-3 2xl:grid-cols-6">
              <StatTile
                label="Blocked attempts"
                value={num(s.security.blocked_attempts)}
                tone={s.security.blocked_attempts > 0 ? "block" : "neutral"}
                sub="Carts TrustRail refused"
              />
              <StatTile
                label="Prompt injections detected"
                value={num(s.security.prompt_injections_detected)}
                tone="review"
                sub="Quarantined, never executed"
              />
              <StatTile
                label="Duplicate captures"
                value={num(s.security.duplicate_captures)}
                tone={s.security.duplicate_captures === 0 ? "allow" : "block"}
                sub="Idempotent payments: target 0"
              />
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
              title="Spend by supplier"
              description="Captured spend net of refunds, per supplier."
              options={charts.spendBySupplier}
              rows={charts.bySupplier}
              emptyTitle="No captured spend yet"
              table={[
                { label: "Supplier", value: (r) => r.supplier },
                { label: "Orders", value: (r) => num(r.orders), numeric: true },
                { label: "Captured", value: (r) => money(r.captured_minor, cur), numeric: true },
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
              description="Share of TrustRail evaluations that were allowed, needed review, or were blocked."
              options={charts.decisionsByKind}
              rows={charts.decisions.filter((d) => d.count > 0)}
              emptyTitle="No policy decisions yet"
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
            <ChartCard
              title="Days of stock cover"
              description="Per item, coloured by stock status, against its target cover (lead time plus days to order). Items without recorded usage are left out."
              options={charts.stockCover}
              rows={charts.cover}
              emptyTitle="No usage recorded yet"
              table={[
                { label: "Item", value: (r) => r.item },
                { label: "Status", value: (r) => lookup(STOCK_LABELS, r.status, r.status) },
                { label: "Days of cover", value: (r) => num(r.days), numeric: true },
                { label: "Target", value: (r) => num(r.target), numeric: true },
              ]}
            />
          </div>
        </div>
      ) : null}
    </>
  );
}
