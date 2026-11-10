"use client";

import type { ColDef } from "ag-grid-community";
import type { CustomCellRendererProps } from "ag-grid-react";
import type { SupplierDto } from "@qm/contracts";
import Link from "next/link";
import { useMemo } from "react";
import { ActionCell, controlColumn } from "@/components/grid/ActionCell";
import { DataGrid } from "@/components/grid/DataGrid";
import { numberColumn, rightCell } from "@/components/grid/columns";
import { SupplierBadges } from "@/components/suppliers/SupplierBadges";
import { SourceLabel } from "@/components/ui/SourceLabel";
import { money, plural } from "@/lib/format";
import { DATA_SOURCE_LABELS } from "@/lib/labels";

/** "$12.50 · free over $150.00", "$14.99" or "Free": the supplier's shipping term. */
export function deliveryTerms(s: SupplierDto, currency: string): string {
  const shipping = s.fee_terms.find((f) => f.kind === "SHIPPING");
  if (!shipping) return "Free";
  return `${money(shipping.amount_minor, currency)}${shipping.waived_over_minor !== null ? ` · free over ${money(shipping.waived_over_minor, currency)}` : ""}`;
}

/** Approval state as text, for sorting, filtering, search and CSV export. */
export function supplierStatusText(s: SupplierDto): string {
  return [
    s.approved ? "Approved" : "Not approved",
    s.active ? "" : "Inactive",
    s.checkout_eligible ? "" : "No PayPal checkout",
    s.quarantined ? "Quarantined" : "",
  ]
    .filter(Boolean)
    .join(", ");
}

export function SuppliersGrid({ suppliers, currency }: { suppliers: SupplierDto[]; currency: string }) {
  const columns = useMemo<ColDef<SupplierDto>[]>(
    () => [
      {
        field: "name",
        headerName: "Supplier",
        pinned: "left",
        minWidth: 240,
        flex: 2,
        ...controlColumn<SupplierDto>(),
        getQuickFilterText: (p) => (p.data ? `${p.data.name} ${p.data.website ?? ""}` : ""),
        cellRenderer: (p: CustomCellRendererProps<SupplierDto>) =>
          p.data ? (
            <ActionCell eGridCell={p.eGridCell} className="flex-col items-start justify-center gap-0 leading-tight">
              <Link href={`/suppliers/${p.data.id}`} className="font-medium text-ink hover:text-accent hover:underline">
                {p.data.name}
              </Link>
              {p.data.website ? <span className="max-w-64 truncate text-[11.5px] text-ink-3">{p.data.website}</span> : null}
            </ActionCell>
          ) : null,
      },
      {
        colId: "status",
        headerName: "Status",
        minWidth: 200,
        flex: 1,
        valueGetter: (p) => (p.data ? supplierStatusText(p.data) : ""),
        cellRenderer: (p: CustomCellRendererProps<SupplierDto>) => (p.data ? <SupplierBadges supplier={p.data} /> : null),
      },
      numberColumn<SupplierDto>("lead_time_days", "Lead time", {
        minWidth: 110,
        valueFormatter: (p) => (typeof p.value === "number" ? plural(p.value, "day") : "—"),
      }),
      {
        colId: "delivery",
        headerName: "Delivery",
        minWidth: 200,
        type: "rightAligned",
        cellClass: rightCell("text-ink-2"),
        valueGetter: (p) => (p.data ? deliveryTerms(p.data, currency) : ""),
      },
      numberColumn<SupplierDto>("tax_rate_bps", "Sales tax", {
        minWidth: 110,
        valueFormatter: (p) => (typeof p.value === "number" ? `${p.value / 100}%` : "—"),
      }),
      numberColumn<SupplierDto>("catalog_items", "Products", { minWidth: 110 }),
      {
        field: "data_source",
        headerName: "Source",
        minWidth: 190,
        valueFormatter: (p) => (typeof p.value === "string" ? (DATA_SOURCE_LABELS[p.value as SupplierDto["data_source"]] ?? p.value) : ""),
        cellRenderer: (p: CustomCellRendererProps<SupplierDto>) => (p.data ? <SourceLabel source={p.data.data_source} /> : null),
      },
    ],
    [currency],
  );

  return (
    <DataGrid<SupplierDto>
      ariaLabel="Suppliers"
      rows={suppliers}
      columns={columns}
      height={460}
      rowHeight={52}
      emptyMessage="No suppliers yet."
      // Few columns: render them all, so browser find (Ctrl/Cmd+F) sees every cell.
      suppressColumnVirtualisation
      stateKey="suppliers"
      tools={{ exportFileName: "suppliers" }}
    />
  );
}
