"use client";

import {
  CellStyleModule,
  CheckboxEditorModule,
  ClientSideRowModelModule,
  ColumnApiModule,
  CsvExportModule,
  DateFilterModule,
  GridStateModule,
  HighlightChangesModule,
  ModuleRegistry,
  NumberEditorModule,
  NumberFilterModule,
  PaginationModule,
  PinnedRowModule,
  QuickFilterModule,
  RenderApiModule,
  RowAutoHeightModule,
  RowSelectionModule,
  RowStyleModule,
  SelectEditorModule,
  TextEditorModule,
  TextFilterModule,
  themeQuartz,
  TooltipModule,
  UndoRedoEditModule,
  ValidationModule,
  type ColDef,
  type GetRowIdParams,
  type GridState,
  type StateUpdatedEvent,
} from "ag-grid-community";
import { AgGridReact, type AgGridReactProps } from "ag-grid-react";
import { useCallback, useId, useMemo, useRef, useState } from "react";
import { Button } from "@/components/ui/Button";
import { cssColor } from "@/lib/theme";

// Only the features our grids use (AllCommunityModule was a 1.4 MB chunk). In development the
// ValidationModule warns in the console if a grid uses a feature whose module isn't listed here.
ModuleRegistry.registerModules([
  ClientSideRowModelModule, // rowData
  CellStyleModule, // cellClass / cellClassRules
  RowStyleModule, // rowClassRules
  RowAutoHeightModule, // autoHeight columns
  PaginationModule, // procurement request list
  TooltipModule, // tooltipValueGetter (hashes, ids)
  QuickFilterModule, // toolbar search
  TextFilterModule, // column filters
  NumberFilterModule,
  DateFilterModule,
  CsvExportModule, // toolbar export
  GridStateModule, // remembered sort, filters and column widths
  ColumnApiModule,
  TextEditorModule, // in-grid editing (stock levels, catalog prices)
  NumberEditorModule,
  CheckboxEditorModule,
  SelectEditorModule,
  UndoRedoEditModule, // Ctrl/Cmd+Z on edits
  HighlightChangesModule, // flash cells whose value changed
  RenderApiModule, // api.flashCells
  PinnedRowModule, // totals rows
  RowSelectionModule, // multi-row actions
  ...(process.env.NODE_ENV !== "production" ? [ValidationModule] : []),
]);

const STATE_PREFIX = "qm.grid.";

/** Saved sort, filters and column widths for a grid, or undefined (storage can be unavailable). */
function loadState(key: string | undefined): GridState | undefined {
  if (!key || typeof window === "undefined") return undefined;
  try {
    const raw = window.localStorage.getItem(STATE_PREFIX + key);
    return raw ? (JSON.parse(raw) as GridState) : undefined;
  } catch {
    return undefined;
  }
}

function saveState(key: string, state: GridState): void {
  try {
    // Only what a person arranged; never row data or selection.
    const { sort, filter, columnSizing, columnVisibility, columnOrder } = state;
    window.localStorage.setItem(STATE_PREFIX + key, JSON.stringify({ sort, filter, columnSizing, columnVisibility, columnOrder }));
  } catch {
    /* private mode or full storage: the layout simply is not remembered */
  }
}

/**
 * Quartermaster grid theme via the AG Grid Theming API. Inherits the app font
 * (instead of letting Quartz fetch a Google font) and points every colour at the
 * design tokens in globals.css (AG Grid emits params as CSS, so `var()` works).
 */
export const gridTheme = themeQuartz.withParams({
  fontFamily: "inherit",
  fontSize: 13,
  headerFontSize: 12,
  headerFontWeight: 500,
  foregroundColor: cssColor("ink"),
  textColor: cssColor("ink"),
  headerTextColor: cssColor("ink-2"),
  backgroundColor: cssColor("surface"),
  headerBackgroundColor: cssColor("canvas"),
  borderColor: cssColor("line"),
  rowBorder: { color: cssColor("line") },
  accentColor: cssColor("accent"),
  rowHoverColor: `color-mix(in srgb, ${cssColor("accent-soft")} 60%, ${cssColor("surface")})`,
  selectedRowBackgroundColor: cssColor("accent-soft"),
  wrapperBorderRadius: 12,
  borderRadius: 6,
  spacing: 7,
  rowHeight: 44,
  headerHeight: 40,
  browserColorScheme: "light",
});

export interface DataGridProps<T extends { id: string }> extends Omit<
  AgGridReactProps<T>,
  "rowData" | "columnDefs" | "theme" | "getRowId" | "toolbar"
> {
  rows: T[] | undefined;
  columns: ColDef<T>[];
  /**
   * Maximum pixel height. Grids with few rows grow with their content instead
   * (autoHeight layout) so short lists don't leave a tall empty box.
   */
  height?: number;
  /** Row count up to which the grid sizes to its content. Default 10. */
  autoHeightRows?: number;
  emptyMessage?: string;
  /** Accessible name for the grid region. */
  ariaLabel: string;
  /**
   * Toolbar above the grid: a search box filtering every column, a row count and an
   * "Export CSV" button (the file name, without extension). Column filters are turned on too.
   */
  tools?: GridTools;
  /** Remember this grid's sort, filters and column widths in the browser under this key. */
  stateKey?: string;
}

export interface GridTools {
  /** Search box filtering every column (default on). */
  search?: boolean;
  /** Enables "Export CSV" with this file name (without extension). */
  exportFileName?: string;
  /** Extra buttons on the right of the toolbar. */
  actions?: React.ReactNode;
}

/**
 * A cell as CSV text that spreadsheets will not run as a formula. Supplier names, listings and
 * invoice notes are outside input, so text starting with = + - @ or a tab/CR is prefixed with a
 * quote (OWASP CSV injection guidance). Plain numbers and money such as "-$5.00" are left alone.
 */
export function csvSafe(value: unknown): string {
  const text = value === null || value === undefined ? "" : typeof value === "string" ? value : JSON.stringify(value);
  if (!/^[=+\-@\t\r]/.test(text) || /^-?\$?[\d.,]+$/.test(text)) return text;
  return `'${text}`;
}

/** Columns that hold buttons or links: never exported or filtered. */
const isControlColumn = (c: ColDef<unknown>) => c.colId === "actions" || c.colId === "select" || c.context?.control === true;

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
  autoHeightRows = 10,
  tools: toolbar,
  stateKey,
  ...rest
}: DataGridProps<T>) {
  const gridRef = useRef<AgGridReact<T>>(null);
  const searchId = useId();
  const [search, setSearch] = useState("");
  const [shown, setShown] = useState<number | null>(null);
  const initialState = useMemo(() => loadState(stateKey), [stateKey]);
  const getRowId = useCallback((p: GetRowIdParams<T>) => p.data.id, []);
  const colDefaults = useMemo<ColDef<T>>(
    () => ({
      sortable: true,
      resizable: true,
      suppressMovable: true,
      minWidth: 90,
      ...(toolbar ? { filter: true } : {}),
      ...defaultColDef,
    }),
    [defaultColDef, toolbar],
  );
  const columnDefs = useMemo(
    () => (toolbar ? columns.map((c) => (isControlColumn(c as ColDef<unknown>) ? { ...c, filter: false } : c)) : columns),
    [columns, toolbar],
  );
  const autoHeight = height === undefined || (rows?.length ?? 0) <= autoHeightRows;
  const countShown = useCallback(() => setShown(gridRef.current?.api?.getDisplayedRowCount() ?? null), []);
  const onStateUpdated = useCallback(
    (e: StateUpdatedEvent<T>) => {
      if (stateKey) saveState(stateKey, e.state);
    },
    [stateKey],
  );

  const exportFileName = toolbar?.exportFileName;
  const exportCsv = useCallback(() => {
    const api = gridRef.current?.api;
    if (!api || !exportFileName) return;
    const keys = (api.getColumns() ?? []).filter((c) => !isControlColumn(c.getColDef() as ColDef<unknown>)).map((c) => c.getColId());
    api.exportDataAsCsv({
      fileName: `${exportFileName}.csv`,
      columnKeys: keys,
      // Export what people see (formatted money, dates, labels), not raw minor units or enums.
      processCellCallback: (p) => csvSafe(p.column.getColDef().valueFormatter ? p.formatValue(p.value) : p.value),
    });
  }, [exportFileName]);

  const total = rows?.length ?? 0;
  return (
    <div className="w-full">
      {toolbar ? (
        <div className="mb-2 flex flex-wrap items-center gap-2" role="toolbar" aria-label={`${ariaLabel} tools`}>
          {toolbar.search !== false ? (
            <>
              <label htmlFor={searchId} className="sr-only">
                Search {ariaLabel.toLowerCase()}
              </label>
              <input
                id={searchId}
                type="search"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search…"
                className="h-8 w-56 rounded-md border border-line-strong bg-surface px-2.5 text-[13px] text-ink placeholder:text-ink-4 focus:border-accent focus:outline-none"
              />
            </>
          ) : null}
          <span className="text-[12.5px] text-ink-3 tnum" aria-live="polite">
            {rows === undefined
              ? ""
              : shown !== null && shown !== total
                ? `${shown} of ${total}`
                : `${total} ${total === 1 ? "row" : "rows"}`}
          </span>
          <div className="ml-auto flex items-center gap-2">
            {toolbar.actions}
            {toolbar.exportFileName ? (
              <Button size="sm" variant="secondary" onClick={exportCsv} disabled={!total}>
                Export CSV
              </Button>
            ) : null}
          </div>
        </div>
      ) : null}
      <div role="region" aria-label={ariaLabel} style={autoHeight ? undefined : { height }} className="w-full">
        <AgGridReact<T>
          ref={gridRef}
          theme={gridTheme}
          rowData={rows ?? null}
          columnDefs={columnDefs}
          defaultColDef={colDefaults}
          getRowId={getRowId}
          loading={rows === undefined}
          domLayout={autoHeight ? "autoHeight" : "normal"}
          overlayNoRowsTemplate={`<span class="text-[13px] text-ink-3">${escapeHtml(emptyMessage)}</span>`}
          quickFilterText={toolbar ? search : undefined}
          initialState={initialState}
          onStateUpdated={stateKey ? onStateUpdated : undefined}
          onModelUpdated={toolbar ? countShown : undefined}
          enableCellTextSelection
          ensureDomOrder
          suppressCellFocus={false}
          animateRows={false}
          {...rest}
        />
      </div>
    </div>
  );
}
