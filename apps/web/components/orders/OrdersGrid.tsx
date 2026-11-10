"use client";

import type { ColDef } from "ag-grid-community";
import type { CustomCellRendererProps } from "ag-grid-react";
import type { DeliveryDto, PurchaseOrderDto } from "@qm/contracts";
import Link from "next/link";
import { useMemo } from "react";
import { ActionCell, RowAction, controlColumn } from "@/components/grid/ActionCell";
import { DataGrid } from "@/components/grid/DataGrid";
import { TOTALS_ROW_ID, totalsRowClass, useFilteredRows } from "@/components/grid/use-filtered-rows";
import { dateTimeColumn, moneyColumn, statusColumn } from "@/components/grid/columns";
import { StatusBadge } from "@/components/ui/Badge";
import { date, dateTime } from "@/lib/format";
import { DELIVERY_STATUS_TONES, OPEN_DELIVERY_STATUSES, PAYMENT_STATUS_TONES, PO_STATUS_TONES } from "@/lib/labels";

export type OrderRow = PurchaseOrderDto & { delivery_view: DeliveryDto | null };

/** Orders whose payment PayPal has captured. */
const PAID_STATUSES: ReadonlySet<PurchaseOrderDto["status"]> = new Set(["PAID", "FULFILLED"]);

export interface OrderTotals {
  orders: number;
  paid: number;
  paidMinor: number;
  currency: string;
}

/** Count and captured spend of the given (visible) orders. */
export function orderTotals(rows: readonly OrderRow[]): OrderTotals {
  const paid = rows.filter((r) => PAID_STATUSES.has(r.status));
  return {
    orders: rows.length,
    paid: paid.length,
    paidMinor: paid.reduce((sum, r) => sum + r.total_minor, 0),
    currency: rows[0]?.currency ?? "USD",
  };
}

/** The pinned totals row: only the fields the columns read. */
function totalsRow(t: OrderTotals): OrderRow {
  return {
    id: TOTALS_ROW_ID,
    number: "Total (paid)",
    supplier_name: `${t.orders} ${t.orders === 1 ? "order" : "orders"} · ${t.paid} paid`,
    total_minor: t.paidMinor,
    currency: t.currency,
    payment: null,
    delivery_view: null,
  } as unknown as OrderRow;
}

export function OrdersGrid({
  rows,
  canManage,
  canInvoice,
  onReceive,
  onDelay,
  onInvoice,
}: {
  rows: OrderRow[] | undefined;
  canManage: boolean;
  canInvoice: boolean;
  onReceive: (row: OrderRow) => void;
  onDelay: (row: OrderRow) => void;
  onInvoice: (row: OrderRow) => void;
}) {
  const columns = useMemo<ColDef<OrderRow>[]>(() => {
    const cols: ColDef<OrderRow>[] = [
      {
        field: "number",
        headerName: "PO",
        pinned: "left",
        minWidth: 140,
        ...controlColumn<OrderRow>(),
        cellRenderer: (p: CustomCellRendererProps<OrderRow>) =>
          p.node.rowPinned ? (
            <span className="text-[12.5px] font-semibold text-ink">{p.data?.number}</span>
          ) : p.data ? (
            p.data.request_id ? (
              <ActionCell eGridCell={p.eGridCell}>
                <Link href={`/procurement/${p.data.request_id}#proposals`} className="font-mono text-[12.5px] text-accent hover:underline">
                  {p.data.number}
                </Link>
              </ActionCell>
            ) : (
              <span className="font-mono text-[12.5px]">{p.data.number}</span>
            )
          ) : null,
      },
      { field: "supplier_name", headerName: "Supplier", minWidth: 180, flex: 1 },
      statusColumn<OrderRow, PurchaseOrderDto["status"]>("status", "Order", PO_STATUS_TONES, undefined, { minWidth: 140 }),
      moneyColumn<OrderRow>("total_minor", "Total", (r) => r.currency, { minWidth: 120 }),
      {
        colId: "payment",
        headerName: "Payment",
        minWidth: 160,
        valueGetter: (p) => p.data?.payment?.status ?? null,
        cellRenderer: (p: CustomCellRendererProps<OrderRow>) =>
          p.node.rowPinned ? null : p.data?.payment ? (
            <StatusBadge status={p.data.payment.status} tones={PAYMENT_STATUS_TONES} kind="Payment" />
          ) : (
            <span className="text-ink-4">—</span>
          ),
      },
      {
        colId: "delivery",
        headerName: "Delivery",
        minWidth: 150,
        valueGetter: (p) => p.data?.delivery_view?.status ?? null,
        cellRenderer: (p: CustomCellRendererProps<OrderRow>) =>
          p.node.rowPinned ? null : p.data?.delivery_view ? (
            <StatusBadge status={p.data.delivery_view.status} tones={DELIVERY_STATUS_TONES} kind="Delivery" />
          ) : (
            <span className="text-ink-4">—</span>
          ),
      },
      {
        colId: "expected",
        headerName: "Expected",
        minWidth: 130,
        cellClass: "tnum",
        valueGetter: (p) => p.data?.delivery_view?.expected_date ?? null,
        valueFormatter: (p) => (p.node?.rowPinned ? "" : typeof p.value === "string" ? date(p.value) : "—"),
      },
      dateTimeColumn<OrderRow>("created_at", "Created", {
        sort: "desc",
        minWidth: 150,
        valueFormatter: (p) => (p.node?.rowPinned ? "" : typeof p.value === "string" ? dateTime(p.value) : "—"),
      }),
    ];
    if (canManage || canInvoice) {
      cols.push({
        colId: "actions",
        headerName: "Actions",
        pinned: "right",
        sortable: false,
        minWidth: 250,
        ...controlColumn<OrderRow>(),
        cellRenderer: (p: CustomCellRendererProps<OrderRow>) => {
          const row = p.data;
          if (!row || p.node.rowPinned) return null;
          const open = row.delivery_view !== null && OPEN_DELIVERY_STATUSES.has(row.delivery_view.status);
          return (
            <ActionCell eGridCell={p.eGridCell}>
              {canManage && open ? (
                <>
                  <RowAction onClick={() => onReceive(row)} aria-label={`Mark ${row.number} received`}>
                    Receive
                  </RowAction>
                  <RowAction onClick={() => onDelay(row)} aria-label={`Report delay for ${row.number}`}>
                    Delay
                  </RowAction>
                </>
              ) : null}
              {canInvoice ? (
                <RowAction onClick={() => onInvoice(row)} aria-label={`Analyze an invoice for ${row.number}`}>
                  Invoice
                </RowAction>
              ) : null}
            </ActionCell>
          );
        },
      });
    }
    return cols;
  }, [canManage, canInvoice, onReceive, onDelay, onInvoice]);

  const filtered = useFilteredRows(rows);
  const pinned = useMemo(
    () => (rows && rows.length > 0 ? [totalsRow(orderTotals(filtered.visible))] : undefined),
    [rows, filtered.visible],
  );

  return (
    <DataGrid<OrderRow>
      ariaLabel="Purchase orders"
      rows={rows}
      columns={columns}
      height={460}
      emptyMessage="No purchase orders yet."
      tools={{ exportFileName: "purchase-orders" }}
      stateKey="orders"
      pinnedBottomRowData={pinned}
      rowClassRules={totalsRowClass}
      onFilterChanged={filtered.onFilterChanged}
      onRowDataUpdated={filtered.onRowDataUpdated}
    />
  );
}
