"use client";

import type { ColDef } from "ag-grid-community";
import type { CustomCellRendererProps } from "ag-grid-react";
import type { SecurityFindingDto, Severity } from "@qm/contracts";
import Link from "next/link";
import { useMemo } from "react";
import { ActionCell, controlColumn } from "@/components/grid/ActionCell";
import { DataGrid } from "@/components/grid/DataGrid";
import { dateTimeColumn, statusColumn } from "@/components/grid/columns";
import { findingLabel, SEVERITY_TONES } from "@/lib/labels";
import { findingSourceLabel } from "@/lib/plain-language";
import { evidenceExcerpt } from "./FindingsList";

const SEVERITY_RANK: Record<Severity, number> = { CRITICAL: 0, HIGH: 1, MEDIUM: 2, LOW: 3 };

export function FindingsGrid({ findings }: { findings: SecurityFindingDto[] | undefined }) {
  const columns = useMemo<ColDef<SecurityFindingDto>[]>(
    () => [
      statusColumn<SecurityFindingDto, Severity>("severity", "Severity", SEVERITY_TONES, undefined, {
        width: 120,
        minWidth: 104,
        pinned: "left",
        comparator: (a: Severity, b: Severity) => SEVERITY_RANK[a] - SEVERITY_RANK[b],
      }),
      {
        field: "type",
        headerName: "Type",
        minWidth: 140,
        context: { secondary: true },
        valueFormatter: (p) => (typeof p.value === "string" ? findingLabel(p.value) : ""),
      },
      {
        field: "title",
        headerName: "Finding",
        flex: 2,
        minWidth: 240,
        autoHeight: true,
        wrapText: true,
        ...controlColumn<SecurityFindingDto>(),
        cellRenderer: (p: CustomCellRendererProps<SecurityFindingDto>) =>
          p.data ? (
            <ActionCell eGridCell={p.eGridCell} className="block h-auto py-2 leading-snug">
              <p className="font-medium text-ink">{p.data.title}</p>
              {p.data.description ? <p className="text-xs text-ink-3">{p.data.description}</p> : null}
              {p.data.related_request_id ? (
                <Link href={`/procurement/${p.data.related_request_id}`} className="text-xs text-accent hover:underline">
                  View request
                </Link>
              ) : null}
            </ActionCell>
          ) : null,
      },
      {
        field: "source_kind",
        headerName: "Found in",
        minWidth: 130,
        context: { secondary: true },
        valueFormatter: (p) => (typeof p.value === "string" ? findingSourceLabel(p.value) : ""),
      },
      {
        colId: "evidence",
        headerName: "Evidence excerpt",
        flex: 2,
        minWidth: 240,
        context: { secondary: true },
        autoHeight: true,
        wrapText: true,
        sortable: false,
        valueGetter: (p) => (p.data ? evidenceExcerpt(p.data.evidence) : null),
        cellRenderer: (p: CustomCellRendererProps<SecurityFindingDto, string | null>) =>
          p.value ? (
            <p className="my-2 rounded border-l-2 border-block-line bg-block-soft/50 px-2 py-1 font-mono text-2xs leading-relaxed break-words whitespace-pre-wrap text-ink-2">
              {p.value.length > 220 ? `${p.value.slice(0, 220)}…` : p.value}
            </p>
          ) : (
            <span className="text-ink-4">—</span>
          ),
      },
      dateTimeColumn<SecurityFindingDto>("created_at", "Detected", { sort: "desc", minWidth: 130, context: { secondary: true } }),
    ],
    [],
  );

  return (
    <DataGrid<SecurityFindingDto>
      ariaLabel="Security findings"
      rows={findings}
      tools={{ exportFileName: "security-findings", columns: true }}
      stateKey="security-findings"
      columns={columns}
      height={480}
      emptyMessage="No findings"
      emptyDescription="TrustRail hasn't flagged anything in supplier data, carts or invoices."
    />
  );
}
