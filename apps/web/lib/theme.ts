"use client";

import { useSyncExternalStore } from "react";

/**
 * Bridges the design tokens in app/globals.css (`@theme`) to JavaScript, so
 * AG Grid and AG Charts use the same colours as Tailwind without copying hex
 * values. globals.css is the single source of truth.
 */

/** A `var(--color-…)` reference, for consumers that render CSS (AG Grid's theme params). */
export function cssColor(token: string): string {
  return `var(--color-${token})`;
}

/** Chart roles → token names. Charts draw on a canvas, so these are resolved to concrete values. */
const CHART_TOKENS = {
  series1: "chart-1",
  series2: "chart-2",
  allow: "allow",
  review: "chart-review",
  block: "chart-block",
  grid: "line",
  text: "ink-2",
  muted: "ink-3",
} as const;

export type ChartColors = Record<keyof typeof CHART_TOKENS, string>;

let resolved: ChartColors | undefined;

function readChartColors(): ChartColors {
  if (resolved) return resolved;
  const style = getComputedStyle(document.documentElement);
  const out = {} as ChartColors;
  for (const [role, token] of Object.entries(CHART_TOKENS) as [keyof ChartColors, string][]) {
    out[role] = style.getPropertyValue(`--color-${token}`).trim();
  }
  // Tokens are static for the page's lifetime; cache so the snapshot is referentially stable.
  resolved = out;
  return out;
}

const subscribe = () => () => undefined;

/** The chart palette read from the CSS custom properties; null during server rendering. */
export function useChartColors(): ChartColors | null {
  return useSyncExternalStore(subscribe, readChartColors, () => null);
}
