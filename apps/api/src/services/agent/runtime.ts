import { eq } from "drizzle-orm";
import { agentRuns, toolExecutions, type DbOrTx } from "@qm/database";
import type { AiMode } from "@qm/contracts";
import { redactSecrets } from "@qm/integrations";
import { AppError } from "../../errors";
import type { Logger } from "../../logger";

/**
 * Bounded execution envelope for one agent workflow: a strict tool allowlist, a maximum number
 * of tool calls, a wall-clock deadline and a token budget. Every tool call is recorded.
 *
 * No payment tool exists in any allowlist. Payment operations are only reachable from
 * authenticated HTTP handlers through TrustRail's capture guard.
 */
export const AGENT_TOOLS = [
  "inventory.read",
  "forecast.compute",
  "intent.interpret",
  "market.search",
  "suppliers.quote",
  "suppliers.compare",
  "security.scan",
  "planner.plan",
  "trustrail.evaluate",
  "recommendation.explain",
] as const;
export type AgentTool = (typeof AGENT_TOOLS)[number];

export type AgentBudgetReason = "deadline" | "tool_calls" | "research_calls";

/**
 * The run hit one of its limits. It is an AppError so it reaches clients as a typed, retryable
 * 503 with fixed text (AGENT_DEADLINE_EXCEEDED for the wall clock, AGENT_BUDGET_EXCEEDED for the
 * call limits) rather than an unhandled 500.
 */
export class AgentBudgetExceeded extends AppError {
  constructor(readonly reason: AgentBudgetReason) {
    super(
      503,
      reason === "deadline" ? "AGENT_DEADLINE_EXCEEDED" : "AGENT_BUDGET_EXCEEDED",
      reason === "deadline"
        ? "The agent reached its deadline before finishing. Try again."
        : "The agent reached its step limit before finishing. Try again.",
      { retryable: true },
    );
    this.name = "AgentBudgetExceeded";
  }
}

/**
 * Client-visible text for a failed tool step. Only an AppError's message is authored for
 * clients; anything else (driver, provider or programming errors) is reduced to the tool name.
 */
export function failedStepSummary(tool: string, err: unknown): string {
  return err instanceof AppError ? `${tool} failed: ${err.message}` : `${tool} failed.`;
}

export interface AgentLimits {
  maxToolCalls: number;
  maxResearchCalls: number;
  deadlineMs: number;
  tokenBudget: number;
}

export class AgentRun {
  private calls = 0;
  private researchCalls = 0;
  private tokens = 0;
  private readonly startedAt = Date.now();
  private readonly deadline: AbortSignal;
  private reservedMs = 0;
  private reservedSignal: AbortSignal | null = null;
  aiMode: AiMode = "DETERMINISTIC_FALLBACK";
  model: string | null = null;

  private constructor(
    private readonly db: DbOrTx,
    readonly id: string,
    readonly organizationId: string,
    private readonly limits: AgentLimits,
    private readonly log?: Pick<Logger, "warn">,
  ) {
    this.deadline = AbortSignal.timeout(Math.max(0, limits.deadlineMs));
  }

  static async start(
    db: DbOrTx,
    args: { organizationId: string; requestId: string; kind: string; limits: AgentLimits; log?: Pick<Logger, "warn"> },
  ): Promise<AgentRun> {
    const [row] = await db
      .insert(agentRuns)
      .values({
        organizationId: args.organizationId,
        requestId: args.requestId,
        kind: args.kind,
        status: "RUNNING",
        aiMode: "DETERMINISTIC_FALLBACK",
      })
      .returning({ id: agentRuns.id });
    return new AgentRun(db, row!.id, args.organizationId, args.limits, args.log);
  }

  get remainingMs(): number {
    return this.limits.deadlineMs - (Date.now() - this.startedAt);
  }

  /**
   * Time left for optional work: the remaining time minus any tail reserved with reserve().
   * Optional steps (market search, model calls) check this so they cannot use up the time that
   * the mandatory steps after them need.
   */
  get budgetMs(): number {
    return this.remainingMs - this.reservedMs;
  }

  /**
   * Reserves the last `ms` of the deadline for the steps that must run (planning and TrustRail
   * evaluation): until release(), `budgetMs` and `signal` end that much earlier.
   */
  reserve(ms: number): void {
    this.reservedMs = Math.max(0, Math.min(ms, this.limits.deadlineMs));
    this.reservedSignal = this.reservedMs > 0 ? AbortSignal.any([this.deadline, AbortSignal.timeout(Math.max(0, this.budgetMs))]) : null;
  }

  /** Returns the reserved tail: the remaining steps may use the run's full deadline. */
  release(): void {
    this.reservedMs = 0;
    this.reservedSignal = null;
  }

  /**
   * Aborts when the run's deadline passes, or when the reserved tail begins (see reserve()).
   * Pass it to every outbound call made for this run (OpenAI, Channel3) so in-flight requests
   * stop in time, not only at the next tool call.
   */
  get signal(): AbortSignal {
    return this.reservedSignal ?? this.deadline;
  }

  get tokensUsed(): number {
    return this.tokens;
  }

  canSpendTokens(estimate: number): boolean {
    return this.tokens + estimate <= this.limits.tokenBudget;
  }

  addTokens(n: number): void {
    this.tokens += n;
  }

  /** Runs one allowlisted tool with accounting. `summarize` produces the human-readable step summary. */
  async tool<T>(tool: AgentTool, input: Record<string, unknown>, fn: () => Promise<T>, summarize: (r: T) => string): Promise<T> {
    if (!(AGENT_TOOLS as readonly string[]).includes(tool)) throw new Error(`Tool ${tool} is not allowlisted`);
    if (this.calls >= this.limits.maxToolCalls) throw new AgentBudgetExceeded("tool_calls");
    if (tool === "market.search" && this.researchCalls >= this.limits.maxResearchCalls) throw new AgentBudgetExceeded("research_calls");
    if (this.remainingMs <= 0 || this.deadline.aborted) throw new AgentBudgetExceeded("deadline");
    this.calls++;
    if (tool === "market.search") this.researchCalls++;
    const started = new Date();
    try {
      const result = await fn();
      await this.record(tool, input, "SUCCEEDED", summarize(result), null, started);
      return result;
    } catch (err) {
      // Step summaries are shown to every member of the organization, so they carry authored
      // text only. The underlying message goes to the logs, and a redacted copy to the internal
      // `error` column, which the API never returns.
      this.log?.warn({ err, tool, agent_run_id: this.id }, "agent tool failed");
      const internal = redactSecrets(err instanceof Error ? err.message : String(err), 1000);
      await this.record(tool, input, "FAILED", failedStepSummary(tool, err), internal, started);
      throw err;
    }
  }

  async skip(tool: AgentTool, reason: string): Promise<void> {
    await this.record(tool, {}, "SKIPPED", reason, null, new Date());
  }

  private async record(
    tool: string,
    input: Record<string, unknown>,
    status: "SUCCEEDED" | "FAILED" | "SKIPPED",
    summary: string,
    error: string | null,
    started: Date,
  ) {
    await this.db.insert(toolExecutions).values({
      organizationId: this.organizationId,
      agentRunId: this.id,
      tool,
      status,
      input,
      summary: summary.slice(0, 1000),
      error: error?.slice(0, 1000) ?? null,
      durationMs: Date.now() - started.getTime(),
      startedAt: started,
    });
  }

  async finish(status: "SUCCEEDED" | "FAILED", error?: string): Promise<void> {
    await this.db
      .update(agentRuns)
      .set({
        status,
        aiMode: this.aiMode,
        model: this.model,
        tokensUsed: this.tokens,
        toolCalls: this.calls,
        error: error ?? null,
        completedAt: new Date(),
      })
      .where(eq(agentRuns.id, this.id));
  }
}
