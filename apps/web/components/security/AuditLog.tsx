"use client";

import type { ColDef } from "ag-grid-community";
import type { CustomCellRendererProps } from "ag-grid-react";
import type { AuditChainVerificationDto, AuditEventDto } from "@qm/contracts";
import { useMemo, useState } from "react";
import { DataGrid } from "@/components/grid/DataGrid";
import { useSession } from "@/components/session/SessionProvider";
import { dateTimeColumn, rightCell } from "@/components/grid/columns";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { ErrorNotice } from "@/components/ui/ErrorNotice";
import { Notice } from "@/components/ui/Notice";
import { api } from "@/lib/api";
import { dateTime, num, truncateMiddle } from "@/lib/format";
import { useAction } from "@/lib/hooks";
import { lookup, type Tone } from "@/lib/labels";

const ACTOR_TONES = { USER: "accent", SYSTEM: "neutral", AGENT: "info", PAYPAL: "allow" } as const;

/**
 * Hash-chained audit log: each event's hash covers its content and the
 * previous event's hash, so any edit or deletion breaks verification.
 */
export function AuditLog({ events }: { events: AuditEventDto[] | undefined }) {
  const { can } = useSession();
  const canVerify = can("verifyAudit");
  const [result, setResult] = useState<{ verification: AuditChainVerificationDto; at: string } | null>(null);
  const verify = useAction(async () => {
    const verification = await api.security.verifyAudit();
    setResult({ verification, at: new Date().toISOString() });
  });

  const brokenAt = result && !result.verification.valid ? result.verification.first_invalid_sequence : null;

  const columns = useMemo<ColDef<AuditEventDto>[]>(
    () => [
      {
        field: "sequence",
        headerName: "#",
        width: 90,
        sort: "desc",
        type: "rightAligned",
        cellClass: rightCell(),
      },
      { field: "action", headerName: "Action", minWidth: 200, flex: 1, cellClass: "font-mono text-[12px]" },
      {
        field: "actor_type",
        headerName: "Actor",
        minWidth: 120,
        cellRenderer: (p: CustomCellRendererProps<AuditEventDto>) =>
          p.data ? (
            <Badge tone={lookup<keyof typeof ACTOR_TONES, Tone>(ACTOR_TONES, p.data.actor_type, "neutral")}>{p.data.actor_type}</Badge>
          ) : null,
      },
      {
        colId: "entity",
        headerName: "Entity",
        minWidth: 180,
        valueGetter: (p) => (p.data ? `${p.data.entity_type}${p.data.entity_id ? ` · ${p.data.entity_id.slice(0, 8)}` : ""}` : ""),
      },
      {
        field: "hash",
        headerName: "Hash",
        minWidth: 170,
        cellClass: "font-mono text-[12px]",
        valueFormatter: (p) => (typeof p.value === "string" ? truncateMiddle(p.value, 10, 6) : ""),
        tooltipValueGetter: (p) => (typeof p.value === "string" ? p.value : ""),
      },
      {
        field: "prev_hash",
        headerName: "Previous hash",
        minWidth: 170,
        cellClass: "font-mono text-[12px] text-ink-3",
        valueFormatter: (p) => (typeof p.value === "string" ? truncateMiddle(p.value, 10, 6) : "genesis"),
        tooltipValueGetter: (p) => (typeof p.value === "string" ? p.value : "genesis"),
      },
      {
        field: "correlation_id",
        headerName: "Correlation",
        minWidth: 130,
        cellClass: "font-mono text-[12px] text-ink-3",
        valueFormatter: (p) => (typeof p.value === "string" ? p.value.slice(0, 10) : "—"),
      },
      dateTimeColumn<AuditEventDto>("created_at", "When", { minWidth: 150 }),
    ],
    [],
  );

  return (
    <div className="space-y-3">
      {canVerify ? (
        <div className="flex flex-wrap items-center gap-3">
          <Button variant="primary" onClick={() => void verify.run()} loading={verify.pending}>
            Verify audit chain
          </Button>
          <span className="text-[12.5px] text-ink-3">Recomputes every hash on the server and checks each link to its predecessor.</span>
        </div>
      ) : (
        <p className="text-[12.5px] text-ink-3">
          Managers and owners can re-verify the audit chain. You can still read every event and its hash below.
        </p>
      )}
      <ErrorNotice error={verify.error} title="Verification failed to run" />
      {result ? (
        result.verification.valid ? (
          <Notice tone="allow" live title="Audit chain intact">
            {num(result.verification.events_checked)} events checked · verified {dateTime(result.at)}
          </Notice>
        ) : (
          <Notice tone="block" live title="Audit chain broken">
            The chain fails at sequence #{result.verification.first_invalid_sequence ?? "?"} after checking{" "}
            {num(result.verification.events_checked)} events. Records from that point may have been altered.
          </Notice>
        )
      ) : null}
      <DataGrid<AuditEventDto>
        ariaLabel="Audit log"
        rows={events}
        columns={columns}
        height={480}
        emptyMessage="No audit events yet."
        rowClassRules={{ "bg-block-soft": (p) => brokenAt !== null && (p.data?.sequence ?? -1) >= brokenAt }}
        tooltipShowDelay={300}
      />
    </div>
  );
}
