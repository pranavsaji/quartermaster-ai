"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { Suspense } from "react";
import { RequestComposer } from "@/components/procurement/RequestComposer";
import { RequestList } from "@/components/procurement/RequestList";
import { useSession } from "@/components/session/SessionProvider";
import { Button } from "@/components/ui/Button";
import { Card, CardHeader } from "@/components/ui/Card";
import { ErrorNotice } from "@/components/ui/ErrorNotice";
import { Notice } from "@/components/ui/Notice";
import { PageHeader } from "@/components/ui/PageHeader";
import { api } from "@/lib/api";
import { useResource } from "@/lib/hooks";

function ProcurementContent() {
  const { user, config, can } = useSession();
  const router = useRouter();
  const params = useSearchParams();
  const composing = params.get("compose") === "1" && can("createRequest");
  const requests = useResource((signal) => api.procurement.list({ limit: 100 }, { signal }), []);

  return (
    <>
      <PageHeader
        title="Procurement"
        description="Plain-language restock requests. Each one is forecast, researched, compared and checked by TrustRail before it reaches you."
        actions={
          can("createRequest") && !composing ? (
            <Button variant="primary" onClick={() => router.push("/procurement?compose=1")}>
              New request
            </Button>
          ) : null
        }
      />

      <div className="space-y-4">
        {!config.ai.enabled ? (
          <Notice tone="review" title="Running in deterministic mode — no LLM configured">
            Instructions are parsed with deterministic rules. Results are still policy-checked by TrustRail.
          </Notice>
        ) : null}
        {!config.market_data.enabled ? (
          <Notice tone="neutral" title="Channel3 market data is disabled">
            Market price comparisons will be reported as unavailable; TrustRail may ask you to review price checks.
          </Notice>
        ) : null}
      </div>

      {composing ? (
        <div className="mt-4 mb-6">
          <RequestComposer currency={user.organization.currency} onCancel={() => router.push("/procurement")} />
        </div>
      ) : null}

      <Card aria-labelledby="requests-title" className={composing ? undefined : "mt-4"}>
        <CardHeader
          id="requests-title"
          title="Requests"
          actions={
            <Button size="sm" variant="ghost" onClick={requests.reload} loading={requests.refreshing}>
              Refresh
            </Button>
          }
        />
        <div className="p-3">
          {requests.error && !requests.data ? (
            <ErrorNotice error={requests.error} onRetry={requests.reload} />
          ) : (
            <RequestList requests={requests.data?.items} />
          )}
        </div>
      </Card>
    </>
  );
}

export default function ProcurementPage() {
  return (
    <Suspense fallback={null}>
      <ProcurementContent />
    </Suspense>
  );
}
