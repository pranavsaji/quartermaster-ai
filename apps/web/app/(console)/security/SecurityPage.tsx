"use client";

import type { AnalyticsSummaryDto, Severity } from "@qm/contracts";
import { useId, useState, type ReactNode } from "react";
import { AuditLog } from "@/components/security/AuditLog";
import { DecisionsGrid } from "@/components/security/DecisionsGrid";
import { FindingsGrid } from "@/components/security/FindingsGrid";
import { PayPalNotificationsCard } from "@/components/security/PayPalNotificationsCard";
import { Card } from "@/components/ui/Card";
import { Select } from "@/components/ui/Field";
import { LoadMore } from "@/components/ui/LoadMore";
import { PageHeader } from "@/components/ui/PageHeader";
import { RefreshButton } from "@/components/ui/RefreshButton";
import { ResourceView } from "@/components/ui/ResourceView";
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

function SecurityTiles({ totals: s }: { totals: AnalyticsSummaryDto["security"] | undefined }) {
  return (
    // Stopped attacks are TrustRail doing its job: shown as protection, not as alarms. Only a
    // duplicate capture (money taken twice) is a real problem, and zero stays neutral.
    <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
      <StatTile label="Findings" loading={!s} value={s ? num(s.findings_total) : ""} sub="Everything TrustRail flagged" />
      <StatTile
        label="Blocked attempts"
        loading={!s}
        value={s ? num(s.blocked_attempts) : ""}
        tone={s && s.blocked_attempts > 0 ? "allow" : "neutral"}
        sub="Unsafe carts stopped before payment"
      />
      <StatTile
        label="Prompt injections caught"
        loading={!s}
        value={s ? num(s.prompt_injections_detected) : ""}
        tone={s && s.prompt_injections_detected > 0 ? "allow" : "neutral"}
        sub="Hidden instructions quarantined"
      />
      <StatTile
        label="Duplicate captures"
        loading={!s}
        value={s ? num(s.duplicate_captures) : ""}
        tone={s && s.duplicate_captures > 0 ? "block" : "neutral"}
        sub="Target: always 0"
      />
    </div>
  );
}

export function SecurityPage() {
  const idBase = useId();
  const [tab, setTab] = useState<Tab>("findings");
  const [severity, setSeverity] = useState<Severity | "">("");
  const summary = useResource((signal, { refresh }) => api.analytics.summary({ signal, fresh: refresh }), []);
  const findings = usePagedResource(
    (cursor, signal) => api.security.events({ limit: 100, cursor, severity: severity || undefined }, { signal }),
    [severity],
  );
  const decisions = usePagedResource((cursor, signal) => api.security.decisions({ limit: 100, cursor }, { signal }), []);
  const audit = usePagedResource((cursor, signal) => api.security.audit({ limit: 100, cursor }, { signal }), []);
  const notifications = useResource((signal) => api.security.paypalNotifications({ signal }), []);

  const s = summary.data?.security;
  // While a new severity filter loads, show the loading state rather than the previous filter's rows.
  const findingRows = findings.stale ? undefined : findings.items;
  const panels: Record<Tab, { state: PagedState<unknown>; node: ReactNode }> = {
    findings: { state: findings, node: <FindingsGrid findings={findingRows} /> },
    decisions: { state: decisions, node: <DecisionsGrid decisions={decisions.items} /> },
    audit: { state: audit, node: <AuditLog events={audit.items} /> },
  };
  const active = panels[tab];
  const refreshing = summary.refreshing || findings.refreshing || decisions.refreshing || audit.refreshing || notifications.refreshing;

  function refreshAll() {
    summary.reload();
    findings.reload();
    decisions.reload();
    audit.reload();
    notifications.reload();
  }

  return (
    <>
      <PageHeader
        title="Security center"
        description="Everything TrustRail caught, every decision it made and the tamper-evident audit trail behind them."
        actions={<RefreshButton onClick={refreshAll} loading={refreshing} />}
      />

      <div className="mb-6">
        <ResourceView
          resource={summary}
          hasData={Boolean(s)}
          errorTitle="Couldn't load the security totals"
          loading={<SecurityTiles totals={undefined} />}
        >
          <SecurityTiles totals={s} />
        </ResourceView>
      </div>

      <div className="mb-6">
        <ResourceView
          resource={notifications}
          hasData={Boolean(notifications.data)}
          errorTitle="Couldn't load the PayPal notification status"
        >
          <PayPalNotificationsCard status={notifications.data?.status} />
        </ResourceView>
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
              <label htmlFor="severity-filter" className="text-sm text-ink-3">
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
          <ResourceView resource={active.state} hasData={Boolean(active.state.items) && !active.state.stale}>
            {active.node}
            <LoadMore state={active.state} noun={tab === "audit" ? "events" : tab === "decisions" ? "decisions" : "findings"} />
          </ResourceView>
        </div>
      </Card>
    </>
  );
}
