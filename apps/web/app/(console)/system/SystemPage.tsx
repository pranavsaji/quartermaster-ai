"use client";

import type { OpsHealthDto, SystemErrorDto } from "@qm/contracts";
import { useState } from "react";
import { useSession } from "@/components/session/SessionProvider";
import { Badge, StatusBadge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card, CardBody, CardHeader } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";
import { ErrorNotice } from "@/components/ui/ErrorNotice";
import { Select } from "@/components/ui/Field";
import { LoadMore } from "@/components/ui/LoadMore";
import { Notice } from "@/components/ui/Notice";
import { PageHeader } from "@/components/ui/PageHeader";
import { RefreshButton } from "@/components/ui/RefreshButton";
import { ResourceView } from "@/components/ui/ResourceView";
import { SkeletonRows } from "@/components/ui/Skeleton";
import { StatTile } from "@/components/ui/StatTile";
import { api, type TestAlertResult } from "@/lib/api";
import { dateTime, num, plural, relativeTime } from "@/lib/format";
import { useAction, usePagedResource, useResource } from "@/lib/hooks";
import { ERROR_LEVEL_TONES } from "@/lib/labels";

type StatusFilter = "OPEN" | "RESOLVED" | "ALL";

/** Platform operators only: error tracking, alert channels and payment-pipeline health. */
export function SystemPage() {
  const { user } = useSession();
  if (!user.operator) {
    return (
      <>
        <PageHeader title="System health" />
        <Notice tone="info" title="Operators only">
          System-wide error tracking is visible to the platform operators configured for this deployment.
        </Notice>
      </>
    );
  }
  return <OperatorView />;
}

function OperatorView() {
  const [status, setStatus] = useState<StatusFilter>("OPEN");
  const health = useResource((signal) => api.ops.health({ signal }), []);
  const errors = usePagedResource((cursor, signal) => api.ops.errors({ limit: 50, cursor, status }, { signal }), [status]);
  const [alertResult, setAlertResult] = useState<TestAlertResult | null>(null);
  const testAlert = useAction(async () => setAlertResult(await api.ops.testAlert()));

  const rows = errors.stale ? undefined : errors.items;

  return (
    <>
      <PageHeader
        title="System health"
        description="Errors from the API, background jobs, monitors and browsers, grouped and counted. Alerts go to the configured channels."
        actions={
          <>
            <Button variant="primary" onClick={() => void testAlert.run()} loading={testAlert.pending}>
              Send test alert
            </Button>
            <RefreshButton
              onClick={() => {
                health.reload();
                errors.reload();
              }}
              loading={health.refreshing || errors.refreshing}
            />
          </>
        }
      />

      <ErrorNotice error={testAlert.error} title="Test alert not sent" className="mb-4" />
      {alertResult ? <AlertResult result={alertResult} /> : null}

      <ResourceView resource={health} hasData={Boolean(health.data)} className="mb-6">
        <HealthTiles health={health.data} />
      </ResourceView>

      <Card aria-labelledby="errors-title">
        <CardHeader
          id="errors-title"
          title="Errors"
          description="Resolve an error once it is fixed; it reopens (and alerts again) if it comes back."
          actions={
            <div className="flex items-center gap-2 text-sm text-ink-2">
              <label htmlFor="error-status-filter">Show</label>
              <Select id="error-status-filter" value={status} onChange={(e) => setStatus(e.target.value as StatusFilter)} className="w-32">
                <option value="OPEN">Open</option>
                <option value="RESOLVED">Resolved</option>
                <option value="ALL">All</option>
              </Select>
            </div>
          }
        />
        <CardBody>
          <ResourceView resource={errors} hasData={Boolean(rows)} loading={<SkeletonRows rows={4} />}>
            {rows && rows.length === 0 ? (
              <EmptyState compact icon="system" title={status === "OPEN" ? "No open errors" : "Nothing here"} />
            ) : rows ? (
              <ul className="divide-y divide-line">
                {rows.map((e) => (
                  <ErrorRow key={e.id} error={e} onResolved={errors.reload} />
                ))}
              </ul>
            ) : null}
            <LoadMore state={errors} noun="errors" />
          </ResourceView>
        </CardBody>
      </Card>
    </>
  );
}

function AlertResult({ result }: { result: TestAlertResult }) {
  const nothing = result.email_recipients === 0 && !result.webhook_sent;
  return (
    <Notice
      tone={nothing ? "review" : "allow"}
      live
      className="mb-4"
      title={nothing ? "No alert channel is configured" : "Test alert sent"}
    >
      {nothing
        ? "Set ALERT_EMAILS (with email configured) or ALERT_WEBHOOK_URL on the API to receive alerts."
        : `Email: ${result.emails_sent} of ${plural(result.email_recipients, "recipient")}. Webhook: ${result.webhook_sent ? "delivered" : "not configured or failed"}.`}
    </Notice>
  );
}

function HealthTiles({ health: h }: { health: OpsHealthDto | undefined }) {
  const loading = !h;
  return (
    <div className="grid grid-cols-2 gap-4 xl:grid-cols-4">
      <StatTile
        label="Open errors"
        loading={loading}
        value={h ? num(h.error_tracking.open_errors) : ""}
        tone={h && h.error_tracking.open_errors > 0 ? "block" : "allow"}
        sub={h ? (h.error_tracking.sentry ? "Also forwarded to Sentry" : "Sentry not configured") : undefined}
      />
      <StatTile
        label="Alert channels"
        loading={loading}
        value={h ? [h.alerting.email ? "Email" : null, h.alerting.webhook ? "Webhook" : null].filter(Boolean).join(" + ") || "None" : ""}
        tone={h && !h.alerting.email && !h.alerting.webhook ? "review" : "neutral"}
        sub={h ? `${plural(h.alerting.recipients, "email recipient")} · email via ${h.email.provider}` : undefined}
      />
      <StatTile
        label="PayPal notifications (24 h)"
        loading={loading}
        value={h ? num(h.paypal_webhooks.received_24h) : ""}
        tone={h && h.paypal_webhooks.rejected_24h > 0 ? "review" : "neutral"}
        sub={
          h
            ? `Last ${h.paypal_webhooks.last_received_at ? relativeTime(h.paypal_webhooks.last_received_at) : "never"} · ${num(h.paypal_webhooks.rejected_24h)} rejected`
            : undefined
        }
      />
      <StatTile
        label="Captures awaiting PayPal"
        loading={loading}
        value={h ? num(h.payments.capture_pending) : ""}
        tone={h && h.payments.capture_pending > 0 ? "review" : "allow"}
        sub={h?.payments.oldest_pending_minutes != null ? `Oldest ${plural(h.payments.oldest_pending_minutes, "minute")}` : "None waiting"}
      />
    </div>
  );
}

function ErrorRow({ error: e, onResolved }: { error: SystemErrorDto; onResolved: () => void }) {
  const resolve = useAction(async () => {
    await api.ops.resolveError(e.id);
    onResolved();
  });
  return (
    <li className="py-3 text-sm">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-1.5">
            <StatusBadge status={e.level} tones={ERROR_LEVEL_TONES} kind="Level" />
            <Badge tone="neutral">{e.source}</Badge>
            <code className="font-mono text-xs text-ink-2">{e.code}</code>
            {e.resolved_at ? <Badge tone="allow">Resolved</Badge> : null}
          </div>
          <p className="mt-1 break-words text-ink">{e.message}</p>
          <p className="mt-0.5 text-xs text-ink-3">
            {e.route ? <span className="font-mono">{e.route}</span> : null}
            {e.route ? " · " : null}
            {plural(e.occurrences, "occurrence")} · first {dateTime(e.first_seen_at)} · last {relativeTime(e.last_seen_at)}
            {e.last_alerted_at ? ` · alerted ${relativeTime(e.last_alerted_at)}` : ""}
          </p>
          {e.last_correlation_id ? (
            <p className="mt-0.5 font-mono text-2xs text-ink-4">
              correlation id <span className="select-all text-ink-3">{e.last_correlation_id}</span>
            </p>
          ) : null}
        </div>
        {!e.resolved_at ? (
          <Button
            size="sm"
            variant="secondary"
            onClick={() => void resolve.run()}
            loading={resolve.pending}
            aria-label={`Resolve ${e.code}`}
          >
            Resolve
          </Button>
        ) : null}
      </div>
      <ErrorNotice error={resolve.error} title="Not resolved" className="mt-2" />
    </li>
  );
}
