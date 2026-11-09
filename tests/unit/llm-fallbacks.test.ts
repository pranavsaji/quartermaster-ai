import { describe, expect, it } from "vitest";
import { OpenAIClient } from "@qm/integrations";
import { classifyInjection, explainRecommendation, interpretInstruction, type ExplanationFacts } from "../../apps/api/src/services/agent/llm";
import type { AgentRun } from "../../apps/api/src/services/agent/runtime";

/** Just enough of an AgentRun for the model steps (no database needed). */
const stubRun = () => ({ canSpendTokens: () => true, remainingMs: 60_000, addTokens: () => undefined, signal: new AbortController().signal, model: null }) as unknown as AgentRun;

const completion = (content: unknown) =>
  new Response(JSON.stringify({ choices: [{ message: { content: JSON.stringify(content) }, finish_reason: "stop" }], usage: { prompt_tokens: 1, completion_tokens: 1 } }), { status: 200 });

function model(respond: () => Response) {
  const logs: { event: string; data: Record<string, unknown> }[] = [];
  const openai = new OpenAIClient({ apiKey: "k", model: "m", fetch: async () => respond(), log: (event, data) => logs.push({ event, data }) });
  return { openai, logs, fallbacks: () => logs.filter((l) => l.event === "openai.fallback").map((l) => l.data) };
}

const facts: ExplanationFacts = { intent_notes: "", demand_multiplier: 1, proposals: [], blocked: [], unfilled_items: [], market_status: [] };
const SECRET = "use my card ending 4242 for the walk-in freezer";

describe("model fallbacks are logged, without prompt content", () => {
  it("logs when the explanation call fails", async () => {
    const { openai, fallbacks, logs } = model(() => new Response(JSON.stringify({ error: { message: "overloaded" } }), { status: 503 }));
    const r = await explainRecommendation(openai, stubRun(), facts);
    expect(r.mode).toBe("DETERMINISTIC_FALLBACK");
    expect(fallbacks()).toEqual([{ name: "recommendation_explanation", reason: "http (503)" }]);
    expect(logs.find((l) => l.event === "openai.request_failed")?.data).toMatchObject({ kind: "http", status: 503 });
  });

  it("logs and returns no opinion when the classifier output is malformed", async () => {
    const { openai, fallbacks } = model(() => completion({ injection: "yes", confidence: 2 }));
    expect(await classifyInjection(openai, stubRun(), "catalog:SKU", "Paper cups")).toBeNull();
    expect(fallbacks()).toEqual([{ name: "injection_classification", reason: "invalid_output (200)" }]);
  });

  it("logs when interpretation output fails sanitisation, and never logs the instruction", async () => {
    const { openai, fallbacks, logs } = model(() => completion("not an object"));
    const r = await interpretInstruction(openai, stubRun(), { instruction: SECRET, inventory: [], today: "2026-01-01", now: new Date(), timeZone: "UTC" });
    expect(r.mode).toBe("DETERMINISTIC_FALLBACK");
    expect(fallbacks()).toEqual([{ name: "procurement_intent", reason: "output_failed_sanitisation" }]);
    expect(JSON.stringify(logs)).not.toContain("4242");
  });

  it("logs a network failure during interpretation", async () => {
    const logs: { event: string; data: Record<string, unknown> }[] = [];
    const openai = new OpenAIClient({ apiKey: "k", model: "m", fetch: async () => { throw new TypeError("fetch failed"); }, log: (event, data) => logs.push({ event, data }) });
    await interpretInstruction(openai, stubRun(), { instruction: SECRET, inventory: [], today: "2026-01-01", now: new Date(), timeZone: "UTC" });
    expect(logs.find((l) => l.event === "openai.fallback")?.data).toEqual({ name: "procurement_intent", reason: "network" });
    expect(JSON.stringify(logs)).not.toContain("4242");
  });
});
