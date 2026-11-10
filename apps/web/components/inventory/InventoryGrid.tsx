"use client";

import type { ColDef } from "ag-grid-community";
import type { CustomCellRendererProps } from "ag-grid-react";
import type { InventoryItemDto } from "@qm/contracts";
import { useCallback, useMemo } from "react";
import { ActionCell, controlColumn } from "@/components/grid/ActionCell";
import { DataGrid } from "@/components/grid/DataGrid";
import { EDITABLE_CELL, numberColumn, statusColumn, rightCell } from "@/components/grid/columns";
import { useInlineEditor, wholeNumberParser } from "@/components/grid/editing";
import { EDITABLE_INVENTORY_FIELDS, saveInventoryEdit, type EditableInventoryField } from "@/components/inventory/inventory-edits";
import { Button } from "@/components/ui/Button";
import { Notice } from "@/components/ui/Notice";
import { num } from "@/lib/format";
import { categoryLabel, STOCK_LABELS, STOCK_TONES, stockSeverity } from "@/lib/labels";

export function InventoryGrid({
  items,
  canAdjust,
  onAdjust,
  canEdit = false,
  onEdit,
  onItemSaved,
}: {
  items: InventoryItemDto[] | undefined;
  canAdjust: boolean;
  onAdjust: (item: InventoryItemDto) => void;
  /** Show "Edit" for an item's details, and allow typing over on-hand, safety stock and cover target. */
  canEdit?: boolean;
  onEdit?: (item: InventoryItemDto) => void;
  /** The server's version of an item after an in-grid edit. */
  onItemSaved?: (item: InventoryItemDto) => void;
}) {
  const inlineEditing = canEdit && Boolean(onItemSaved);
  const editor = useInlineEditor<InventoryItemDto>({
    save: saveInventoryEdit,
    onSaved: useCallback((item: InventoryItemDto) => onItemSaved?.(item), [onItemSaved]),
    rows: items,
    describe: useCallback((item: InventoryItemDto) => item.name, []),
    label: useCallback((field: string) => EDITABLE_INVENTORY_FIELDS[field as EditableInventoryField]?.label ?? field, []),
  });

  const columns = useMemo<ColDef<InventoryItemDto>[]>(() => {
    /** A whole-number column managers can type over (double-click, Enter or start typing). */
    const editableColumn = (field: EditableInventoryField, extra: Partial<ColDef<InventoryItemDto>> = {}): ColDef<InventoryItemDto> => {
      const spec = EDITABLE_INVENTORY_FIELDS[field];
      return numberColumn<InventoryItemDto>(field, spec.label, {
        ...extra,
        ...(inlineEditing
          ? {
              editable: true,
              cellClass: rightCell(EDITABLE_CELL),
              cellEditor: "agNumberCellEditor",
              cellEditorParams: { min: spec.min, max: spec.max, precision: 0, showStepperButtons: false },
              valueParser: wholeNumberParser(spec.min, spec.max),
              headerTooltip: `${spec.label}: double-click or press Enter to edit; saved at once.`,
            }
          : {}),
      });
    };
    const cols: ColDef<InventoryItemDto>[] = [
      {
        field: "name",
        headerName: "Item",
        pinned: "left",
        minWidth: 220,
        flex: 2,
        cellRenderer: (p: CustomCellRendererProps<InventoryItemDto>) =>
          p.data ? (
            <div className="flex h-full flex-col justify-center leading-tight">
              <span className="font-medium text-ink">{p.data.name}</span>
              <span className="font-mono text-[11px] text-ink-4">{p.data.sku}</span>
            </div>
          ) : null,
      },
      statusColumn<InventoryItemDto, InventoryItemDto["status"]>("status", "Status", STOCK_TONES, STOCK_LABELS, {
        minWidth: 130,
        comparator: (a: string, b: string) => stockSeverity(a) - stockSeverity(b),
      }),
      {
        field: "category",
        headerName: "Category",
        minWidth: 150,
        valueFormatter: (p) => categoryLabel(typeof p.value === "string" ? p.value : null),
      },
      editableColumn("on_hand", { minWidth: 110 }),
      numberColumn<InventoryItemDto>("inbound_confirmed", "Inbound"),
      numberColumn<InventoryItemDto>("committed", "Committed"),
      numberColumn<InventoryItemDto>("available", "Available", {
        cellClass: rightCell("font-medium"),
        valueFormatter: (p) => (p.data ? `${num(p.data.available)} ${p.data.unit}` : ""),
        minWidth: 120,
      }),
      numberColumn<InventoryItemDto>("avg_daily_usage", "Daily use", {
        valueFormatter: (p) => (typeof p.value === "number" ? num(p.value, 1) : "—"),
      }),
      numberColumn<InventoryItemDto>("days_of_cover", "Days of cover", {
        valueFormatter: (p) => (typeof p.value === "number" ? `${num(p.value, 1)} d` : "—"),
        sort: "asc",
        minWidth: 130,
      }),
      numberColumn<InventoryItemDto>("reorder_point", "Reorder at"),
      editableColumn("safety_stock", { minWidth: 120 }),
      editableColumn("coverage_days", { minWidth: 150 }),
      numberColumn<InventoryItemDto>("lead_time_days", "Lead time", {
        valueFormatter: (p) => (typeof p.value === "number" ? `${p.value} d` : "—"),
      }),
    ];
    const editable = canEdit && onEdit;
    if (canAdjust || editable) {
      const width = canAdjust && editable ? 170 : 100;
      cols.push({
        colId: "actions",
        headerName: "",
        pinned: "right",
        sortable: false,
        resizable: false,
        minWidth: width,
        maxWidth: width + 10,
        ...controlColumn<InventoryItemDto>(),
        cellRenderer: (p: CustomCellRendererProps<InventoryItemDto>) =>
          p.data ? (
            <ActionCell eGridCell={p.eGridCell}>
              {canAdjust ? (
                <Button size="sm" variant="secondary" onClick={() => p.data && onAdjust(p.data)} aria-label={`Adjust ${p.data.name}`}>
                  Adjust
                </Button>
              ) : null}
              {editable ? (
                <Button size="sm" variant="ghost" onClick={() => p.data && onEdit(p.data)} aria-label={`Edit details of ${p.data.name}`}>
                  Edit
                </Button>
              ) : null}
            </ActionCell>
          ) : null,
      });
    }
    return cols;
  }, [canAdjust, onAdjust, canEdit, onEdit, inlineEditing]);

  const last = editor.lastEdit;
  return (
    <>
      {inlineEditing ? (
        <p className="mb-2 text-[12.5px] text-ink-3">
          Type over <strong className="font-medium text-ink-2">On hand</strong>,{" "}
          <strong className="font-medium text-ink-2">Safety stock</strong> or{" "}
          <strong className="font-medium text-ink-2">Cover target</strong> to change them; each edit is saved and audited at once. An
          on-hand edit is recorded as a stock count.
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
      <DataGrid<InventoryItemDto>
        ariaLabel="Inventory items"
        rows={items}
        columns={columns}
        height={520}
        rowHeight={52}
        emptyMessage="No inventory items yet."
        // Few columns: render them all, so browser find (Ctrl/Cmd+F) sees every cell.
        suppressColumnVirtualisation
        stateKey="inventory"
        tools={{
          exportFileName: "inventory",
          actions: inlineEditing ? (
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
        onCellValueChanged={inlineEditing ? editor.onCellValueChanged : undefined}
        undoRedoCellEditing={inlineEditing}
        undoRedoCellEditingLimit={20}
        stopEditingWhenCellsLoseFocus
      />
    </>
  );
}
