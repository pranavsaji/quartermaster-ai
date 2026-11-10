"use client";

import { INVITABLE_ROLES, type MemberDto, type Role } from "@qm/contracts";
import type { ColDef } from "ag-grid-community";
import type { CustomCellRendererProps } from "ag-grid-react";
import { useMemo } from "react";
import { ActionCell, controlColumn } from "@/components/grid/ActionCell";
import { DataGrid } from "@/components/grid/DataGrid";
import { dateTimeColumn } from "@/components/grid/columns";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Select } from "@/components/ui/Field";
import { api } from "@/lib/api";
import { useAction } from "@/lib/hooks";
import { lookup } from "@/lib/labels";
import { ROLE_LABELS } from "@/lib/roles";

export type MemberRow = MemberDto & { id: string };

export interface MemberGridHandlers {
  onChanged: (member: MemberDto) => void;
  onRemove: (member: MemberDto) => void;
  onResetLink: (member: MemberDto, link: { url: string | null; emailSent: boolean }) => void;
  /** A refused role change or reset link, shown above the grid. */
  onError: (title: string, error: unknown) => void;
}

/** Workspace members. Owners change roles, issue reset links and remove people from the grid itself. */
export function MembersGrid({ members, manage, handlers }: { members: MemberDto[]; manage: boolean; handlers: MemberGridHandlers }) {
  const rows = useMemo<MemberRow[]>(() => members.map((m) => ({ ...m, id: m.user_id })), [members]);
  const columns = useMemo<ColDef<MemberRow>[]>(() => {
    const cols: ColDef<MemberRow>[] = [
      {
        field: "name",
        headerName: "Name",
        minWidth: 240,
        flex: 2,
        getQuickFilterText: (p) => (p.data ? `${p.data.name} ${p.data.email}` : ""),
        cellRenderer: (p: CustomCellRendererProps<MemberRow>) =>
          p.data ? (
            <div className="flex h-full flex-col justify-center leading-tight">
              <span className="font-medium text-ink">
                {p.data.name}
                {p.data.is_self ? (
                  <Badge tone="neutral" className="ml-2">
                    You
                  </Badge>
                ) : null}
              </span>
              <span className="text-[12px] text-ink-3">{p.data.email}</span>
            </div>
          ) : null,
      },
      {
        field: "role",
        headerName: "Role",
        minWidth: 180,
        valueFormatter: (p) => (typeof p.value === "string" ? lookup(ROLE_LABELS, p.value, p.value) : ""),
        ...(manage ? controlColumn<MemberRow>() : {}),
        cellRenderer: (p: CustomCellRendererProps<MemberRow>) =>
          p.data ? (
            manage ? (
              <ActionCell eGridCell={p.eGridCell}>
                <RoleSelect member={p.data} handlers={handlers} />
              </ActionCell>
            ) : (
              <Badge tone={p.data.role === "OWNER" ? "accent" : "neutral"}>{lookup(ROLE_LABELS, p.data.role, p.data.role)}</Badge>
            )
          ) : null,
      },
      dateTimeColumn<MemberRow>("joined_at", "Joined", { minWidth: 170, sort: "asc" }),
    ];
    if (manage) {
      cols.push({
        colId: "actions",
        headerName: "",
        pinned: "right",
        sortable: false,
        resizable: false,
        minWidth: 210,
        maxWidth: 220,
        ...controlColumn<MemberRow>(),
        cellRenderer: (p: CustomCellRendererProps<MemberRow>) =>
          p.data ? (
            <ActionCell eGridCell={p.eGridCell} className="justify-end">
              <MemberActions member={p.data} handlers={handlers} />
            </ActionCell>
          ) : null,
      });
    }
    return cols;
  }, [manage, handlers]);

  return (
    <DataGrid<MemberRow>
      ariaLabel="Workspace members"
      rows={rows}
      columns={columns}
      rowHeight={56}
      emptyMessage="No members."
      // Few columns: render them all, so browser find (Ctrl/Cmd+F) sees every cell.
      suppressColumnVirtualisation
      stateKey="team"
      tools={{ exportFileName: "team" }}
    />
  );
}

function RoleSelect({ member: m, handlers }: { member: MemberRow; handlers: MemberGridHandlers }) {
  const setRole = useAction(async (role: Role) => {
    try {
      handlers.onChanged((await api.members.setRole(m.user_id, role)).member);
    } catch (err) {
      handlers.onError("Role not changed", err);
      throw err;
    }
  });
  return (
    <Select
      aria-label={`Role for ${m.name}`}
      value={m.role}
      disabled={setRole.pending}
      onChange={(e) => void setRole.run(e.target.value as Role)}
      className="w-36"
    >
      {INVITABLE_ROLES.map((r) => (
        <option key={r} value={r}>
          {ROLE_LABELS[r]}
        </option>
      ))}
    </Select>
  );
}

function MemberActions({ member: m, handlers }: { member: MemberRow; handlers: MemberGridHandlers }) {
  const reset = useAction(async () => {
    try {
      const r = await api.members.resetLink(m.user_id);
      handlers.onResetLink(m, { url: r.reset_url, emailSent: r.email_sent });
    } catch (err) {
      handlers.onError("No reset link issued", err);
      throw err;
    }
  });
  return (
    <>
      {/* Owners reset their own passwords: a link for another owner would take over their account. */}
      {m.role !== "OWNER" ? (
        <Button
          size="sm"
          variant="secondary"
          onClick={() => void reset.run()}
          loading={reset.pending}
          aria-label={`Reset link for ${m.name}`}
        >
          Reset link
        </Button>
      ) : null}
      {!m.is_self ? (
        <Button size="sm" variant="danger" onClick={() => handlers.onRemove(m)} aria-label={`Remove ${m.name}`}>
          Remove
        </Button>
      ) : null}
    </>
  );
}
