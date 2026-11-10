"use client";

import {
  BarSeriesModule,
  CategoryAxisModule,
  DonutSeriesModule,
  LegendModule,
  LineSeriesModule,
  ModuleRegistry,
  NumberAxisModule,
  type AgChartOptions,
  type AgChartTheme,
} from "ag-charts-community";
import { AgCharts } from "ag-charts-react";
import { useMemo, type ReactNode } from "react";
import { Card, CardBody, CardHeader } from "@/components/ui/Card";
import { Disclosure } from "@/components/ui/Disclosure";
import { EmptyState } from "@/components/ui/EmptyState";
import { Skeleton } from "@/components/ui/Skeleton";
import { useChartColors, type ChartColors } from "@/lib/theme";

// Only what the analytics charts use (AllCommunityModule was a 1.2 MB chunk): bars, the decisions
// donut, and the stock-cover target line.
ModuleRegistry.registerModules([BarSeriesModule, DonutSeriesModule, LineSeriesModule, CategoryAxisModule, NumberAxisModule, LegendModule]);

/**
 * Chart theme from the design tokens (`--color-chart-*` etc. in globals.css).
 * Categorical slots follow a fixed, CVD-validated order (never cycled); status
 * colours are reserved for TrustRail decisions.
 */
export function chartTheme(colors: ChartColors): AgChartTheme {
  return {
    baseTheme: "ag-default",
    palette: { fills: [colors.series1, colors.series2], strokes: [colors.series1, colors.series2] },
    params: {
      fontFamily: "inherit",
      fontSize: 12,
      foregroundColor: colors.text,
      backgroundColor: "transparent",
    },
  };
}

export interface TableColumn<T> {
  label: string;
  value: (row: T) => ReactNode;
  numeric?: boolean;
}

/**
 * Card wrapper for an AG Chart, with an empty state and an accessible table
 * view of the same data underneath (identity is never colour-alone).
 */
export function ChartCard<T>({
  title,
  description,
  options,
  rows,
  table,
  height = 280,
  emptyTitle = "No data yet",
  legend,
}: {
  title: string;
  description?: string;
  /** Built from the resolved token colours, which are only known in the browser. */
  options: (colors: ChartColors) => AgChartOptions;
  rows: T[];
  table: TableColumn<T>[];
  height?: number;
  emptyTitle?: string;
  /** A legend drawn in HTML above the chart, for charts whose colours carry meaning the chart legend can't show. */
  legend?: ReactNode;
}) {
  const colors = useChartColors();
  const resolved = useMemo(() => (colors ? { theme: chartTheme(colors), ...options(colors) } : null), [colors, options]);
  return (
    <Card aria-label={title}>
      <CardHeader title={title} description={description} />
      <CardBody>
        {rows.length === 0 ? (
          <EmptyState
            compact
            icon="analytics"
            title={emptyTitle}
            description="This fills in as requests are researched, approved and paid."
          />
        ) : (
          <>
            {legend ? <div className="mb-2">{legend}</div> : null}
            <div style={{ height }}>
              {resolved ? <AgCharts options={resolved} style={{ height: "100%" }} /> : <Skeleton className="h-full w-full" />}
            </div>
            <Disclosure className="mt-3" summary="View as table">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <caption className="sr-only">{title}</caption>
                  <thead className="text-ink-3">
                    <tr>
                      {table.map((c) => (
                        <th key={c.label} scope="col" className={c.numeric ? "py-1.5 text-right font-medium" : "py-1.5 font-medium"}>
                          {c.label}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-line">
                    {rows.map((r, i) => (
                      <tr key={i}>
                        {table.map((c) => (
                          <td key={c.label} className={c.numeric ? "tnum py-1.5 text-right" : "py-1.5"}>
                            {c.value(r)}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Disclosure>
          </>
        )}
      </CardBody>
    </Card>
  );
}
