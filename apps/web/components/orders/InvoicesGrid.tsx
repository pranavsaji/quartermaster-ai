"use client";

import type { ColDef } from "ag-grid-community";
import type { CustomCellRendererProps } from "ag-grid-react";
import type { InvoiceDto, InvoiceStatus } from "@qm/contracts";
import { useMemo } from "react";
import { DataGrid } from "@/components/grid/DataGrid";
import { dateTimeColumn, moneyColumn, statusColumn } from "@/components/grid/columns";
import { Badge } from "@/components/ui/Badge";
import { date } from "@/lib/format";
import { INVOICE_STATUS_TONES } from "@/lib/labels";

export function InvoicesGrid({
  invoices,
  supplierNames,
  poNumbers,
}: {
  invoices: InvoiceDto[] | undefined;
  supplierNames: Map<string, string>;
  poNumbers: Map<string, string>;
}) {
  const columns = useMemo<ColDef<InvoiceDto>[]>(
    () => [
      { field: "invoice_number", headerName: "Invoice", minWidth: 150, cellClass: "font-mono text-[12.5px]" },
      {
        field: "supplier_id",
        headerName: "Supplier",
        minWidth: 170,
        flex: 1,
        valueFormatter: (p) => (typeof p.value === "string" ? (supplierNames.get(p.value) ?? p.value.slice(0, 8)) : ""),
      },
      {
        field: "purchase_order_id",
        headerName: "PO",
        minWidth: 130,
        cellClass: "font-mono text-[12.5px]",
        valueFormatter: (p) => (typeof p.value === "string" ? (poNumbers.get(p.value) ?? p.value.slice(0, 8)) : "—"),
      },
      {
        field: "invoice_date",
        headerName: "Date",
        minWidth: 120,
        cellClass: "tnum",
        valueFormatter: (p) => (typeof p.value === "string" ? date(p.value) : ""),
      },
      moneyColumn<InvoiceDto>("total_minor", "Total", (r) => r.currency),
      statusColumn<InvoiceDto, InvoiceStatus>("status", "Match", INVOICE_STATUS_TONES, undefined, { minWidth: 140 }),
      {
        field: "settlement_allowed",
        headerName: "Settlement",
        minWidth: 140,
        cellRenderer: (p: CustomCellRendererProps<InvoiceDto>) =>
          p.data ? (
            <Badge tone={p.data.settlement_allowed ? "allow" : "block"} dot>
              {p.data.settlement_allowed ? "Allowed" : "Blocked"}
            </Badge>
          ) : null,
      },
      {
        colId: "failed",
        headerName: "Failed checks",
        minWidth: 200,
        flex: 1,
        valueGetter: (p) =>
          p.data
            ? p.data.matches
                .filter((m) => !m.passed)
                .map((m) => m.check)
                .join(", ") || "—"
            : "",
      },
      dateTimeColumn<InvoiceDto>("created_at", "Analyzed", { sort: "desc", minWidth: 150 }),
    ],
    [supplierNames, poNumbers],
  );

  return (
    <DataGrid<InvoiceDto> ariaLabel="Invoices" rows={invoices} columns={columns} height={380} emptyMessage="No invoices analyzed yet." />
  );
}
