import { eq } from "drizzle-orm";
import { agentRuns, toolExecutions, type DbOrTx } from "@qm/database";
import type { AiMode } from "@qm/contracts";

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

export class AgentBudgetExceeded extends Error {
  constructor(reason: string) {
    super(`Agent stopped: ${reason}`);
    this.name = "AgentBudgetExceeded";
  }
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
  aiMode: AiMode = "DETERMINISTIC_FALLBACK";
  model: string | null = null;

  private constructor(
    private readonly db: DbOrTx,
    readonly id: string,
    readonly organizationId: string,
    private readonly limits: AgentLimits,
  ) {
    this.deadline = AbortSignal.timeout(Math.max(0, limits.deadlineMs));
  }

  static async start(db: DbOrTx, args: { organizationId: string; requestId: string; kind: string; limits: AgentLimits }): Promise<AgentRun> {
    const [row] = await db
      .insert(agentRuns)
      .values({ organizationId: args.organizationId, requestId: args.requestId, kind: args.kind, status: "RUNNING", aiMode: "DETERMINISTIC_FALLBACK" })
      .returning({ id: agentRuns.id });
    return new AgentRun(db, row!.id, args.organizationId, args.limits);
  }

  get remainingMs(): number {
    return this.limits.deadlineMs - (Date.now() - this.startedAt);
  }

  /**
   * Aborts when the run's deadline passes. Pass it to every outbound call made for this run
   * (OpenAI, Channel3) so in-flight requests stop at the deadline, not only the next tool call.
   */
  get signal(): AbortSignal {
    return this.deadline;
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
    if (this.calls >= this.limits.maxToolCalls) throw new AgentBudgetExceeded("tool call limit reached");
    if (tool === "market.search" && this.researchCalls >= this.limits.maxResearchCalls) throw new AgentBudgetExceeded("research call limit reached");
    if (this.remainingMs <= 0 || this.deadline.aborted) throw new AgentBudgetExceeded("deadline exceeded");
    this.calls++;
    if (tool === "market.search") this.researchCalls++;
    const started = new Date();
    try {
      const result = await fn();
      await this.record(tool, input, "SUCCEEDED", summarize(result), null, started);
      return result;
    } catch (err) {
      await this.record(tool, input, "FAILED", `${tool} failed`, err instanceof Error ? err.message : String(err), started);
      throw err;
    }
  }

  async skip(tool: AgentTool, reason: string): Promise<void> {
    await this.record(tool, {}, "SKIPPED", reason, null, new Date());
  }

  private async record(tool: string, input: Record<string, unknown>, status: "SUCCEEDED" | "FAILED" | "SKIPPED", summary: string, error: string | null, started: Date) {
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
      .set({ status, aiMode: this.aiMode, model: this.model, tokensUsed: this.tokens, toolCalls: this.calls, error: error ?? null, completedAt: new Date() })
      .where(eq(agentRuns.id, this.id));
  }
}
