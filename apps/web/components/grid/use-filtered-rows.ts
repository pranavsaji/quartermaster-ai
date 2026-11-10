"use client";

import type { GridApi } from "ag-grid-community";
import { useCallback, useState } from "react";

/**
 * The rows a grid currently shows after its column filters and search, for totals rows that
 * follow what people filtered to. Until the grid reports (or after the data changes and before it
 * reports again) every row counts.
 *
 * Wire both handlers: `onFilterChanged` (search and column filters) and `onRowDataUpdated`.
 */
export function useFilteredRows<T>(rows: T[] | undefined) {
  const [captured, setCaptured] = useState<{ source: T[] | undefined; visible: T[] } | null>(null);
  const capture = useCallback(
    (e: { api: GridApi<T> }) => {
      const visible: T[] = [];
      e.api.forEachNodeAfterFilter((node) => {
        if (node.data && !node.rowPinned) visible.push(node.data);
      });
      setCaptured({ source: rows, visible });
    },
    [rows],
  );
  const visible = captured && captured.source === rows ? captured.visible : (rows ?? []);
  return { visible, onFilterChanged: capture, onRowDataUpdated: capture };
}

/** Row id of a pinned totals row; never collides with a uuid. */
export const TOTALS_ROW_ID = "__totals";

/** Row class for pinned totals rows. */
export const totalsRowClass = { "!bg-canvas font-semibold": (p: { node: { rowPinned?: string | null } }) => p.node.rowPinned === "bottom" };
