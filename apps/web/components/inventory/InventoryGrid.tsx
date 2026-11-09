"use client";

import type { ColDef } from "ag-grid-community";
import type { CustomCellRendererProps } from "ag-grid-react";
import type { InventoryItemDto } from "@qm/contracts";
import { useMemo } from "react";
import { ActionCell, controlColumn } from "@/components/grid/ActionCell";
import { DataGrid } from "@/components/grid/DataGrid";
import { numberColumn, statusColumn, rightCell } from "@/components/grid/columns";
import { Button } from "@/components/ui/Button";
import { num } from "@/lib/format";
import { categoryLabel, STOCK_LABELS, STOCK_TONES } from "@/lib/labels";

export function InventoryGrid({
  items,
  canAdjust,
  onAdjust,
}: {
  items: InventoryItemDto[] | undefined;
  canAdjust: boolean;
  onAdjust: (item: InventoryItemDto) => void;
}) {
  const columns = useMemo<ColDef<InventoryItemDto>[]>(() => {
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
        comparator: (a: string, b: string) => ["OUT", "CRITICAL", "LOW", "OK"].indexOf(a) - ["OUT", "CRITICAL", "LOW", "OK"].indexOf(b),
      }),
      {
        field: "category",
        headerName: "Category",
        minWidth: 150,
        valueFormatter: (p) => categoryLabel(typeof p.value === "string" ? p.value : null),
      },
      numberColumn<InventoryItemDto>("on_hand", "On hand"),
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
      numberColumn<InventoryItemDto>("safety_stock", "Safety stock"),
      numberColumn<InventoryItemDto>("lead_time_days", "Lead time", {
        valueFormatter: (p) => (typeof p.value === "number" ? `${p.value} d` : "—"),
      }),
    ];
    if (canAdjust) {
      cols.push({
        colId: "actions",
        headerName: "",
        pinned: "right",
        sortable: false,
        resizable: false,
        minWidth: 100,
        maxWidth: 110,
        ...controlColumn<InventoryItemDto>(),
        cellRenderer: (p: CustomCellRendererProps<InventoryItemDto>) =>
          p.data ? (
            <ActionCell eGridCell={p.eGridCell}>
              <Button size="sm" variant="secondary" onClick={() => p.data && onAdjust(p.data)} aria-label={`Adjust ${p.data.name}`}>
                Adjust
              </Button>
            </ActionCell>
          ) : null,
      });
    }
    return cols;
  }, [canAdjust, onAdjust]);

  return (
    <DataGrid<InventoryItemDto>
      ariaLabel="Inventory items"
      rows={items}
      columns={columns}
      height={520}
      rowHeight={52}
      emptyMessage="No inventory items yet."
    />
  );
}
