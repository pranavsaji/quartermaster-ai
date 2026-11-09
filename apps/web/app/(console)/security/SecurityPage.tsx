"use client";

import type { Severity } from "@qm/contracts";
import { useId, useState, type ReactNode } from "react";
import { AuditLog } from "@/components/security/AuditLog";
import { DecisionsGrid } from "@/components/security/DecisionsGrid";
import { FindingsGrid } from "@/components/security/FindingsGrid";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { ErrorNotice } from "@/components/ui/ErrorNotice";
import { Select } from "@/components/ui/Field";
import { LoadMore } from "@/components/ui/LoadMore";
import { PageHeader } from "@/components/ui/PageHeader";
import { RefreshErrorNotice } from "@/components/ui/RefreshErrorNotice";
import { StatTile } from "@/components/ui/StatTile";
import { tabPanelProps, Tabs } from "@/components/ui/Tabs";
import { api } from "@/lib/api";
import { num } from "@/lib/format";
import { usePagedResource, useResource, type PagedState } from "@/lib/hooks";

type Tab = "findings" | "decisions" | "audit";

/**
 * Rows currently loaded. The API returns no totals for these lists, so when
 * more pages exist the count says "100+" rather than pretending to be a total.
 */
function loadedCount<T>(state: PagedState<T>): string | undefined {
  if (!state.items || state.stale) return undefined;
  return `${num(state.items.length)}${state.hasMore ? "+" : ""}`;
}

export function SecurityPage() {
  const idBase = useId();
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
  // While a new severity filter loads, show the loading state rather than the previous filter's rows.
  const findingRows = findings.stale ? undefined : findings.items;
  const panels: Record<Tab, { state: PagedState<unknown>; node: ReactNode }> = {
    findings: { state: findings, node: <FindingsGrid findings={findingRows} /> },
    decisions: { state: decisions, node: <DecisionsGrid decisions={decisions.items} /> },
    audit: { state: audit, node: <AuditLog events={audit.items} /> },
  };
  const active = panels[tab];
  const refreshing = summary.refreshing || findings.refreshing || decisions.refreshing || audit.refreshing;

  function refreshAll() {
    summary.reload();
    findings.reload();
    decisions.reload();
    audit.reload();
  }

  return (
    <>
      <PageHeader
        title="TrustRail Security Center"
        description="Everything TrustRail detected, every policy decision it made and the tamper-evident audit trail behind them."
        actions={
          <Button variant="secondary" onClick={refreshAll} loading={refreshing}>
            Refresh
          </Button>
        }
      />

      <div className="mb-6 grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatTile label="Findings" loading={!s} value={s?.findings_total ?? 0} />
        <StatTile
          label="Blocked attempts"
          loading={!s}
          value={s?.blocked_attempts ?? 0}
          tone={s && s.blocked_attempts > 0 ? "block" : "neutral"}
        />
        <StatTile
          label="Prompt injections detected"
          loading={!s}
          value={s?.prompt_injections_detected ?? 0}
          tone={s && s.prompt_injections_detected > 0 ? "review" : "neutral"}
        />
        <StatTile
          label="Duplicate captures"
          loading={!s}
          value={s?.duplicate_captures ?? 0}
          tone={s && s.duplicate_captures === 0 ? "allow" : "block"}
          sub="Target: always 0"
        />
      </div>

      <Card>
        <div className="px-3 pt-1">
          <Tabs<Tab>
            idBase={idBase}
            label="Security center sections"
            value={tab}
            onChange={setTab}
            items={[
              {
                key: "findings",
                label: "Findings",
                // With no filter the summary has the true total; otherwise count what is loaded.
                count: !severity && s ? num(s.findings_total) : loadedCount(findings),
              },
              { key: "decisions", label: "Policy decisions", count: loadedCount(decisions) },
              { key: "audit", label: "Audit log", count: loadedCount(audit) },
            ]}
          />
        </div>
        <div {...tabPanelProps(idBase, tab)} className="px-5 py-4 focus-visible:outline-offset-[-2px]">
          {tab === "findings" ? (
            <div className="mb-3 flex flex-wrap items-center gap-2">
              <label htmlFor="severity-filter" className="text-[13px] text-ink-3">
                Severity
              </label>
              <div className="w-44">
                <Select id="severity-filter" value={severity} onChange={(e) => setSeverity(e.target.value as Severity | "")}>
                  <option value="">All</option>
                  <option value="CRITICAL">Critical</option>
                  <option value="HIGH">High</option>
                  <option value="MEDIUM">Medium</option>
                  <option value="LOW">Low</option>
                </Select>
              </div>
            </div>
          ) : null}
          <RefreshErrorNotice
            error={active.state.error}
            hasData={Boolean(active.state.items) && !active.state.stale}
            updatedAt={active.state.updatedAt}
            onRetry={active.state.reload}
            className="mb-3"
          />
          {active.state.error && (!active.state.items || active.state.stale) ? (
            <ErrorNotice error={active.state.error} onRetry={active.state.reload} />
          ) : (
            <>
              {active.node}
              <LoadMore state={active.state} noun={tab === "audit" ? "events" : tab === "decisions" ? "decisions" : "findings"} />
            </>
          )}
        </div>
      </Card>
    </>
  );
}
