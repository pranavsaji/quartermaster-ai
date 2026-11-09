"use client";

import Link from "next/link";
import { FindingsList } from "@/components/security/FindingsList";
import { KpiRow } from "@/components/overview/KpiRow";
import { LowStockList } from "@/components/overview/LowStockList";
import { UpcomingDeliveries } from "@/components/overview/UpcomingDeliveries";
import { useSession } from "@/components/session/SessionProvider";
import { ButtonLink } from "@/components/ui/ButtonLink";
import { Card, CardBody, CardHeader } from "@/components/ui/Card";
import { ErrorNotice } from "@/components/ui/ErrorNotice";
import { Notice } from "@/components/ui/Notice";
import { PageHeader } from "@/components/ui/PageHeader";
import { SkeletonRows } from "@/components/ui/Skeleton";
import { api } from "@/lib/api";
import { useResource } from "@/lib/hooks";

export function OverviewPage() {
  const { user, config, can } = useSession();
  const summary = useResource((signal) => api.analytics.summary({ signal }), []);
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

      <KpiRow summary={summary.data} error={summary.error} onRetry={summary.reload} />

      <div className="mt-6 grid grid-cols-1 gap-6 xl:grid-cols-[1.4fr_1fr]">
        <LowStockList items={inventory.data?.items} error={inventory.error} onRetry={inventory.reload} />
        <div className="space-y-6">
          <UpcomingDeliveries
            deliveries={deliveries.data?.items}
            orders={orders.data?.items}
            error={deliveries.error}
            onRetry={deliveries.reload}
          />
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
              {findings.error && !findings.data ? (
                <ErrorNotice error={findings.error} onRetry={findings.reload} />
              ) : !findings.data ? (
                <SkeletonRows rows={3} />
              ) : (
                <FindingsList findings={findings.data.items} />
              )}
            </CardBody>
          </Card>
        </div>
      </div>
    </>
  );
}
