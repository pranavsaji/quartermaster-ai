"use client";

import type { ColDef } from "ag-grid-community";
import type { CustomCellRendererProps } from "ag-grid-react";
import type { SecurityFindingDto, Severity } from "@qm/contracts";
import Link from "next/link";
import { useMemo } from "react";
import { DataGrid } from "@/components/grid/DataGrid";
import { dateTimeColumn, statusColumn } from "@/components/grid/columns";
import { findingLabel, SEVERITY_TONES } from "@/lib/labels";
import { evidenceExcerpt } from "./FindingsList";

const SEVERITY_RANK: Record<Severity, number> = { CRITICAL: 0, HIGH: 1, MEDIUM: 2, LOW: 3 };

export function FindingsGrid({ findings }: { findings: SecurityFindingDto[] | undefined }) {
  const columns = useMemo<ColDef<SecurityFindingDto>[]>(
    () => [
      statusColumn<SecurityFindingDto, Severity>("severity", "Severity", SEVERITY_TONES, undefined, {
        width: 120,
        minWidth: 110,
        comparator: (a: Severity, b: Severity) => SEVERITY_RANK[a] - SEVERITY_RANK[b],
      }),
      {
        field: "type",
        headerName: "Type",
        minWidth: 170,
        valueFormatter: (p) => (typeof p.value === "string" ? findingLabel(p.value) : ""),
      },
      {
        field: "title",
        headerName: "Finding",
        flex: 2,
        minWidth: 260,
        autoHeight: true,
        wrapText: true,
        cellRenderer: (p: CustomCellRendererProps<SecurityFindingDto>) =>
          p.data ? (
            <div className="py-2 leading-snug">
              <p className="font-medium text-ink">{p.data.title}</p>
              {p.data.description ? <p className="text-[12px] text-ink-3">{p.data.description}</p> : null}
              {p.data.related_request_id ? (
                <Link href={`/procurement/${p.data.related_request_id}`} className="text-[12px] text-accent hover:underline">
                  View request
                </Link>
              ) : null}
            </div>
          ) : null,
      },
      {
        field: "source_kind",
        headerName: "Source",
        minWidth: 140,
        cellClass: "font-mono text-[12px]",
      },
      {
        colId: "evidence",
        headerName: "Evidence excerpt",
        flex: 2,
        minWidth: 260,
        autoHeight: true,
        wrapText: true,
        sortable: false,
        valueGetter: (p) => (p.data ? evidenceExcerpt(p.data.evidence) : null),
        cellRenderer: (p: CustomCellRendererProps<SecurityFindingDto, string | null>) =>
          p.value ? (
            <p className="my-2 rounded border-l-2 border-block-line bg-block-soft/50 px-2 py-1 font-mono text-[11.5px] leading-relaxed break-words whitespace-pre-wrap text-ink-2">
              {p.value.length > 220 ? `${p.value.slice(0, 220)}…` : p.value}
            </p>
          ) : (
            <span className="text-ink-4">—</span>
          ),
      },
      dateTimeColumn<SecurityFindingDto>("created_at", "Detected", { sort: "desc", minWidth: 150 }),
    ],
    [],
  );

  return (
    <DataGrid<SecurityFindingDto>
      ariaLabel="Security findings"
      rows={findings}
      columns={columns}
      height={480}
      emptyMessage="No findings. TrustRail hasn't flagged anything."
    />
  );
}
