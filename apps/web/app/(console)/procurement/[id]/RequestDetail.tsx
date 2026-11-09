"use client";

import type { ProcurementRequestDto, PurchaseOrderDto } from "@qm/contracts";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ForecastLines } from "@/components/inventory/ForecastLines";
import { AgentTimeline } from "@/components/procurement/AgentTimeline";
import { CandidateTable } from "@/components/procurement/CandidateTable";
import { IntentPanel } from "@/components/procurement/IntentPanel";
import { MarketEvidence } from "@/components/procurement/MarketEvidence";
import { ProposalList } from "@/components/procurement/ProposalList";
import { RecommendationPanel } from "@/components/procurement/RecommendationPanel";
import { ResearchProgress } from "@/components/procurement/ResearchProgress";
import { FindingsList } from "@/components/security/FindingsList";
import { useSession } from "@/components/session/SessionProvider";
import { StatusBadge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { ButtonLink } from "@/components/ui/ButtonLink";
import { Card, CardBody, CardHeader } from "@/components/ui/Card";
import { ErrorNotice } from "@/components/ui/ErrorNotice";
import { Notice } from "@/components/ui/Notice";
import { PageHeader } from "@/components/ui/PageHeader";
import { SkeletonCard } from "@/components/ui/Skeleton";
import { api } from "@/lib/api";
import { dateTime, describeDemandMultiplier, num } from "@/lib/format";
import { useAction, usePoller, useResource } from "@/lib/hooks";
import { isConflictError } from "@/lib/http";
import { REQUEST_STATUS_TONES } from "@/lib/labels";

/** Guards against firing the long research call twice (e.g. React StrictMode remounts). */
const researchInFlight = new Set<string>();

export function RequestDetail({ id }: { id: string }) {
  const { can, config } = useSession();
  const router = useRouter();
  const params = useSearchParams();
  const request = useResource((signal) => api.procurement.get(id, { signal }), [id]);
  const inventory = useResource((signal) => api.inventory.list({ signal }), []);
  const [researchStartedAt, setResearchStartedAt] = useState<number | null>(null);
  const setRequest = request.setData;
  const reloadRequest = request.reload;
  const autoStarted = useRef(false);

  // A 409 (REQUEST_NOT_RESEARCHABLE, RESEARCH_IN_PROGRESS, REQUEST_NOT_APPROVABLE…) means this page is
  // out of date: reload it, which also starts the research poller if research is now running elsewhere.
  const reloadOnConflict = useCallback(
    (err: unknown) => {
      if (isConflictError(err)) reloadRequest();
    },
    [reloadRequest],
  );

  const research = useAction(async () => {
    if (researchInFlight.has(id)) return;
    researchInFlight.add(id);
    setResearchStartedAt(Date.now());
    try {
      const result = await api.procurement.research(id);
      setRequest(result);
    } catch (err) {
      reloadOnConflict(err);
      throw err;
    } finally {
      researchInFlight.delete(id);
      setResearchStartedAt(null);
    }
  });

  const evaluate = useAction(async () => {
    try {
      setRequest(await api.procurement.evaluate(id));
    } catch (err) {
      reloadOnConflict(err);
      throw err;
    }
  });

  const data = request.data;

  // Auto-run research once, only when the composer sent us here with ?research=1 for the
  // DRAFT it just created. Opening any other DRAFT never starts the (rate-limited) research call.
  const runResearch = research.run;
  const autoResearch = params.get("research") === "1";
  useEffect(() => {
    if (!autoResearch || !data || autoStarted.current) return;
    autoStarted.current = true;
    if (data.status === "DRAFT" && can("runResearch")) void runResearch();
    router.replace(`/procurement/${id}`, { scroll: false });
  }, [data, can, runResearch, autoResearch, router, id]);

  // If research is running server-side (started elsewhere), poll until it settles. Each poll
  // waits for the previous one, so a slow GET is never cut off by the next tick.
  const serverResearching = data?.status === "RESEARCHING" && !research.pending;
  const poll = usePoller(
    async (signal) => {
      setRequest(await api.procurement.get(id, { signal }));
    },
    { active: serverResearching, intervalMs: 3000, maxIntervalMs: 30_000 },
  );

  const itemNames = useMemo(() => {
    const map = new Map<string, string>();
    for (const item of inventory.data?.items ?? []) map.set(item.id, item.name);
    for (const line of data?.forecast?.lines ?? []) map.set(line.inventory_item_id, line.name);
    return map;
  }, [inventory.data, data?.forecast]);

  const updateProposal = useCallback(
    (po: PurchaseOrderDto) => {
      setRequest((prev) => {
        if (!prev) throw new Error("Request not loaded");
        return { ...prev, proposals: prev.proposals.map((p) => (p.id === po.id ? po : p)) } satisfies ProcurementRequestDto;
      });
    },
    [setRequest],
  );

  if (request.error && !data) {
    return (
      <div className="space-y-4">
        <Link href="/procurement" className="text-[13px] text-accent hover:underline">
          ← All requests
        </Link>
        <ErrorNotice error={request.error} onRetry={request.reload} title="Couldn't load this request" />
      </div>
    );
  }

  if (!data) {
    return (
      <div className="space-y-4">
        <SkeletonCard lines={2} />
        <SkeletonCard lines={5} />
        <SkeletonCard lines={4} />
      </div>
    );
  }

  const researching = research.pending || data.status === "RESEARCHING";
  const readyCount = data.proposals.filter((p) => p.status === "PROPOSED" && p.policy_decision?.decision !== "BLOCK").length;
  const hasResearch = data.agent_steps.length > 0 || data.proposals.length > 0;

  return (
    <>
      <PageHeader
        meta={
          <>
            <Link href="/procurement" className="text-[13px] text-accent hover:underline">
              ← All requests
            </Link>
            <StatusBadge status={data.status} tones={REQUEST_STATUS_TONES} kind="Request" />
            <span className="text-[12.5px] text-ink-3">Created {dateTime(data.created_at)}</span>
          </>
        }
        title="Procurement request"
        description={data.instruction}
        actions={
          <>
            {can("runResearch") && data.status !== "DRAFT" ? (
              <Button
                variant="secondary"
                onClick={() => void evaluate.run()}
                loading={evaluate.pending}
                disabled={researching}
                title="Re-run TrustRail policy evaluation against the current mandate"
              >
                Re-evaluate
              </Button>
            ) : null}
            {can("runResearch") ? (
              <Button
                variant={data.status === "DRAFT" ? "primary" : "secondary"}
                onClick={() => void research.run()}
                loading={research.pending}
                disabled={researching && !research.pending}
              >
                {hasResearch ? "Re-run research" : "Run research"}
              </Button>
            ) : null}
            {readyCount > 0 ? (
              <ButtonLink href="#proposals" variant="primary">
                Review {readyCount} proposal{readyCount === 1 ? "" : "s"}
              </ButtonLink>
            ) : null}
          </>
        }
      />

      <div className="space-y-6">
        {!config.ai.enabled ? (
          <Notice tone="review" title="Running in deterministic mode — no LLM configured">
            The instruction was interpreted with deterministic rules.
          </Notice>
        ) : null}

        {researching ? <ResearchProgress startedAt={researchStartedAt ?? Date.parse(data.updated_at)} /> : null}
        {isConflictError(research.error) ? (
          <ErrorNotice error={research.error} title="Research didn't start" onRetry={reloadRequest} retryLabel="Reload request" />
        ) : (
          <ErrorNotice error={research.error} title="Research failed" onRetry={() => void research.run()} />
        )}
        {serverResearching && poll.error ? (
          <ErrorNotice error={poll.error} title="Couldn't check research progress — retrying" onRetry={poll.restart} />
        ) : null}
        <ErrorNotice
          error={evaluate.error}
          title="Re-evaluation failed"
          onRetry={isConflictError(evaluate.error) ? reloadRequest : undefined}
          retryLabel="Reload request"
        />

        {data.security_findings.length > 0 ? (
          <Card aria-labelledby="req-findings-title" className="border-block-line">
            <CardHeader
              id="req-findings-title"
              title="TrustRail security findings"
              description="Untrusted content in supplier data or documents that TrustRail detected and neutralised."
            />
            <CardBody>
              <FindingsList findings={data.security_findings} linkRequests={false} />
            </CardBody>
          </Card>
        ) : null}

        <div className="grid grid-cols-1 gap-6 xl:grid-cols-[1.3fr_1fr]">
          <IntentPanel request={data} itemNames={itemNames} />
          <AgentTimeline steps={data.agent_steps} />
        </div>

        {data.forecast ? (
          <Card aria-labelledby="req-forecast-title">
            <CardHeader
              id="req-forecast-title"
              title="Forecast"
              description={`${describeDemandMultiplier(data.forecast.demand_multiplier)} (${num(data.forecast.demand_multiplier, 2)}×) · ${data.forecast.method}`}
            />
            <CardBody>
              <ForecastLines lines={data.forecast.lines} />
            </CardBody>
          </Card>
        ) : null}

        {hasResearch || data.market.length > 0 ? (
          <MarketEvidence market={data.market} itemNames={itemNames} currency={data.currency} />
        ) : null}

        {data.candidates.length > 0 ? <CandidateTable candidates={data.candidates} itemNames={itemNames} currency={data.currency} /> : null}

        {data.recommendation ? <RecommendationPanel recommendation={data.recommendation} /> : null}

        <section id="proposals" aria-labelledby="proposals-title" className="scroll-mt-20">
          <h2 id="proposals-title" className="mb-3 text-[17px] font-semibold tracking-[-0.01em] text-ink">
            Proposals
          </h2>
          <ProposalList requestId={data.id} proposals={data.proposals} onChange={updateProposal} onReload={request.reload} />
        </section>
      </div>
    </>
  );
}
