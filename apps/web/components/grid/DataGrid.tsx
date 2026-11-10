"use client";

import {
  CellStyleModule,
  CheckboxEditorModule,
  ClientSideRowModelApiModule,
  ClientSideRowModelModule,
  ColumnApiModule,
  ColumnAutoSizeModule,
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
  RowApiModule,
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
  type ColumnResizedEvent,
  type GetRowIdParams,
  type GridApi,
  type GridState,
  type StateUpdatedEvent,
} from "ag-grid-community";
import { AgGridReact, type AgGridReactProps } from "ag-grid-react";
import { useCallback, useId, useMemo, useRef, useState } from "react";
import { Icons } from "@/components/shell/icons";
import { Button } from "@/components/ui/Button";
import { Popover } from "@/components/ui/Popover";
import { cssColor } from "@/lib/theme";

// Only the features our grids use (AllCommunityModule was a 1.4 MB chunk). In development the
// ValidationModule warns in the console if a grid uses a feature whose module isn't listed here.
ModuleRegistry.registerModules([
  ClientSideRowModelModule, // rowData
  ClientSideRowModelApiModule, // api.forEachNodeAfterFilter (totals rows that follow filters)
  RowApiModule, // api.getDisplayedRowCount (toolbar row count)
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
  ColumnApiModule, // the column chooser
  ColumnAutoSizeModule, // fitting columns to the grid width or their content
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

/**
 * Remembers what a person arranged; never row data or selection. Column widths are kept only
 * once someone has dragged a column edge: widths the grid fitted itself are worked out again for
 * whatever screen the grid is shown on next.
 */
function saveState(key: string, state: GridState, keepSizing: boolean): void {
  try {
    const { sort, filter, columnSizing, columnVisibility, columnOrder } = state;
    window.localStorage.setItem(
      STATE_PREFIX + key,
      JSON.stringify({ sort, filter, columnSizing: keepSizing ? columnSizing : undefined, columnVisibility, columnOrder }),
    );
  } catch {
    /* private mode or full storage: the layout simply is not remembered */
  }
}

/** Below this grid width, columns marked `context: { secondary: true }` start hidden (phones). */
export const NARROW_GRID_PX = 640;

/** Column settings the DataGrid reads from `colDef.context`. */
export interface GridColumnContext {
  /** Buttons or links: never exported, filtered or offered in the column chooser. */
  control?: boolean;
  /** Detail people can live without on a phone: hidden while the grid is narrower than NARROW_GRID_PX. */
  secondary?: boolean;
}

function contextOf(c: ColDef<unknown>): GridColumnContext {
  return (c.context ?? {}) as GridColumnContext;
}

/**
 * Fits the columns to the grid's width. When every displayed column fits at its minimum width,
 * flex columns (or, without any, a proportional spread) fill the width; otherwise every column
 * shrinks to its content, so as many as possible show before the grid scrolls sideways (the
 * grids that need it pin their first column).
 */
export function fitColumns<T>(api: GridApi<T>, width: number, defaultMinWidth: number): "fit" | "content" | null {
  const cols = api.getAllDisplayedColumns();
  if (width <= 0 || cols.length === 0) return null;
  const needed = cols.reduce((sum, c) => sum + (c.getColDef().minWidth ?? defaultMinWidth), 0);
  if (needed <= width) {
    if (!cols.some((c) => c.getFlex())) api.sizeColumnsToFit();
    return "fit";
  }
  // Flex columns (long free text) keep their minimum width; sized to content they would be the widest.
  // Wrapping columns keep their set width too: measured unwrapped, a long product name would win.
  api.autoSizeColumns(cols.filter((c) => !c.getFlex() && !c.getColDef().wrapText).map((c) => c.getColId()));
  return "content";
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
  headerFontWeight: 600,
  foregroundColor: cssColor("ink"),
  textColor: cssColor("ink"),
  headerTextColor: cssColor("ink-3"),
  backgroundColor: cssColor("surface"),
  // A whisper of the canvas, so the header reads as a header without a grey slab.
  headerBackgroundColor: `color-mix(in srgb, ${cssColor("canvas")} 70%, ${cssColor("surface")})`,
  borderColor: cssColor("line"),
  rowBorder: { color: cssColor("line") },
  // No vertical rules: columns are separated by alignment and space, not lines.
  columnBorder: false,
  headerColumnBorder: false,
  headerColumnResizeHandleColor: "transparent",
  accentColor: cssColor("accent"),
  rowHoverColor: `color-mix(in srgb, ${cssColor("accent-soft")} 55%, ${cssColor("surface")})`,
  selectedRowBackgroundColor: cssColor("accent-soft"),
  wrapperBorderRadius: 10,
  borderRadius: 6,
  spacing: 7,
  cellHorizontalPaddingScale: 1.1,
  iconSize: 14,
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
  /** Title of the "no rows" overlay. */
  emptyMessage?: string;
  /** One line under the empty title: what fills this grid, or what to do next. */
  emptyDescription?: string;
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
  /** A "Columns" menu to show or hide columns (remembered with `stateKey`). */
  columns?: boolean;
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
const isControlColumn = (c: ColDef<unknown>) => c.colId === "actions" || c.colId === "select" || contextOf(c).control === true;

function escapeHtml(text: string): string {
  return text.replace(/[&<>"']/g, (c) => `&#${c.charCodeAt(0)};`);
}

const EMPTY_ICON =
  '<svg viewBox="0 0 20 20" width="18" height="18" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M3 11.5 5 5h10l2 6.5V15a1.5 1.5 0 0 1-1.5 1.5h-11A1.5 1.5 0 0 1 3 15v-3.5Z"/><path d="M3 11.5h4l1 2h4l1-2h4"/></svg>';

/** The "no rows" overlay, in the same shape as <EmptyState compact> (AG Grid takes it as HTML). */
export function emptyOverlayHtml(title: string, description?: string): string {
  return (
    `<div class="qm-grid-empty"><span class="qm-grid-empty-icon">${EMPTY_ICON}</span>` +
    `<span class="qm-grid-empty-title">${escapeHtml(title)}</span>` +
    (description ? `<span class="qm-grid-empty-text">${escapeHtml(description)}</span>` : "") +
    "</div>"
  );
}

const columnId = <T,>(c: ColDef<T>): string => c.colId ?? (typeof c.field === "string" ? c.field : "") ?? "";

/** Toolbar menu that shows or hides the grid's data columns. */
function ColumnChooser<T>({ api, columns }: { api: GridApi<T> | undefined; columns: ColDef<T>[] }) {
  const choices = columns.filter((c) => !isControlColumn(c as ColDef<unknown>) && c.headerName && c.pinned !== "left" && columnId(c));
  return (
    <Popover
      label="Columns"
      trigger={
        <>
          <Icons.columns className="size-4 text-ink-3" />
          <span className="max-sm:sr-only">Columns</span>
        </>
      }
      triggerClassName="inline-flex h-8 items-center gap-1.5 rounded-md border border-line-strong bg-surface px-2.5 text-sm font-medium text-ink-2 shadow-sm hover:bg-canvas hover:text-ink"
      panelClassName="max-h-80 overflow-y-auto"
    >
      <p className="px-2.5 pt-1 pb-1.5 text-2xs font-medium text-ink-3">Show columns</p>
      {choices.map((c) => {
        const id = columnId(c);
        return (
          <label key={id} className="flex cursor-pointer items-center gap-2.5 rounded-md px-2.5 py-1.5 text-sm text-ink-2 hover:bg-canvas">
            <input
              type="checkbox"
              className="size-4 accent-[var(--color-accent)]"
              defaultChecked={api?.getColumn(id)?.isVisible() ?? !c.hide}
              onChange={(e) => api?.setColumnsVisible([id], e.target.checked)}
            />
            {c.headerName}
          </label>
        );
      })}
    </Popover>
  );
}

export function DataGrid<T extends { id: string }>({
  rows,
  columns,
  height,
  emptyMessage = "Nothing here yet",
  emptyDescription,
  ariaLabel,
  defaultColDef,
  autoHeightRows = 10,
  tools: toolbar,
  stateKey,
  onGridReady,
  onFirstDataRendered,
  onGridSizeChanged,
  onColumnResized,
  onColumnVisible,
  ...rest
}: DataGridProps<T>) {
  const gridRef = useRef<AgGridReact<T>>(null);
  const searchId = useId();
  const [search, setSearch] = useState("");
  const [shown, setShown] = useState<number | null>(null);
  const [api, setApi] = useState<GridApi<T>>();
  const initialState = useMemo(() => loadState(stateKey), [stateKey]);
  // Widths someone dragged are theirs; until then the grid fits itself to every screen.
  const userSized = useRef(Boolean(initialState?.columnSizing));
  const narrow = useRef<boolean | null>(null);
  const hiddenForNarrow = useRef<string[]>([]);
  const gridWidth = useRef(0);
  const getRowId = useCallback((p: GetRowIdParams<T>) => p.data.id, []);
  const colDefaults = useMemo<ColDef<T>>(
    () => ({
      sortable: true,
      resizable: true,
      suppressMovable: true,
      minWidth: 90,
      // Long headers wrap rather than force a wide column ("Days of cover" over "2.4 d").
      wrapHeaderText: true,
      autoHeaderHeight: true,
      ...(toolbar ? { filter: true } : {}),
      ...defaultColDef,
    }),
    [defaultColDef, toolbar],
  );
  const defaultMinWidth = colDefaults.minWidth ?? 90;
  const columnDefs = useMemo(
    () => (toolbar ? columns.map((c) => (isControlColumn(c as ColDef<unknown>) ? { ...c, filter: false } : c)) : columns),
    [columns, toolbar],
  );
  const autoHeight = height === undefined || (rows?.length ?? 0) <= autoHeightRows;
  const countShown = useCallback(() => setShown(gridRef.current?.api?.getDisplayedRowCount() ?? null), []);
  const onStateUpdated = useCallback(
    (e: StateUpdatedEvent<T>) => {
      if (stateKey) saveState(stateKey, e.state, userSized.current);
    },
    [stateKey],
  );

  const layout = useCallback(
    (gridApi: GridApi<T>, width: number) => {
      if (width <= 0) return;
      gridWidth.current = width;
      const isNarrow = width < NARROW_GRID_PX;
      if (narrow.current !== isNarrow) {
        // Hidden on a phone, and only the ones that were showing come back when the grid grows past
        // the breakpoint: the first wide render leaves everything alone, so a column hidden by
        // default or on purpose stays hidden.
        if (isNarrow) {
          const secondary = (gridApi.getColumns() ?? []).filter(
            (c) => c.isVisible() && contextOf(c.getColDef() as ColDef<unknown>).secondary,
          );
          hiddenForNarrow.current = secondary.map((c) => c.getColId());
          if (secondary.length > 0) gridApi.setColumnsVisible(secondary, false);
        } else if (narrow.current === true && hiddenForNarrow.current.length > 0) {
          gridApi.setColumnsVisible(hiddenForNarrow.current, true);
          hiddenForNarrow.current = [];
        }
        // Columns pinned right (row actions) would take a third of a phone screen: they scroll with the row there.
        const pinnedRight = (gridApi.getColumns() ?? []).filter((c) => c.getColDef().pinned === "right");
        if (pinnedRight.length > 0 && (isNarrow || narrow.current === true))
          gridApi.setColumnsPinned(pinnedRight, isNarrow ? null : "right");
        narrow.current = isNarrow;
      }
      if (!userSized.current) fitColumns(gridApi, width, defaultMinWidth);
    },
    [defaultMinWidth],
  );

  const exportFileName = toolbar?.exportFileName;
  const exportCsv = useCallback(() => {
    const gridApi = gridRef.current?.api;
    if (!gridApi || !exportFileName) return;
    const keys = (gridApi.getColumns() ?? []).filter((c) => !isControlColumn(c.getColDef() as ColDef<unknown>)).map((c) => c.getColId());
    gridApi.exportDataAsCsv({
      fileName: `${exportFileName}.csv`,
      columnKeys: keys,
      // Totals rows are a view summary, not data.
      skipPinnedTop: true,
      skipPinnedBottom: true,
      // Export what people see (formatted money, dates, labels), not raw minor units or enums.
      processCellCallback: (p) => csvSafe(p.column.getColDef().valueFormatter ? p.formatValue(p.value) : p.value),
    });
  }, [exportFileName]);

  const total = rows?.length ?? 0;
  return (
    <div className="w-full min-w-0">
      {toolbar ? (
        <div className="mb-2 flex flex-wrap items-center gap-2" role="toolbar" aria-label={`${ariaLabel} tools`}>
          {toolbar.search !== false ? (
            <>
              <label htmlFor={searchId} className="sr-only">
                Search {ariaLabel.toLowerCase()}
              </label>
              <div className="relative min-w-0 flex-1 sm:flex-none">
                <svg
                  aria-hidden
                  viewBox="0 0 20 20"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth={1.8}
                  className="pointer-events-none absolute top-1/2 left-2.5 size-3.5 -translate-y-1/2 text-ink-4"
                >
                  <circle cx="8.5" cy="8.5" r="5.5" />
                  <path d="m13 13 4 4" strokeLinecap="round" />
                </svg>
                <input
                  id={searchId}
                  type="search"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search"
                  className="h-8 w-full rounded-md border border-line-strong bg-surface pr-2.5 pl-8 text-sm text-ink shadow-xs placeholder:text-ink-4 focus:border-accent focus:ring-3 focus:ring-accent/15 focus:outline-none sm:w-60"
                />
              </div>
            </>
          ) : null}
          <span className="text-xs text-ink-3 tnum" aria-live="polite">
            {rows === undefined
              ? ""
              : shown !== null && shown !== total
                ? `${shown} of ${total}`
                : `${total} ${total === 1 ? "row" : "rows"}`}
          </span>
          <div className="ml-auto flex items-center gap-2">
            {toolbar.actions}
            {toolbar.columns ? <ColumnChooser api={api} columns={columnDefs} /> : null}
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
          overlayNoRowsTemplate={emptyOverlayHtml(emptyMessage, emptyDescription)}
          quickFilterText={toolbar ? search : undefined}
          initialState={initialState}
          onStateUpdated={stateKey ? onStateUpdated : undefined}
          onModelUpdated={toolbar ? countShown : undefined}
          onGridReady={(e) => {
            setApi(e.api);
            onGridReady?.(e);
          }}
          onFirstDataRendered={(e) => {
            layout(e.api, gridWidth.current);
            onFirstDataRendered?.(e);
          }}
          onGridSizeChanged={(e) => {
            layout(e.api, e.clientWidth);
            onGridSizeChanged?.(e);
          }}
          onColumnResized={(e: ColumnResizedEvent<T>) => {
            if (e.source === "uiColumnResized" && e.finished) userSized.current = true;
            onColumnResized?.(e);
          }}
          onColumnVisible={(e) => {
            if (!userSized.current) fitColumns(e.api, gridWidth.current, defaultMinWidth);
            onColumnVisible?.(e);
          }}
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
