"use client";

import type { ColDef } from "ag-grid-community";
import type { CustomCellRendererProps } from "ag-grid-react";
import type { InvoiceDto, InvoiceStatus } from "@qm/contracts";
import { useMemo } from "react";
import { DataGrid } from "@/components/grid/DataGrid";
import { TOTALS_ROW_ID, totalsRowClass, useFilteredRows } from "@/components/grid/use-filtered-rows";
import { dateTimeColumn, moneyColumn, statusColumn } from "@/components/grid/columns";
import { Badge } from "@/components/ui/Badge";
import { date, dateTime } from "@/lib/format";
import { INVOICE_STATUS_TONES } from "@/lib/labels";

export interface InvoiceTotals {
  invoices: number;
  totalMinor: number;
  /** Invoices whose settlement TrustRail blocked (mismatch or duplicate). */
  blocked: number;
  currency: string;
}

export function invoiceTotals(rows: readonly InvoiceDto[]): InvoiceTotals {
  return {
    invoices: rows.length,
    totalMinor: rows.reduce((sum, r) => sum + r.total_minor, 0),
    blocked: rows.filter((r) => !r.settlement_allowed).length,
    currency: rows[0]?.currency ?? "USD",
  };
}

function totalsRow(t: InvoiceTotals): InvoiceDto {
  return {
    id: TOTALS_ROW_ID,
    invoice_number: "Total",
    supplier_id: `${t.invoices} ${t.invoices === 1 ? "invoice" : "invoices"} · ${t.blocked} blocked`,
    total_minor: t.totalMinor,
    currency: t.currency,
    matches: [],
  } as unknown as InvoiceDto;
}

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
      {
        field: "invoice_number",
        headerName: "Invoice",
        minWidth: 150,
        cellClass: (p) => (p.node.rowPinned ? "text-xs" : "font-mono text-xs"),
      },
      {
        field: "supplier_id",
        headerName: "Supplier",
        minWidth: 170,
        flex: 1,
        valueFormatter: (p) =>
          p.node?.rowPinned ? String(p.value) : typeof p.value === "string" ? (supplierNames.get(p.value) ?? p.value.slice(0, 8)) : "",
      },
      {
        field: "purchase_order_id",
        headerName: "PO",
        minWidth: 130,
        context: { secondary: true },
        cellClass: "font-mono text-xs",
        valueFormatter: (p) =>
          p.node?.rowPinned ? "" : typeof p.value === "string" ? (poNumbers.get(p.value) ?? p.value.slice(0, 8)) : "—",
      },
      {
        field: "invoice_date",
        headerName: "Date",
        minWidth: 120,
        context: { secondary: true },
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
          p.data && !p.node.rowPinned ? (
            <Badge tone={p.data.settlement_allowed ? "allow" : "block"} dot>
              {p.data.settlement_allowed ? "Allowed" : "Blocked"}
            </Badge>
          ) : null,
      },
      {
        colId: "failed",
        headerName: "Failed checks",
        minWidth: 200,
        context: { secondary: true },
        flex: 1,
        valueGetter: (p) =>
          p.data && !p.node?.rowPinned
            ? p.data.matches
                .filter((m) => !m.passed)
                .map((m) => m.check)
                .join(", ") || "—"
            : "",
      },
      dateTimeColumn<InvoiceDto>("created_at", "Analyzed", {
        sort: "desc",
        minWidth: 150,
        valueFormatter: (p) => (p.node?.rowPinned ? "" : typeof p.value === "string" ? dateTime(p.value) : "—"),
      }),
    ],
    [supplierNames, poNumbers],
  );

  const filtered = useFilteredRows(invoices);
  const pinned = useMemo(
    () => (invoices && invoices.length > 0 ? [totalsRow(invoiceTotals(filtered.visible))] : undefined),
    [invoices, filtered.visible],
  );

  return (
    <DataGrid<InvoiceDto>
      ariaLabel="Invoices"
      rows={invoices}
      columns={columns}
      height={380}
      emptyMessage="No invoices yet"
      emptyDescription="Invoices you analyze are listed here with their match result."
      tools={{ exportFileName: "invoices" }}
      stateKey="invoices"
      pinnedBottomRowData={pinned}
      rowClassRules={totalsRowClass}
      onFilterChanged={filtered.onFilterChanged}
      onRowDataUpdated={filtered.onRowDataUpdated}
    />
  );
}
