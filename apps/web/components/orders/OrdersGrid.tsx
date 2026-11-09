"use client";

import type { ColDef } from "ag-grid-community";
import type { CustomCellRendererProps } from "ag-grid-react";
import type { DeliveryDto, PurchaseOrderDto } from "@qm/contracts";
import Link from "next/link";
import { useMemo } from "react";
import { DataGrid } from "@/components/grid/DataGrid";
import { dateTimeColumn, moneyColumn, statusColumn } from "@/components/grid/columns";
import { StatusBadge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { date } from "@/lib/format";
import { DELIVERY_STATUS_TONES, PAYMENT_STATUS_TONES, PO_STATUS_TONES } from "@/lib/labels";

export type OrderRow = PurchaseOrderDto & { delivery_view: DeliveryDto | null };

const OPEN_DELIVERY = new Set<DeliveryDto["status"]>(["SCHEDULED", "IN_TRANSIT", "DELAYED"]);

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
        cellRenderer: (p: CustomCellRendererProps<OrderRow>) =>
          p.data ? (
            p.data.request_id ? (
              <Link href={`/procurement/${p.data.request_id}#proposals`} className="font-mono text-[12.5px] text-accent hover:underline">
                {p.data.number}
              </Link>
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
          p.data?.payment ? (
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
          p.data?.delivery_view ? (
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
        valueFormatter: (p) => (typeof p.value === "string" ? date(p.value) : "—"),
      },
      dateTimeColumn<OrderRow>("created_at", "Created", { sort: "desc", minWidth: 150 }),
    ];
    if (canManage || canInvoice) {
      cols.push({
        colId: "actions",
        headerName: "Actions",
        pinned: "right",
        sortable: false,
        minWidth: 250,
        cellRenderer: (p: CustomCellRendererProps<OrderRow>) => {
          const row = p.data;
          if (!row) return null;
          const open = row.delivery_view !== null && OPEN_DELIVERY.has(row.delivery_view.status);
          return (
            <div className="flex h-full items-center gap-1.5">
              {canManage && open ? (
                <>
                  <Button size="sm" variant="secondary" onClick={() => onReceive(row)} aria-label={`Mark ${row.number} received`}>
                    Receive
                  </Button>
                  <Button size="sm" variant="ghost" onClick={() => onDelay(row)} aria-label={`Report delay for ${row.number}`}>
                    Delay
                  </Button>
                </>
              ) : null}
              {canInvoice ? (
                <Button size="sm" variant="ghost" onClick={() => onInvoice(row)} aria-label={`Analyze an invoice for ${row.number}`}>
                  Invoice
                </Button>
              ) : null}
            </div>
          );
        },
      });
    }
    return cols;
  }, [canManage, canInvoice, onReceive, onDelay, onInvoice]);

  return (
    <DataGrid<OrderRow>
      ariaLabel="Purchase orders"
      rows={rows}
      columns={columns}
      height={460}
      emptyMessage="No purchase orders yet."
    />
  );
}
