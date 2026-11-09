"use client";

import { useState } from "react";
import { MandateForm } from "@/components/mandate/MandateForm";
import { useSession } from "@/components/session/SessionProvider";
import { Button } from "@/components/ui/Button";
import { Card, CardBody, CardHeader } from "@/components/ui/Card";
import { ErrorNotice } from "@/components/ui/ErrorNotice";
import { BudgetMeter } from "@/components/ui/Meter";
import { Notice } from "@/components/ui/Notice";
import { PageHeader } from "@/components/ui/PageHeader";
import { SkeletonCard } from "@/components/ui/Skeleton";
import { api, type MandateUpdateResponse } from "@/lib/api";
import { date, dateTime } from "@/lib/format";
import { useResource } from "@/lib/hooks";

export default function MandatePage() {
  const { can } = useSession();
  const current = useResource((signal) => api.mandates.current({ signal }), []);
  const suppliers = useResource((signal) => api.suppliers.list({ signal }), []);
  const [saved, setSaved] = useState<MandateUpdateResponse | null>(null);

  function onSaved(result: MandateUpdateResponse) {
    current.setData({ mandate: result.mandate, budget: result.budget });
    setSaved(result);
  }

  const data = current.data;

  return (
    <>
      <PageHeader
        title="Spend mandate"
        description="The deterministic rules TrustRail enforces on every cart before it can be approved, signed and paid."
        actions={
          <Button variant="secondary" onClick={() => { setSaved(null); current.reload(); suppliers.reload(); }} loading={current.refreshing}>
            Reload
          </Button>
        }
      />

      {saved ? (
        <Notice tone="allow" live className="mb-6" title={`Mandate saved as version ${saved.mandate.version}`}>
          {saved.revoked_certificates > 0
            ? `${saved.revoked_certificates} active intent certificate${saved.revoked_certificates === 1 ? " was" : "s were"} revoked because they were signed under the previous mandate. Those carts must be re-evaluated and approved again.`
            : "No active intent certificates needed to be revoked."}
        </Notice>
      ) : null}

      {current.error && !data ? <ErrorNotice error={current.error} onRetry={current.reload} /> : null}
      {suppliers.error && !suppliers.data ? <ErrorNotice error={suppliers.error} onRetry={suppliers.reload} title="Couldn't load suppliers" className="mb-4" /> : null}

      {!data && !current.error ? (
        <div className="space-y-4">
          <SkeletonCard lines={2} />
          <SkeletonCard lines={8} />
        </div>
      ) : null}

      {data ? (
        <div className="space-y-6">
          <Card aria-labelledby="budget-title">
            <CardHeader
              id="budget-title"
              title="This week's budget"
              description={`${date(data.budget.period_start)} – ${date(data.budget.period_end)}. Reserved = approved certificates not yet captured.`}
            />
            <CardBody>
              <BudgetMeter budget={data.budget} />
            </CardBody>
          </Card>

          {suppliers.data ? (
            <MandateForm
              key={`${data.mandate.id}-${data.mandate.version}`}
              mandate={data.mandate}
              suppliers={suppliers.data.items}
              editable={can("editMandate")}
              onSaved={onSaved}
            />
          ) : !suppliers.error ? (
            <SkeletonCard lines={8} />
          ) : null}

          <Card aria-labelledby="history-title">
            <CardHeader id="history-title" title="Version history" />
            <CardBody className="text-[13px] leading-relaxed text-ink-2">
              <p>
                You are viewing <span className="font-medium text-ink">version {data.mandate.version}</span>, created{" "}
                {dateTime(data.mandate.created_at)}.
              </p>
              <p className="mt-2 text-ink-3">
                Mandates are append-only: every save creates a new version and marks the previous one superseded. Each
                policy decision and intent certificate records the mandate version it was evaluated under, and every change
                is written to the hash-chained audit log in the Security center.
              </p>
            </CardBody>
          </Card>
        </div>
      ) : null}
    </>
  );
}
