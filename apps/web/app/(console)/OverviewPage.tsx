"use client";

import Link from "next/link";
import { FindingsList } from "@/components/security/FindingsList";
import { KpiRow } from "@/components/overview/KpiRow";
import { LowStockList } from "@/components/overview/LowStockList";
import { UpcomingDeliveries } from "@/components/overview/UpcomingDeliveries";
import { useSession } from "@/components/session/SessionProvider";
import { ButtonLink } from "@/components/ui/ButtonLink";
import { Card, CardBody, CardHeader } from "@/components/ui/Card";
import { Notice } from "@/components/ui/Notice";
import { PageHeader } from "@/components/ui/PageHeader";
import { ResourceView } from "@/components/ui/ResourceView";
import { SkeletonRows } from "@/components/ui/Skeleton";
import { api } from "@/lib/api";
import { useResource } from "@/lib/hooks";

export function OverviewPage() {
  const { user, config, can } = useSession();
  const summary = useResource((signal, { refresh }) => api.analytics.summary({ signal, fresh: refresh }), []);
  const inventory = useResource((signal) => api.inventory.list({ signal }), []);
  const deliveries = useResource((signal) => api.deliveries.list({ signal }), []);
  const orders = useResource((signal) => api.purchaseOrders.list({ limit: 100 }, { signal }), []);
  const findings = useResource((signal) => api.security.events({ limit: 5 }, { signal }), []);

  const firstName = user.name.split(" ")[0] ?? user.name;

  return (
    <>
      <PageHeader
        title={`Good to see you, ${firstName}`}
        description="Stock levels, spend against your mandate and everything TrustRail has stopped this week."
        actions={
          can("createRequest") ? (
            <ButtonLink href="/procurement?compose=1" variant="primary">
              New procurement request
            </ButtonLink>
          ) : null
        }
      />

      {!config.ai.enabled ? (
        <Notice tone="review" title="Running in deterministic mode — no LLM configured" className="mb-6">
          Requests are interpreted with deterministic rules instead of a language model. Policy enforcement is unaffected.
        </Notice>
      ) : null}

      <KpiRow summary={summary.data} resource={summary} />

      <div className="mt-6 grid grid-cols-1 gap-6 xl:grid-cols-[1.4fr_1fr]">
        <LowStockList items={inventory.data?.items} resource={inventory} />
        <div className="space-y-6">
          <UpcomingDeliveries deliveries={deliveries.data?.items} orders={orders.data?.items} resource={deliveries} />
          <Card aria-labelledby="findings-title">
            <CardHeader
              id="findings-title"
              title="Recent TrustRail findings"
              actions={
                <Link href="/security" className="text-[13px] font-medium text-accent hover:underline">
                  Security center
                </Link>
              }
            />
            <CardBody>
              <ResourceView resource={findings} hasData={Boolean(findings.data)} loading={<SkeletonRows rows={3} />}>
                <FindingsList findings={findings.data?.items ?? []} />
              </ResourceView>
            </CardBody>
          </Card>
        </div>
      </div>
    </>
  );
}
