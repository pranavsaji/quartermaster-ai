"use client";

import type { Severity } from "@qm/contracts";
import { useState } from "react";
import { AuditLog } from "@/components/security/AuditLog";
import { DecisionsGrid } from "@/components/security/DecisionsGrid";
import { FindingsGrid } from "@/components/security/FindingsGrid";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { ErrorNotice } from "@/components/ui/ErrorNotice";
import { Select } from "@/components/ui/Field";
import { PageHeader } from "@/components/ui/PageHeader";
import { StatTile } from "@/components/ui/StatTile";
import { Tabs } from "@/components/ui/Tabs";
import { api } from "@/lib/api";
import { usePagedResource, useResource, type PagedState } from "@/lib/hooks";

type Tab = "findings" | "decisions" | "audit";

const TAB_LABELS: Record<Tab, string> = { findings: "Findings", decisions: "Policy decisions", audit: "Audit log" };

function LoadMore<T>({ state }: { state: PagedState<T> }) {
  if (!state.hasMore) return null;
  return (
    <div className="mt-3 flex justify-center">
      <Button variant="secondary" size="sm" onClick={state.loadMore} loading={state.loadingMore}>
        Load more
      </Button>
    </div>
  );
}

export default function SecurityPage() {
  const [tab, setTab] = useState<Tab>("findings");
  const [severity, setSeverity] = useState<Severity | "">("");
  const summary = useResource((signal) => api.analytics.summary({ signal }), []);
  const findings = usePagedResource(
    (cursor, signal) => api.security.events({ limit: 100, cursor, severity: severity || undefined }, { signal }),
    [severity],
  );
  const decisions = usePagedResource((cursor, signal) => api.security.decisions({ limit: 100, cursor }, { signal }), []);
  const audit = usePagedResource((cursor, signal) => api.security.audit({ limit: 100, cursor }, { signal }), []);

  const s = summary.data?.security;
  const panels: Record<Tab, { state: PagedState<unknown>; node: React.ReactNode }> = {
    findings: { state: findings, node: <FindingsGrid findings={findings.items} /> },
    decisions: { state: decisions, node: <DecisionsGrid decisions={decisions.items} /> },
    audit: { state: audit, node: <AuditLog events={audit.items} /> },
  };
  const active = panels[tab];

  return (
    <>
      <PageHeader
        title="TrustRail Security Center"
        description="Everything TrustRail detected, every policy decision it made and the tamper-evident audit trail behind them."
        actions={
          <Button variant="secondary" onClick={() => { summary.reload(); findings.reload(); decisions.reload(); audit.reload(); }}>
            Refresh
          </Button>
        }
      />

      <div className="mb-6 grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatTile label="Findings" loading={!s} value={s?.findings_total ?? 0} />
        <StatTile label="Blocked attempts" loading={!s} value={s?.blocked_attempts ?? 0} tone={s && s.blocked_attempts > 0 ? "block" : "neutral"} />
        <StatTile label="Prompt injections detected" loading={!s} value={s?.prompt_injections_detected ?? 0} tone={s && s.prompt_injections_detected > 0 ? "review" : "neutral"} />
        <StatTile label="Duplicate captures" loading={!s} value={s?.duplicate_captures ?? 0} tone={s && s.duplicate_captures === 0 ? "allow" : "block"} sub="Target: always 0" />
      </div>

      <Card>
        <div className="px-3 pt-1">
          <Tabs<Tab>
            label="Security center sections"
            value={tab}
            onChange={setTab}
            items={[
              { key: "findings", label: "Findings", count: findings.items?.length },
              { key: "decisions", label: "Policy decisions", count: decisions.items?.length },
              { key: "audit", label: "Audit log", count: audit.items?.length },
            ]}
          />
        </div>
        <div role="tabpanel" aria-label={TAB_LABELS[tab]} className="px-5 py-4">
          {tab === "findings" ? (
            <div className="mb-3 flex flex-wrap items-center gap-2">
              <label htmlFor="severity-filter" className="text-[13px] text-ink-3">
                Severity
              </label>
              <div className="w-44">
              <Select
                id="severity-filter"
                value={severity}
                onChange={(e) => setSeverity(e.target.value as Severity | "")}
              >
                <option value="">All</option>
                <option value="CRITICAL">Critical</option>
                <option value="HIGH">High</option>
                <option value="MEDIUM">Medium</option>
                <option value="LOW">Low</option>
              </Select>
              </div>
            </div>
          ) : null}
          {active.state.error && !active.state.items ? (
            <ErrorNotice error={active.state.error} onRetry={active.state.reload} />
          ) : (
            <>
              {active.node}
              <LoadMore state={active.state} />
            </>
          )}
        </div>
      </Card>
    </>
  );
}
