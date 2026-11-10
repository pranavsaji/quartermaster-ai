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
import { violationCopy } from "@/lib/plain-language";

export function DecisionsGrid({ decisions }: { decisions: PolicyDecisionDto[] | undefined }) {
  const columns = useMemo<ColDef<PolicyDecisionDto>[]>(
    () => [
      statusColumn<PolicyDecisionDto, PolicyDecisionKind>("decision", "Decision", DECISION_TONES, DECISION_LABELS, {
        minWidth: 150,
      }),
      {
        colId: "violations",
        headerName: "Reasons",
        flex: 2,
        minWidth: 260,
        autoHeight: true,
        wrapText: true,
        sortable: true,
        // Sorts by how many rules failed; search and CSV export see the codes and messages.
        valueGetter: (p) => p.data?.violations.length ?? 0,
        valueFormatter: (p) => p.data?.violations.map((v) => v.code).join("; ") || "None",
        getQuickFilterText: (p) => p.data?.violations.map((v) => `${v.code} ${v.message}`).join(" ") ?? "",
        filter: false,
        // Each message is written out, not left in a hover-only tooltip that keyboard and touch users never see.
        cellRenderer: (p: CustomCellRendererProps<PolicyDecisionDto>) =>
          p.data && p.data.violations.length > 0 ? (
            <ul className="flex flex-col gap-1.5 py-2 leading-snug">
              {p.data.violations.map((v, i) => (
                <li key={`${v.code}-${i}`} className="whitespace-normal">
                  <Badge tone={v.severity === "BLOCK" ? "block" : "review"} title={v.code}>
                    {violationCopy(v.code).title}
                  </Badge>
                  <span className="ml-1.5 text-xs text-ink-3">{v.message}</span>
                </li>
              ))}
            </ul>
          ) : (
            <span className="text-ink-4">None</span>
          ),
      },
      {
        colId: "checks",
        headerName: "Checks passed",
        width: 110,
        minWidth: 96,
        type: "rightAligned",
        cellClass: rightCell(),
        valueGetter: (p) => (p.data ? `${p.data.checks.filter((c) => c.passed).length}/${p.data.checks.length}` : ""),
      },
      {
        field: "purchase_order_id",
        headerName: "Purchase order",
        minWidth: 120,
        context: { secondary: true },
        cellClass: "font-mono text-xs",
        valueFormatter: (p) => (typeof p.value === "string" ? p.value.slice(0, 8) : ""),
        tooltipValueGetter: (p) => (typeof p.value === "string" ? p.value : ""),
      },
      {
        field: "mandate_version",
        headerName: "Mandate",
        width: 100,
        minWidth: 90,
        context: { secondary: true },
        valueFormatter: (p) => (typeof p.value === "number" ? `v${p.value}` : ""),
      },
      { field: "policy_version", headerName: "Policy", minWidth: 120, cellClass: "font-mono text-xs", hide: true },
      {
        field: "input_digest",
        headerName: "Input digest",
        minWidth: 170,
        hide: true,
        cellClass: "font-mono text-xs",
        valueFormatter: (p) => (typeof p.value === "string" ? truncateMiddle(p.value, 12, 6) : ""),
        tooltipValueGetter: (p) => (typeof p.value === "string" ? p.value : ""),
      },
      dateTimeColumn<PolicyDecisionDto>("evaluated_at", "Evaluated", { sort: "desc", minWidth: 130, context: { secondary: true } }),
    ],
    [],
  );

  return (
    <DataGrid<PolicyDecisionDto>
      ariaLabel="Policy decisions"
      rows={decisions}
      tools={{ exportFileName: "trustrail-decisions", columns: true }}
      stateKey="trustrail-decisions"
      columns={columns}
      height={440}
      emptyMessage="No decisions yet"
      emptyDescription="Every cart TrustRail checks is listed here with its reasons."
    />
  );
}
