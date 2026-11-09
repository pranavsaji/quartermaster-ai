"use client";

import { AllCommunityModule, ModuleRegistry, themeQuartz, type ColDef, type GetRowIdParams } from "ag-grid-community";
import { AgGridReact, type AgGridReactProps } from "ag-grid-react";
import { useCallback, useMemo } from "react";

// Community features only; registered once per bundle.
ModuleRegistry.registerModules([AllCommunityModule]);

/**
 * Quartermaster grid theme via the AG Grid Theming API. Inherits the app font
 * (instead of letting Quartz fetch a Google font) and uses our ink/line tokens.
 */
export const gridTheme = themeQuartz.withParams({
  fontFamily: "inherit",
  fontSize: 13,
  headerFontSize: 12,
  headerFontWeight: 500,
  foregroundColor: "#101828",
  textColor: "#101828",
  headerTextColor: "#475467",
  backgroundColor: "#ffffff",
  headerBackgroundColor: "#f9fafb",
  borderColor: "#e4e7ec",
  rowBorder: { color: "#eef0f3" },
  accentColor: "#2453d8",
  rowHoverColor: "#f5f8ff",
  selectedRowBackgroundColor: "#eef3ff",
  wrapperBorderRadius: 12,
  borderRadius: 6,
  spacing: 7,
  rowHeight: 44,
  headerHeight: 40,
  browserColorScheme: "light",
});

export interface DataGridProps<T extends { id: string }>
  extends Omit<AgGridReactProps<T>, "rowData" | "columnDefs" | "theme" | "getRowId"> {
  rows: T[] | undefined;
  columns: ColDef<T>[];
  /** Fixed pixel height; omit to grow with content (autoHeight layout). */
  height?: number;
  emptyMessage?: string;
  /** Accessible name for the grid region. */
  ariaLabel: string;
}

function escapeHtml(text: string): string {
  return text.replace(/[&<>"']/g, (c) => `&#${c.charCodeAt(0)};`);
}

export function DataGrid<T extends { id: string }>({
  rows,
  columns,
  height,
  emptyMessage = "Nothing to show yet.",
  ariaLabel,
  defaultColDef,
  ...rest
}: DataGridProps<T>) {
  const getRowId = useCallback((p: GetRowIdParams<T>) => p.data.id, []);
  const colDefaults = useMemo<ColDef<T>>(
    () => ({ sortable: true, resizable: true, suppressMovable: true, minWidth: 90, ...defaultColDef }),
    [defaultColDef],
  );
  const autoHeight = height === undefined;

  return (
    <div role="region" aria-label={ariaLabel} style={autoHeight ? undefined : { height }} className="w-full">
      <AgGridReact<T>
        theme={gridTheme}
        rowData={rows ?? null}
        columnDefs={columns}
        defaultColDef={colDefaults}
        getRowId={getRowId}
        loading={rows === undefined}
        domLayout={autoHeight ? "autoHeight" : "normal"}
        overlayNoRowsTemplate={`<span class="text-[13px] text-ink-3">${escapeHtml(emptyMessage)}</span>`}
        enableCellTextSelection
        ensureDomOrder
        suppressCellFocus={false}
        animateRows={false}
        {...rest}
      />
    </div>
  );
}
