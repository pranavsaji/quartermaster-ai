"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { Suspense } from "react";
import { RequestComposer } from "@/components/procurement/RequestComposer";
import { RequestList } from "@/components/procurement/RequestList";
import { useSession } from "@/components/session/SessionProvider";
import { Button } from "@/components/ui/Button";
import { Card, CardHeader } from "@/components/ui/Card";
import { LoadMore } from "@/components/ui/LoadMore";
import { Notice } from "@/components/ui/Notice";
import { PageHeader } from "@/components/ui/PageHeader";
import { RefreshButton } from "@/components/ui/RefreshButton";
import { ResourceView } from "@/components/ui/ResourceView";
import { api } from "@/lib/api";
import { usePagedResource } from "@/lib/hooks";

const REQUESTS_PAGE_SIZE = 25;

function ProcurementContent() {
  const { user, config, can } = useSession();
  const router = useRouter();
  const params = useSearchParams();
  const composing = params.get("compose") === "1" && can("createRequest");
  // One paging scheme: the API pages (newest first) and "Load more" appends; the grid itself never paginates.
  const requests = usePagedResource((cursor, signal) => api.procurement.list({ limit: REQUESTS_PAGE_SIZE, cursor }, { signal }), []);

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
          <Notice tone="review" title="Running without an AI model">
            Requests are read with fixed rules instead of a language model. TrustRail checks every cart either way.
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
          <RequestComposer
            currency={user.organization.currency}
            timeZone={user.organization.timezone}
            onCancel={() => router.push("/procurement")}
          />
        </div>
      ) : null}

      <Card aria-labelledby="requests-title" className={composing ? undefined : "mt-4"}>
        <CardHeader
          id="requests-title"
          title="Requests"
          actions={<RefreshButton onClick={requests.reload} loading={requests.refreshing} />}
        />
        <div className="p-3">
          <ResourceView resource={requests} hasData={Boolean(requests.items)}>
            <RequestList requests={requests.items} />
            <LoadMore state={requests} noun="requests, newest first" />
          </ResourceView>
        </div>
      </Card>
    </>
  );
}

export function ProcurementPage() {
  return (
    <Suspense fallback={null}>
      <ProcurementContent />
    </Suspense>
  );
}
