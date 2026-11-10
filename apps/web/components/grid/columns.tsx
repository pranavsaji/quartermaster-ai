"use client";

import type { ColDef, ValueFormatterParams } from "ag-grid-community";
import type { CustomCellRendererProps } from "ag-grid-react";
import type { Tone } from "@/lib/labels";
import { dateTime, humanize, money, num } from "@/lib/format";
import { StatusBadge } from "@/components/ui/Badge";

type Field<T> = NonNullable<ColDef<T>["field"]>;

/**
 * Cell class for right-aligned numeric cells. A colDef `cellClass` replaces the
 * one from `type: "rightAligned"`, so the alignment class must be repeated.
 */
export function rightCell(extra = ""): string {
  return `ag-right-aligned-cell tnum ${extra}`.trim();
}

/** Right-aligned tabular money column over an integer minor-unit field. */
export function moneyColumn<T>(
  field: Field<T>,
  headerName: string,
  currencyOf: (row: T) => string = () => "USD",
  extra: Partial<ColDef<T>> = {},
): ColDef<T> {
  return {
    field,
    headerName,
    type: "rightAligned",
    cellClass: rightCell(),
    valueFormatter: (p: ValueFormatterParams<T>) => (p.data ? money(typeof p.value === "number" ? p.value : null, currencyOf(p.data)) : ""),
    comparator: (a: unknown, b: unknown) => Number(a ?? 0) - Number(b ?? 0),
    ...extra,
  };
}

export function numberColumn<T>(field: Field<T>, headerName: string, extra: Partial<ColDef<T>> = {}): ColDef<T> {
  return {
    field,
    headerName,
    type: "rightAligned",
    cellClass: rightCell(),
    valueFormatter: (p: ValueFormatterParams<T>) => (typeof p.value === "number" ? num(p.value) : "—"),
    ...extra,
  };
}

export function dateTimeColumn<T>(field: Field<T>, headerName: string, extra: Partial<ColDef<T>> = {}): ColDef<T> {
  return {
    field,
    headerName,
    cellClass: "tnum",
    valueFormatter: (p: ValueFormatterParams<T>) => (typeof p.value === "string" ? dateTime(p.value) : "—"),
    ...extra,
  };
}

/** Status pill column for an enum field with a tone map. */
export function statusColumn<T, S extends string>(
  field: Field<T>,
  headerName: string,
  tones: Record<S, Tone>,
  labels?: Partial<Record<S, string>>,
  extra: Partial<ColDef<T>> = {},
): ColDef<T> {
  return {
    field,
    headerName,
    cellRenderer: (p: CustomCellRendererProps<T, S>) =>
      p.value ? <StatusBadge status={p.value} tones={tones} labels={labels} kind={headerName} /> : null,
    valueFormatter: (p: ValueFormatterParams<T>) => (typeof p.value === "string" ? humanize(p.value) : ""),
    ...extra,
  };
}

/** Cell class for a column people can edit in place (see `.qm-editable` in globals.css). */
export const EDITABLE_CELL = "qm-editable";
