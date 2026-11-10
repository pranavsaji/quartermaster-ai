import { sql } from "drizzle-orm";
import { usageCounters } from "@qm/database";
import { Channel3Client, OpenAIClient } from "@qm/integrations";
import type { AppContext } from "../context";

/**
 * Daily caps on paid services. Every research run is counted per organisation and platform-wide,
 * and model tokens are added when a run ends. Beyond RESEARCH_DAILY_RUNS_PER_ORG,
 * RESEARCH_DAILY_RUNS_GLOBAL or RESEARCH_DAILY_TOKENS_GLOBAL, research still runs, but on the
 * deterministic fallback (no OpenAI, no Channel3), and says so in its steps. Counters are keyed by
 * UTC day and updated atomically, so the caps hold across instances.
 */
export type AllowanceLimit = "ORG_DAILY_RUNS" | "GLOBAL_DAILY_RUNS" | "GLOBAL_DAILY_TOKENS";

export interface PaidAllowance {
  /** Whether this run may call OpenAI and Channel3. */
  paid: boolean;
  limit: AllowanceLimit | null;
}

const utcDay = (now: Date) => now.toISOString().slice(0, 10);
const orgScope = (organizationId: string) => `org:${organizationId}`;

async function bump(ctx: AppContext, scope: string, day: string, runs: number, tokens: number) {
  const [row] = await ctx.db
    .insert(usageCounters)
    .values({ scope, day, researchRuns: runs, modelTokens: tokens })
    .onConflictDoUpdate({
      target: [usageCounters.scope, usageCounters.day],
      set: {
        researchRuns: sql`${usageCounters.researchRuns} + excluded.research_runs`,
        modelTokens: sql`${usageCounters.modelTokens} + excluded.model_tokens`,
      },
    })
    .returning({ runs: usageCounters.researchRuns, tokens: usageCounters.modelTokens });
  return row ?? { runs, tokens };
}

/** A warning once per day per cap (the request that crossed it), for the operators' error tracker. */
async function capReached(ctx: AppContext, limit: AllowanceLimit) {
  await ctx.errors.capture({
    source: "api",
    level: "warning",
    code: "USAGE_DAILY_CAP_REACHED",
    message: "A daily cap on paid research was reached; research continues on the deterministic fallback",
    key: `usage:${limit}`,
    context: { limit },
  });
}

/**
 * Counts a research run (or, with `countRun: false`, only checks the caps, for model calls outside
 * research such as interpreting a new request) and says whether it may use paid services.
 */
export async function claimResearchAllowance(ctx: AppContext, organizationId: string, opts: { countRun: boolean }): Promise<PaidAllowance> {
  const day = utcDay(ctx.now());
  const runs = opts.countRun ? 1 : 0;
  const caps = ctx.config.security.research;
  const org = await bump(ctx, orgScope(organizationId), day, runs, 0);
  const global = await bump(ctx, "global", day, runs, 0);
  if (opts.countRun) {
    if (org.runs === caps.dailyRunsPerOrg + 1) await capReached(ctx, "ORG_DAILY_RUNS");
    if (global.runs === caps.dailyRunsGlobal + 1) await capReached(ctx, "GLOBAL_DAILY_RUNS");
  }
  const limit: AllowanceLimit | null =
    org.runs > caps.dailyRunsPerOrg
      ? "ORG_DAILY_RUNS"
      : global.runs > caps.dailyRunsGlobal
        ? "GLOBAL_DAILY_RUNS"
        : global.tokens >= caps.dailyTokensGlobal
          ? "GLOBAL_DAILY_TOKENS"
          : null;
  return { paid: limit === null, limit };
}

/** Adds a run's model tokens to today's counters. */
export async function recordModelTokens(ctx: AppContext, organizationId: string, tokens: number): Promise<void> {
  if (!(tokens > 0)) return;
  const day = utcDay(ctx.now());
  await bump(ctx, orgScope(organizationId), day, 0, tokens);
  const global = await bump(ctx, "global", day, 0, tokens);
  const cap = ctx.config.security.research.dailyTokensGlobal;
  if (global.tokens >= cap && global.tokens - tokens < cap) await capReached(ctx, "GLOBAL_DAILY_TOKENS");
}

/** The step summary shown when a run is over its allowance. */
export const ALLOWANCE_NOTE =
  "Daily allowance for live market data and the language model reached; this run uses the deterministic fallback and stored data until tomorrow (UTC).";

/**
 * The context a run over its allowance works with: the same, except that OpenAI and Channel3 are
 * disabled clients, so every model step takes its deterministic fallback and market search
 * reports market data as unavailable (prices then need human review).
 */
export function withoutPaidServices(ctx: AppContext): AppContext {
  return {
    ...ctx,
    openai: new OpenAIClient({ apiKey: null, model: ctx.config.openai.model }),
    channel3: new Channel3Client({ apiKey: null }),
  };
}
