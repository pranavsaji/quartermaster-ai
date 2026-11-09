"use client";

import {
  BarSeriesModule,
  CategoryAxisModule,
  LegendModule,
  ModuleRegistry,
  NumberAxisModule,
  type AgChartOptions,
  type AgChartTheme,
} from "ag-charts-community";
import { AgCharts } from "ag-charts-react";
import type { ReactNode } from "react";
import { Card, CardBody, CardHeader } from "@/components/ui/Card";
import { Disclosure } from "@/components/ui/Disclosure";
import { EmptyState } from "@/components/ui/EmptyState";

// Only what the analytics bar charts use (AllCommunityModule was a 1.2 MB chunk).
ModuleRegistry.registerModules([BarSeriesModule, CategoryAxisModule, NumberAxisModule, LegendModule]);

/**
 * Chart palette. Categorical slots follow a fixed, CVD-validated order
 * (never cycled); status colours are reserved for TrustRail decisions.
 */
export const CHART_COLORS = {
  series1: "#2a78d6",
  series2: "#eb6834",
  allow: "#067647",
  review: "#dc8a06",
  block: "#c4320a",
  grid: "#eef0f3",
  axis: "#d0d5dd",
  text: "#344054",
  muted: "#667085",
} as const;

export const chartTheme: AgChartTheme = {
  baseTheme: "ag-default",
  palette: { fills: [CHART_COLORS.series1, CHART_COLORS.series2], strokes: [CHART_COLORS.series1, CHART_COLORS.series2] },
  params: {
    fontFamily: "inherit",
    fontSize: 12,
    foregroundColor: CHART_COLORS.text,
    backgroundColor: "transparent",
  },
};

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
}: {
  title: string;
  description?: string;
  options: AgChartOptions;
  rows: T[];
  table: TableColumn<T>[];
  height?: number;
  emptyTitle?: string;
}) {
  return (
    <Card aria-label={title}>
      <CardHeader title={title} description={description} />
      <CardBody>
        {rows.length === 0 ? (
          <EmptyState compact title={emptyTitle} />
        ) : (
          <>
            <div style={{ height }}>
              <AgCharts options={{ theme: chartTheme, ...options }} style={{ height: "100%" }} />
            </div>
            <Disclosure className="mt-3" summary="View as table">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-[12.5px]">
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
