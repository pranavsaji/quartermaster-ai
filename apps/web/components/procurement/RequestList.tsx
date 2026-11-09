"use client";

import type { ColDef } from "ag-grid-community";
import type { CustomCellRendererProps } from "ag-grid-react";
import type { ProcurementRequestSummaryDto } from "@qm/contracts";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo } from "react";
import { ActionCell, controlColumn } from "@/components/grid/ActionCell";
import { DataGrid } from "@/components/grid/DataGrid";
import { dateTimeColumn, moneyColumn, statusColumn } from "@/components/grid/columns";
import { REQUEST_STATUS_TONES } from "@/lib/labels";

export function RequestList({ requests }: { requests: ProcurementRequestSummaryDto[] | undefined }) {
  const router = useRouter();
  const columns = useMemo<ColDef<ProcurementRequestSummaryDto>[]>(
    () => [
      {
        field: "instruction",
        headerName: "Request",
        flex: 3,
        minWidth: 280,
        ...controlColumn<ProcurementRequestSummaryDto>(),
        cellRenderer: (p: CustomCellRendererProps<ProcurementRequestSummaryDto>) =>
          p.data ? (
            <ActionCell eGridCell={p.eGridCell} className="min-w-0">
              <Link
                href={`/procurement/${p.data.id}`}
                className="block truncate font-medium text-ink hover:text-accent hover:underline"
                title={p.data.instruction}
              >
                {p.data.instruction}
              </Link>
            </ActionCell>
          ) : null,
      },
      statusColumn<ProcurementRequestSummaryDto, ProcurementRequestSummaryDto["status"]>(
        "status",
        "Status",
        REQUEST_STATUS_TONES,
        undefined,
        { minWidth: 150 },
      ),
      moneyColumn<ProcurementRequestSummaryDto>("total_minor", "Proposed total", (r) => r.currency, { minWidth: 140 }),
      dateTimeColumn<ProcurementRequestSummaryDto>("created_at", "Created", { sort: "desc", minWidth: 150 }),
    ],
    [],
  );

  return (
    <DataGrid<ProcurementRequestSummaryDto>
      ariaLabel="Procurement requests"
      rows={requests}
      columns={columns}
      emptyMessage="No requests yet. Create one to get started."
      onRowDoubleClicked={(e) => e.data && router.push(`/procurement/${e.data.id}`)}
      pagination
      paginationPageSize={20}
      paginationPageSizeSelector={false}
    />
  );
}
