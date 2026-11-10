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
import { dateTime, money } from "@/lib/format";
import { REQUEST_STATUS_TONES } from "@/lib/labels";

export function RequestList({ requests }: { requests: ProcurementRequestSummaryDto[] | undefined }) {
  const router = useRouter();
  const columns = useMemo<ColDef<ProcurementRequestSummaryDto>[]>(
    () => [
      {
        field: "instruction",
        headerName: "Request",
        flex: 3,
        minWidth: 180,
        ...controlColumn<ProcurementRequestSummaryDto>(),
        cellRenderer: (p: CustomCellRendererProps<ProcurementRequestSummaryDto>) =>
          p.data ? (
            <ActionCell eGridCell={p.eGridCell} className="w-full">
              <span className="flex min-w-0 flex-col leading-tight">
                <Link
                  href={`/procurement/${p.data.id}`}
                  className="block min-w-0 truncate font-medium text-ink hover:text-accent hover:underline"
                  title={p.data.instruction}
                >
                  {p.data.instruction}
                </Link>
                {/* On a phone the total and date columns are hidden: they ride along under the request. */}
                <span className="mt-0.5 truncate text-2xs text-ink-4 sm:hidden">
                  {money(p.data.total_minor, p.data.currency)} · {dateTime(p.data.created_at)}
                </span>
              </span>
            </ActionCell>
          ) : null,
      },
      statusColumn<ProcurementRequestSummaryDto, ProcurementRequestSummaryDto["status"]>(
        "status",
        "Status",
        REQUEST_STATUS_TONES,
        undefined,
        { minWidth: 130, maxWidth: 190 },
      ),
      moneyColumn<ProcurementRequestSummaryDto>("total_minor", "Proposed total", (r) => r.currency, {
        minWidth: 120,
        context: { secondary: true },
      }),
      dateTimeColumn<ProcurementRequestSummaryDto>("created_at", "Created", { sort: "desc", minWidth: 140, context: { secondary: true } }),
    ],
    [],
  );

  return (
    <DataGrid<ProcurementRequestSummaryDto>
      ariaLabel="Procurement requests"
      rows={requests}
      tools={{ exportFileName: "procurement-requests" }}
      stateKey="procurement-requests"
      columns={columns}
      rowHeight={52}
      emptyMessage="No requests yet"
      emptyDescription="Describe what you need in plain words with New request; Quartermaster researches it for you."
      onRowDoubleClicked={(e) => e.data && router.push(`/procurement/${e.data.id}`)}
    />
  );
}
