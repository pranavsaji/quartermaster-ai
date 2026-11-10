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
import { isApprovable } from "@/components/procurement/ProposalCard";
import { groupProposals, ProposalList } from "@/components/procurement/ProposalList";
import { RecommendationPanel } from "@/components/procurement/RecommendationPanel";
import { ResearchProgress } from "@/components/procurement/ResearchProgress";
import { FindingsList } from "@/components/security/FindingsList";
import { useSession } from "@/components/session/SessionProvider";
import { StatusBadge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { ButtonLink } from "@/components/ui/ButtonLink";
import { Card, CardBody, CardHeader } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";
import { ErrorNotice } from "@/components/ui/ErrorNotice";
import { Notice } from "@/components/ui/Notice";
import { PageHeader } from "@/components/ui/PageHeader";
import { ResourceView } from "@/components/ui/ResourceView";
import { SkeletonCard } from "@/components/ui/Skeleton";
import { api } from "@/lib/api";
import { dateTime, describeDemandMultiplier, money, num, plural } from "@/lib/format";
import { useAction, usePoller, useResource } from "@/lib/hooks";
import { ApiRequestError, isConflictError } from "@/lib/http";
import { REQUEST_STATUS_LABELS, REQUEST_STATUS_TONES } from "@/lib/labels";
import { forecastMethodLabel } from "@/lib/plain-language";

/** Guards against firing the long research call twice (e.g. React StrictMode remounts). */
const researchInFlight = new Set<string>();

function BackLink() {
  return (
    <Link href="/procurement" className="text-xs font-medium text-accent hover:underline">
      ← All requests
    </Link>
  );
}

/**
 * The line that stays in view while the owner scrolls a long request: what state it is in, what
 * is waiting for them and what it costs against the request's cap, with the next step one click away.
 */
function RequestSummaryBar({ request, researching }: { request: ProcurementRequestDto; researching: boolean }) {
  const g = groupProposals(request.proposals);
  const approvable = request.proposals.filter(isApprovable);
  const first = [...approvable].sort((a, b) => a.created_at.localeCompare(b.created_at))[0];
  const readyTotal = approvable.reduce((sum, p) => sum + p.total_minor, 0);
  // The cap stated in the instruction ("without exceeding $300") lives on the interpreted intent.
  const cap = request.budget_limit_minor ?? request.intent?.budget_limit_minor ?? null;
  const overCap = cap !== null && readyTotal > cap;
  return (
    <div className="sticky top-14 z-10 -mx-4 mb-6 border-y border-line bg-surface/90 px-4 py-2.5 backdrop-blur supports-[backdrop-filter]:bg-surface/75 sm:mx-0 sm:rounded-[var(--radius-card)] sm:border sm:px-4 sm:shadow-[var(--shadow-card)]">
      <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
        <div className="flex min-w-0 flex-1 flex-wrap items-center gap-x-3 gap-y-1 text-sm">
          {/* While this page's own research call runs the stored status is still DRAFT: say what is happening. */}
          <StatusBadge
            status={researching ? "RESEARCHING" : request.status}
            tones={REQUEST_STATUS_TONES}
            labels={REQUEST_STATUS_LABELS}
            kind="Request"
          />
          {g.ready > 0 ? (
            <span className="text-ink-2">
              <span className="font-medium text-ink">{plural(g.ready, "proposal")}</span> to review ·{" "}
              <span className="tnum font-medium text-ink">{money(readyTotal, request.currency)}</span>
              {cap !== null ? (
                <span className={overCap ? "text-block" : "text-ink-3"}>
                  {" "}
                  of your <span className="tnum">{money(cap, request.currency)}</span> cap
                </span>
              ) : null}
            </span>
          ) : (
            <span className="text-ink-3">
              {researching
                ? "Proposals appear when research finishes"
                : request.proposals.length === 0
                  ? "No proposals yet"
                  : "Nothing waiting for your approval"}
              {cap !== null ? (
                <>
                  {" "}
                  · cap <span className="tnum">{money(cap, request.currency)}</span>
                </>
              ) : null}
            </span>
          )}
          {g.blocked > 0 ? (
            <a href="#evidence" className="text-xs font-medium text-block hover:underline">
              {g.blocked} blocked by TrustRail
            </a>
          ) : null}
        </div>
        {first ? (
          <ButtonLink href={`#po-${first.id}`} variant="primary" size="sm">
            Review {plural(g.ready, "proposal")}
          </ButtonLink>
        ) : null}
      </div>
    </div>
  );
}

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

  if (!data) {
    // A request that doesn't exist (or belongs to another workspace) is a dead link, not a failure.
    if (request.error instanceof ApiRequestError && request.error.status === 404) {
      return (
        <div className="mx-auto mt-10 max-w-lg">
          <EmptyState
            icon="procurement"
            title="We couldn't find that request"
            description="It may have been removed, or the link is from another workspace."
            action={
              <ButtonLink href="/procurement" variant="primary">
                Back to requests
              </ButtonLink>
            }
          />
        </div>
      );
    }
    return (
      <div className="space-y-4">
        {request.error ? <BackLink /> : null}
        <ResourceView
          resource={request}
          hasData={false}
          errorTitle="Couldn't load this request"
          loading={
            <>
              <SkeletonCard lines={2} />
              <SkeletonCard lines={5} />
              <SkeletonCard lines={4} />
            </>
          }
        />
      </div>
    );
  }

  const researching = research.pending || data.status === "RESEARCHING";
  const hasResearch = data.agent_steps.length > 0 || data.proposals.length > 0;

  return (
    <>
      <PageHeader
        meta={
          <>
            <BackLink />
            <span className="text-xs text-ink-3">Created {dateTime(data.created_at)}</span>
          </>
        }
        title="Procurement request"
        description={data.instruction}
        actions={
          <>
            {can("runResearch") && data.status === "DRAFT" ? (
              <Button
                variant="primary"
                onClick={() => void research.run()}
                loading={research.pending}
                disabled={researching && !research.pending}
              >
                {research.pending ? "Researching…" : "Run research"}
              </Button>
            ) : null}
            {can("runResearch") && data.status !== "DRAFT" ? (
              <>
                <Button
                  variant="secondary"
                  onClick={() => void evaluate.run()}
                  loading={evaluate.pending}
                  disabled={researching}
                  title="Check every open cart against your current spend mandate again"
                >
                  Re-evaluate
                </Button>
                <Button
                  variant="secondary"
                  onClick={() => void research.run()}
                  loading={research.pending}
                  disabled={researching && !research.pending}
                >
                  {research.pending ? "Researching…" : hasResearch ? "Re-run research" : "Run research"}
                </Button>
              </>
            ) : null}
          </>
        }
      />

      <RequestSummaryBar request={data} researching={researching} />

      <div className="space-y-8">
        {/* A reload that failed (e.g. after a 409) says so instead of silently leaving stale data. */}
        <ResourceView resource={request} hasData className="" />
        {!config.ai.enabled ? (
          <Notice tone="review" title="Running without an AI model">
            The instruction was read with fixed rules instead of a language model. TrustRail&apos;s checks are the same either way.
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
              title="What TrustRail caught"
              description="Supplier content that tried to steer the agent or slip in charges. It was neutralised before any cart reached you."
            />
            <CardBody>
              <FindingsList findings={data.security_findings} linkRequests={false} />
            </CardBody>
          </Card>
        ) : null}

        {data.recommendation ? <RecommendationPanel recommendation={data.recommendation} /> : null}

        {researching && data.proposals.length === 0 ? (
          <div className="space-y-4" aria-hidden>
            <SkeletonCard lines={4} />
            <SkeletonCard lines={3} />
          </div>
        ) : (
          <ProposalList requestId={data.id} proposals={data.proposals} onChange={updateProposal} onReload={request.reload} />
        )}

        {!(researching && !hasResearch) && (hasResearch || data.forecast || data.market.length > 0) ? (
          <section aria-labelledby="research-title" className="space-y-6 border-t border-line pt-8">
            <div>
              <h2 id="research-title" className="text-lg font-semibold tracking-[-0.01em] text-ink">
                How Quartermaster got here
              </h2>
              <p className="mt-0.5 text-xs text-ink-3">
                What it understood, the forecast, the market check and every supplier it compared.
              </p>
            </div>

            <div className="grid grid-cols-1 items-start gap-6 xl:grid-cols-[1.3fr_1fr]">
              <IntentPanel request={data} itemNames={itemNames} />
              <AgentTimeline steps={data.agent_steps} />
            </div>

            {data.forecast ? (
              <Card aria-labelledby="req-forecast-title">
                <CardHeader
                  id="req-forecast-title"
                  title="Forecast"
                  description={`${describeDemandMultiplier(data.forecast.demand_multiplier)} (${num(data.forecast.demand_multiplier, 2)}×) · ${forecastMethodLabel(data.forecast.method)}`}
                />
                <CardBody>
                  <ForecastLines lines={data.forecast.lines} />
                </CardBody>
              </Card>
            ) : null}

            {hasResearch || data.market.length > 0 ? (
              <MarketEvidence market={data.market} itemNames={itemNames} currency={data.currency} />
            ) : null}

            {data.candidates.length > 0 ? (
              <CandidateTable candidates={data.candidates} itemNames={itemNames} currency={data.currency} market={data.market} />
            ) : null}
          </section>
        ) : null}
      </div>
    </>
  );
}
