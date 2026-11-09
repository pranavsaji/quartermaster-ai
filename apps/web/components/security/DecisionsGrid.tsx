"use client";

import type { ColDef } from "ag-grid-community";
import type { CustomCellRendererProps } from "ag-grid-react";
import type { PolicyDecisionDto, PolicyDecisionKind } from "@qm/contracts";
import { useMemo } from "react";
import { DataGrid } from "@/components/grid/DataGrid";
import { dateTimeColumn, statusColumn, rightCell } from "@/components/grid/columns";
import { Badge } from "@/components/ui/Badge";
import { truncateMiddle } from "@/lib/format";
import { DECISION_LABELS, DECISION_TONES } from "@/lib/labels";

export function DecisionsGrid({ decisions }: { decisions: PolicyDecisionDto[] | undefined }) {
  const columns = useMemo<ColDef<PolicyDecisionDto>[]>(
    () => [
      statusColumn<PolicyDecisionDto, PolicyDecisionKind>("decision", "Decision", DECISION_TONES, DECISION_LABELS, {
        minWidth: 150,
      }),
      {
        colId: "violations",
        headerName: "Violations",
        flex: 2,
        minWidth: 280,
        autoHeight: true,
        sortable: true,
        valueGetter: (p) => p.data?.violations.length ?? 0,
        cellRenderer: (p: CustomCellRendererProps<PolicyDecisionDto>) =>
          p.data && p.data.violations.length > 0 ? (
            <div className="flex flex-wrap gap-1 py-2">
              {p.data.violations.map((v, i) => (
                <Badge key={`${v.code}-${i}`} tone={v.severity === "BLOCK" ? "block" : "review"} title={v.message}>
                  {v.code}
                </Badge>
              ))}
            </div>
          ) : (
            <span className="text-ink-4">None</span>
          ),
      },
      {
        colId: "checks",
        headerName: "Checks",
        width: 110,
        type: "rightAligned",
        cellClass: rightCell(),
        valueGetter: (p) => (p.data ? `${p.data.checks.filter((c) => c.passed).length}/${p.data.checks.length}` : ""),
      },
      {
        field: "purchase_order_id",
        headerName: "Purchase order",
        minWidth: 140,
        cellClass: "font-mono text-[12px]",
        valueFormatter: (p) => (typeof p.value === "string" ? p.value.slice(0, 8) : ""),
        tooltipValueGetter: (p) => (typeof p.value === "string" ? p.value : ""),
      },
      {
        field: "mandate_version",
        headerName: "Mandate",
        width: 110,
        valueFormatter: (p) => (typeof p.value === "number" ? `v${p.value}` : ""),
      },
      { field: "policy_version", headerName: "Policy", minWidth: 120, cellClass: "font-mono text-[12px]" },
      {
        field: "input_digest",
        headerName: "Input digest",
        minWidth: 170,
        cellClass: "font-mono text-[12px]",
        valueFormatter: (p) => (typeof p.value === "string" ? truncateMiddle(p.value, 12, 6) : ""),
        tooltipValueGetter: (p) => (typeof p.value === "string" ? p.value : ""),
      },
      dateTimeColumn<PolicyDecisionDto>("evaluated_at", "Evaluated", { sort: "desc", minWidth: 150 }),
    ],
    [],
  );

  return (
    <DataGrid<PolicyDecisionDto>
      ariaLabel="Policy decisions"
      rows={decisions}
      columns={columns}
      height={440}
      emptyMessage="No policy decisions recorded yet."
    />
  );
}
