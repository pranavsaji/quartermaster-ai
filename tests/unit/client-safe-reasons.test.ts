import { describe, expect, it } from "vitest";
import { Channel3Error, OpenAIError, type OpenAIFailure } from "@qm/integrations";
import { fallbackNote } from "../../apps/api/src/services/agent/llm";
import { AgentBudgetExceeded, failedStepSummary } from "../../apps/api/src/services/agent/runtime";
import { marketSearchFailure } from "../../apps/api/src/services/market";
import { conflict } from "../../apps/api/src/errors";

const SECRET = "sk-live-0123456789abcdef";

describe("client-safe failure reasons", () => {
  it.each<[OpenAIFailure, number | null, RegExp]>([
    ["not_configured", null, /No language model configured/],
    ["http", 401, /provider returned an error \(HTTP 401\)/],
    ["http", null, /provider returned an error\.$/],
    ["aborted", null, /deadline/],
    ["network", null, /could not be reached/],
    ["refused", 200, /declined/],
    ["truncated", 200, /unusable/],
    ["empty", 200, /unusable/],
    ["invalid_json", 200, /unusable/],
    ["invalid_output", 200, /unusable/],
    ["invalid_response", 200, /unusable/],
  ])("model fallback note for %s ignores the error message", (kind, status, expected) => {
    const note = fallbackNote(new OpenAIError(`provider said ${SECRET}`, status, kind));
    expect(note).toMatch(expected);
    expect(note).not.toContain(SECRET);
  });

  it("uses a generic model note for unexpected errors", () => {
    expect(fallbackNote(new Error(SECRET))).toBe("Model call failed.");
  });

  it.each<[unknown, RegExp]>([
    [new Channel3Error(SECRET, null), /did not complete/],
    [new Channel3Error(SECRET, 401), /not authorised/],
    [new Channel3Error(SECRET, 403), /not authorised/],
    [new Channel3Error(SECRET, 429), /rate limited/],
    [new Channel3Error(SECRET, 500), /HTTP 500/],
    [new Error(SECRET), /^Market search failed; using cached listings\.$/],
  ])("market search failure reason ignores the error message (%#)", (err, expected) => {
    const reason = marketSearchFailure(err);
    expect(reason).toMatch(expected);
    expect(reason).not.toContain(SECRET);
  });

  it("only surfaces authored AppError text in failed step summaries", () => {
    expect(failedStepSummary("planner.plan", new Error(SECRET))).toBe("planner.plan failed.");
    expect(failedStepSummary("planner.plan", SECRET)).toBe("planner.plan failed.");
    expect(failedStepSummary("planner.plan", conflict("CATALOG_BUSY", "Catalogs are refreshing."))).toBe(
      "planner.plan failed: Catalogs are refreshing.",
    );
  });

  it("maps agent limits to typed, retryable 503s with fixed text", () => {
    const deadline = new AgentBudgetExceeded("deadline");
    expect(deadline).toMatchObject({ status: 503, code: "AGENT_DEADLINE_EXCEEDED", details: { retryable: true }, reason: "deadline" });
    for (const reason of ["tool_calls", "research_calls"] as const) {
      expect(new AgentBudgetExceeded(reason)).toMatchObject({ status: 503, code: "AGENT_BUDGET_EXCEEDED", reason });
    }
    expect(new AgentBudgetExceeded("tool_calls").message).toBe(new AgentBudgetExceeded("research_calls").message);
  });
});
