"use client";

import type { ColDef } from "ag-grid-community";
import type { CustomCellRendererProps } from "ag-grid-react";
import type { CandidateDto } from "@qm/contracts";
import { useMemo } from "react";
import { DataGrid } from "@/components/grid/DataGrid";
import { moneyColumn, numberColumn, rightCell } from "@/components/grid/columns";
import { Badge } from "@/components/ui/Badge";
import { Card, CardHeader } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";
import { SourceLabel } from "@/components/ui/SourceLabel";
import { humanize } from "@/lib/format";

type Row = CandidateDto & { item_name: string };

/**
 * Supplier comparison: every candidate cart line with its *delivered* unit cost
 * (item + shipping + tax + fees), the agent's ranking and why anything was
 * excluded.
 */
export function CandidateTable({
  candidates,
  itemNames,
  currency,
}: {
  candidates: CandidateDto[];
  itemNames: Map<string, string>;
  currency: string;
}) {
  const rows = useMemo<Row[]>(
    () =>
      candidates
        .map((c) => ({ ...c, item_name: itemNames.get(c.inventory_item_id) ?? c.title }))
        .sort(
          (a, b) => a.item_name.localeCompare(b.item_name) || (a.rank ?? Number.POSITIVE_INFINITY) - (b.rank ?? Number.POSITIVE_INFINITY),
        ),
    [candidates, itemNames],
  );

  const columns = useMemo<ColDef<Row>[]>(() => {
    const cur = () => currency;
    return [
      { field: "item_name", headerName: "Item", minWidth: 160, pinned: "left" },
      {
        field: "rank",
        headerName: "Rank",
        width: 90,
        minWidth: 80,
        cellRenderer: (p: CustomCellRendererProps<Row>) =>
          p.data?.rank != null ? (
            <Badge tone={p.data.rank === 1 ? "accent" : "neutral"} label={`Rank ${p.data.rank}`}>
              #{p.data.rank}
            </Badge>
          ) : (
            <span className="text-ink-4">—</span>
          ),
      },
      {
        field: "supplier_name",
        headerName: "Supplier",
        minWidth: 300,
        autoHeight: true,
        wrapText: true,
        cellRenderer: (p: CustomCellRendererProps<Row>) =>
          p.data ? (
            <div className="flex flex-col gap-1 py-2 leading-tight">
              <span className="font-medium text-ink">{p.data.supplier_name}</span>
              <span className="flex flex-wrap gap-1">
                <SourceLabel source={p.data.data_source}>
                  {p.data.data_source === "SANDBOX_SUPPLIER" ? "Sandbox supplier — PayPal sandbox checkout" : undefined}
                </SourceLabel>
                {!p.data.supplier_approved ? <Badge tone="block">Not approved</Badge> : null}
                {!p.data.checkout_eligible ? <Badge tone="review">No checkout</Badge> : null}
              </span>
            </div>
          ) : null,
      },
      {
        field: "title",
        headerName: "Product",
        minWidth: 220,
        flex: 1,
        autoHeight: true,
        wrapText: true,
        cellRenderer: (p: CustomCellRendererProps<Row>) =>
          p.data ? (
            <div className="py-2 leading-snug">
              <span className="text-ink-2">{p.data.title}</span>
              <span className="block font-mono text-[11px] text-ink-4">{p.data.sku}</span>
            </div>
          ) : null,
      },
      numberColumn<Row>("pack_quantity", "Pack", { width: 90 }),
      numberColumn<Row>("packs", "Packs", { width: 90 }),
      numberColumn<Row>("units", "Units", { width: 90 }),
      moneyColumn<Row>("item_subtotal_minor", "Items", cur),
      moneyColumn<Row>("shipping_minor", "Shipping", cur),
      moneyColumn<Row>("tax_minor", "Tax", cur),
      moneyColumn<Row>("fees_minor", "Fees", cur, {
        cellClassRules: { "text-block font-medium": (p) => typeof p.value === "number" && p.value > 0 },
      }),
      moneyColumn<Row>("delivered_total_minor", "Delivered total", cur, { cellClass: rightCell("font-medium"), minWidth: 130 }),
      moneyColumn<Row>("delivered_unit_cost_minor", "Delivered / unit", cur, {
        cellClass: rightCell("font-semibold text-ink"),
        minWidth: 135,
      }),
      numberColumn<Row>("lead_time_days", "Lead", {
        width: 90,
        valueFormatter: (p) => (typeof p.value === "number" ? `${p.value} d` : "—"),
      }),
      {
        field: "eligible",
        headerName: "Eligibility",
        minWidth: 240,
        flex: 1,
        autoHeight: true,
        wrapText: true,
        cellRenderer: (p: CustomCellRendererProps<Row>) => {
          const c = p.data;
          if (!c) return null;
          return (
            <div className="flex flex-col gap-1 py-2 leading-snug">
              <span className="flex flex-wrap gap-1">
                {c.eligible ? (
                  <Badge tone="allow" dot>
                    Eligible
                  </Badge>
                ) : (
                  <Badge tone="block" dot>
                    Ineligible
                  </Badge>
                )}
                {c.quarantined ? (
                  <Badge tone="block" title="Source content was quarantined by TrustRail (e.g. prompt injection)">
                    Quarantined
                  </Badge>
                ) : null}
              </span>
              {c.ineligible_reasons.length > 0 ? (
                <ul className="text-[12px] text-ink-3">
                  {c.ineligible_reasons.map((r) => (
                    <li key={r}>• {/^[A-Z0-9_]+$/.test(r) ? humanize(r) : r}</li>
                  ))}
                </ul>
              ) : null}
            </div>
          );
        },
      },
    ];
  }, [currency]);

  return (
    <Card aria-labelledby="candidates-title">
      <CardHeader
        id="candidates-title"
        title="Supplier comparison"
        description="Ranked by delivered unit cost — the true price after shipping, tax and fees."
        actions={<SourceLabel source="SANDBOX_SUPPLIER">Sandbox suppliers</SourceLabel>}
      />
      <div className="p-3">
        {rows.length === 0 ? (
          <EmptyState compact title="No candidates yet" description="Supplier candidates appear after research." />
        ) : (
          <DataGrid<Row>
            ariaLabel="Supplier comparison"
            rows={rows}
            columns={columns}
            height={Math.min(560, 64 + rows.length * 76)}
            rowClassRules={{ "opacity-70": (p) => p.data?.eligible === false }}
          />
        )}
      </div>
    </Card>
  );
}
