"use client";

import type { ColDef, EditableCallbackParams } from "ag-grid-community";
import type { CustomCellRendererProps } from "ag-grid-react";
import type { CatalogItemDto } from "@qm/contracts";
import { useCallback, useMemo } from "react";
import { ActionCell, RowAction, controlColumn } from "@/components/grid/ActionCell";
import { DataGrid } from "@/components/grid/DataGrid";
import { EDITABLE_CELL, moneyColumn, numberColumn, rightCell } from "@/components/grid/columns";
import { moneyParser, useInlineEditor, wholeNumberParser } from "@/components/grid/editing";
import { EDITABLE_CATALOG_FIELDS, saveCatalogEdit, unitPriceMinor, type EditableCatalogField } from "@/components/suppliers/catalog-edits";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Notice } from "@/components/ui/Notice";
import { money } from "@/lib/format";
import { categoryLabel } from "@/lib/labels";

const AVAILABILITY = (v: unknown) => (v ? "In stock" : "Out of stock");

/**
 * A supplier's catalog. Managers type over a listing's pack price, pack size and availability;
 * each edit is saved at once and screened like any listing change. Quarantined listings stay
 * read-only here (their dialog explains why editing does not lift the quarantine).
 */
export function CatalogGrid({
  supplierId,
  items,
  stockNames,
  currency,
  onEdit,
  onItemSaved,
}: {
  supplierId: string;
  items: CatalogItemDto[];
  stockNames: Map<string, string>;
  currency: string;
  /** Opens the full listing dialog; also enables in-grid editing. */
  onEdit?: (item: CatalogItemDto) => void;
  onItemSaved: (item: CatalogItemDto) => void;
}) {
  const manage = Boolean(onEdit);
  const editor = useInlineEditor<CatalogItemDto>({
    save: useCallback(
      (before: CatalogItemDto, field: string, value: unknown) => saveCatalogEdit(supplierId, before, field, value),
      [supplierId],
    ),
    onSaved: onItemSaved,
    rows: items,
    describe: useCallback((item: CatalogItemDto) => item.sku, []),
    label: useCallback((field: string) => EDITABLE_CATALOG_FIELDS[field as EditableCatalogField] ?? field, []),
  });

  const columns = useMemo<ColDef<CatalogItemDto>[]>(() => {
    const editable = manage ? (p: EditableCallbackParams<CatalogItemDto>) => Boolean(p.data && !p.data.quarantined) : false;
    const editableClass = (base: string) =>
      manage
        ? { cellClassRules: { [EDITABLE_CELL]: (p: { data?: CatalogItemDto }) => Boolean(p.data && !p.data.quarantined) }, cellClass: base }
        : { cellClass: base };
    const tip = (label: string) => (manage ? { headerTooltip: `${label}: double-click or press Enter to edit; saved at once.` } : {});

    const cols: ColDef<CatalogItemDto>[] = [
      {
        field: "title",
        headerName: "Product",
        pinned: "left",
        minWidth: 240,
        flex: 2,
        cellRenderer: (p: CustomCellRendererProps<CatalogItemDto>) =>
          p.data ? (
            <div className="flex h-full flex-col justify-center leading-tight">
              <span className="font-medium text-ink">{p.data.title}</span>
              <span className="font-mono text-[11px] text-ink-4">{p.data.sku}</span>
            </div>
          ) : null,
        getQuickFilterText: (p) => (p.data ? `${p.data.title} ${p.data.sku}` : ""),
      },
      {
        field: "category",
        headerName: "Category",
        minWidth: 150,
        valueFormatter: (p) => categoryLabel(typeof p.value === "string" ? p.value : null),
      },
      {
        colId: "restocks",
        headerName: "Restocks",
        minWidth: 160,
        valueGetter: (p) => (p.data?.inventory_item_id ? (stockNames.get(p.data.inventory_item_id) ?? "Linked item") : "—"),
      },
      numberColumn<CatalogItemDto>("pack_quantity", EDITABLE_CATALOG_FIELDS.pack_quantity, {
        minWidth: 130,
        editable,
        cellEditor: "agNumberCellEditor",
        cellEditorParams: { min: 1, max: 1_000_000, precision: 0, showStepperButtons: false },
        valueParser: wholeNumberParser(1, 1_000_000),
        ...editableClass(rightCell()),
        ...tip(EDITABLE_CATALOG_FIELDS.pack_quantity),
      }),
      moneyColumn<CatalogItemDto>("unit_price_minor", EDITABLE_CATALOG_FIELDS.unit_price_minor, (r) => r.currency, {
        minWidth: 140,
        editable,
        cellDataType: false,
        // The editor shows dollars ("$54.00"); the parser turns what is typed back into minor units.
        cellEditor: "agTextCellEditor",
        cellEditorParams: { useFormatter: true },
        valueParser: moneyParser(currency),
        ...editableClass(rightCell("font-medium")),
        ...tip(EDITABLE_CATALOG_FIELDS.unit_price_minor),
      }),
      {
        colId: "unit_price",
        headerName: "Per unit",
        type: "rightAligned",
        cellClass: rightCell("text-ink-2"),
        minWidth: 110,
        valueGetter: (p) => (p.data ? unitPriceMinor(p.data) : null),
        valueFormatter: (p) => (p.data && typeof p.value === "number" ? money(Math.round(p.value), p.data.currency) : ""),
      },
      {
        field: "in_stock",
        headerName: EDITABLE_CATALOG_FIELDS.in_stock,
        minWidth: 140,
        editable,
        cellDataType: false,
        cellEditor: "agSelectCellEditor",
        cellEditorParams: { values: [true, false], formatValue: AVAILABILITY },
        valueFormatter: (p) => AVAILABILITY(p.value),
        ...editableClass(""),
        ...tip(EDITABLE_CATALOG_FIELDS.in_stock),
        cellRenderer: (p: CustomCellRendererProps<CatalogItemDto>) =>
          p.data ? <Badge tone={p.data.in_stock ? "allow" : "review"}>{AVAILABILITY(p.data.in_stock)}</Badge> : null,
      },
      {
        colId: "flags",
        headerName: "Flags",
        minWidth: 220,
        flex: 1,
        sortable: false,
        valueGetter: (p) =>
          p.data
            ? [p.data.quarantined ? `Quarantined: ${p.data.quarantine_reason ?? ""}` : "", p.data.recurring ? "Recurring" : ""]
                .join(" ")
                .trim()
            : "",
        tooltipValueGetter: (p) => (p.data?.quarantined ? (p.data.quarantine_reason ?? "Quarantined") : undefined),
        cellRenderer: (p: CustomCellRendererProps<CatalogItemDto>) =>
          p.data ? (
            <span className="inline-flex flex-wrap items-center gap-1.5">
              {p.data.quarantined ? (
                <Badge tone="block" title={p.data.quarantine_reason ?? undefined}>
                  Quarantined{p.data.quarantine_reason ? `: ${p.data.quarantine_reason}` : ""}
                </Badge>
              ) : null}
              {p.data.recurring ? <Badge tone="info">Recurring</Badge> : null}
            </span>
          ) : null,
      },
    ];
    if (onEdit) {
      cols.push({
        colId: "actions",
        headerName: "",
        pinned: "right",
        sortable: false,
        resizable: false,
        minWidth: 90,
        maxWidth: 100,
        ...controlColumn<CatalogItemDto>(),
        cellRenderer: (p: CustomCellRendererProps<CatalogItemDto>) =>
          p.data ? (
            <ActionCell eGridCell={p.eGridCell}>
              <RowAction onClick={() => p.data && onEdit(p.data)} aria-label={`Edit ${p.data.sku}`}>
                Edit
              </RowAction>
            </ActionCell>
          ) : null,
      });
    }
    return cols;
  }, [manage, onEdit, stockNames, currency]);

  const last = editor.lastEdit;
  return (
    <>
      {manage ? (
        <p className="mb-2 text-[12.5px] text-ink-3">
          Type over a price, pack size or availability to change it; quarantined listings can only be opened, not edited here.
        </p>
      ) : null}
      {editor.status ? (
        <Notice
          tone={editor.status.tone}
          live
          className="mb-2"
          action={
            <Button size="sm" variant="ghost" onClick={editor.clearStatus}>
              Dismiss
            </Button>
          }
        >
          {editor.status.text}
        </Notice>
      ) : null}
      <DataGrid<CatalogItemDto>
        ariaLabel="Catalog"
        rows={items}
        columns={columns}
        height={480}
        rowHeight={52}
        emptyMessage="No products yet."
        // Few columns: render them all, so browser find (Ctrl/Cmd+F) sees every cell.
        suppressColumnVirtualisation
        stateKey="supplier-catalog"
        tools={{
          exportFileName: "catalog",
          actions: manage ? (
            <Button
              size="sm"
              variant="ghost"
              onClick={() => void editor.undo()}
              disabled={!last || editor.saving}
              loading={editor.saving}
              aria-label={last ? `Undo last edit (${last.label})` : "Undo last edit"}
            >
              Undo last edit
            </Button>
          ) : undefined,
        }}
        onCellValueChanged={manage ? editor.onCellValueChanged : undefined}
        undoRedoCellEditing={manage}
        undoRedoCellEditingLimit={20}
        stopEditingWhenCellsLoseFocus
      />
    </>
  );
}
