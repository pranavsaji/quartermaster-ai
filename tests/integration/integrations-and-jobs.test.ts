import { afterAll, beforeAll, describe, expect, it } from "vitest";
import type { ProcurementRequestDto } from "@qm/contracts";
import { sweep, acquireLease } from "../../apps/api/src/jobs/sweeper";
import { fakeChannel3 } from "../helpers/channel3";
import { createHarness, DEMO_INSTRUCTION, type Client, type Harness } from "../helpers/harness";

const { fetch: channel3Fetch, calls: channel3Calls } = fakeChannel3();

/** OpenAI stub returning strict structured output for interpretation and explanation. */
let openaiCalls = 0;
const openaiFetch: typeof fetch = async (_url, init) => {
  openaiCalls++;
  const body = JSON.parse(String(init?.body)) as { response_format: { json_schema: { name: string } }; messages: { content: string }[] };
  const name = body.response_format.json_schema.name;
  let content: unknown;
  if (name === "procurement_intent") {
    const inventory = JSON.parse(/INVENTORY: (\[.*\])/.exec(body.messages[1]!.content)![1]!) as { id: string; sku: string }[];
    content = {
      inventory_item_ids: inventory
        .filter((i) => ["PKG-TAKEOUT-32", "ING-CANOLA"].includes(i.sku))
        .map((i) => i.id)
        .concat(["not-a-real-id"]),
      demand_multiplier: 1.25,
      budget_limit_minor: 30_000,
      required_by: null,
      notes: "Restock containers and oil for a busy weekend under $300.",
      unsupported_requests: [],
    };
  } else if (name === "recommendation_explanation") {
    content = { summary: "Buy containers from Harbor and oil from Coastal.", rationale: ["Cheapest compliant delivered cost."] };
  } else {
    content = { injection: false, confidence: 0.9, reason: "looks like product copy" };
  }
  return new Response(
    JSON.stringify({
      choices: [{ message: { content: JSON.stringify(content) }, finish_reason: "stop" }],
      usage: { prompt_tokens: 300, completion_tokens: 80 },
    }),
    {
      status: 200,
      headers: { "content-type": "application/json" },
    },
  );
};

let h: Harness;
let owner: Client;

beforeAll(async () => {
  h = await createHarness({ channel3Fetch, openaiFetch });
  owner = await h.agent("owner");
});
afterAll(async () => {
  await h.close();
});

describe("with Channel3 market data and a language model", () => {
  let req: ProcurementRequestDto;

  it("uses the model for interpretation but drops ids it invented", async () => {
    const created = await owner.post("/procurement/requests", { instruction: DEMO_INSTRUCTION });
    expect(created.status).toBe(201);
    expect(created.body.intent.ai_mode).toBe("LLM");
    expect(created.body.intent.demand_multiplier).toBe(1.25);
    expect(created.body.intent.inventory_item_ids).toHaveLength(2);
    req = (await owner.post(`/procurement/requests/${created.body.id}/research`)).body;
    expect(req.status).toBe("READY_FOR_REVIEW");
  });

  it("builds a normalised market reference from comparable listings only", () => {
    const containers = req.market.find((m) => m.quotes.some((q) => /container/i.test(q.title)))!;
    expect(containers.status).toBe("AVAILABLE");
    // 84/300=28, 58/200=29, 77.5/250=31; the unparseable and injected listings are excluded.
    expect(containers.reference_unit_price_minor).toBe(29);
    expect(containers.sample_size).toBe(3);
    expect(containers.quotes.find((q) => q.title === "Takeout boxes, bulk")?.comparable).toBe(false);
    expect(channel3Calls.length).toBe(2);
  });

  it("records suspicious market listings as findings", () => {
    expect(req.security_findings.some((f) => f.source_kind === "market_quote")).toBe(true);
  });

  it("applies the market-price rule: Harbor at 32¢ vs a 29¢ reference needs review", () => {
    const harbor = req.proposals.find((p) => p.supplier_name.startsWith("Harbor") && p.status === "PROPOSED")!;
    const v = harbor.policy_decision!.violations.find((x) => x.code === "MARKET_PRICE_PREMIUM_EXCEEDED");
    expect(v?.severity).toBe("REVIEW");
  });

  it("keeps TrustRail blocks in the model's explanation", () => {
    expect(req.recommendation?.ai_mode).toBe("LLM");
    expect(req.recommendation?.rationale.some((r) => r.includes("TrustRail blocked QuickServe"))).toBe(true);
    expect(openaiCalls).toBeGreaterThanOrEqual(2);
  });

  it("does not let a model 'safe' verdict clear the quarantined listing", () => {
    const qs = req.proposals.find((p) => p.supplier_name.startsWith("QuickServe"))!;
    expect(qs.status).toBe("BLOCKED");
  });
});

describe("concurrent approvals and the weekly budget", () => {
  it("never reserves more than the remaining budget, even under concurrency", async () => {
    // Shrink the weekly budget so each proposal fits on its own but not both together.
    const current = (await owner.get("/mandates/current")).body.mandate;
    const { id, version, status, created_by, created_at, ...rest } = current;
    void id;
    void status;
    void created_by;
    void created_at;
    const put = await owner.put("/mandates/current", {
      ...rest,
      weekly_budget_minor: 25_000,
      per_order_limit_minor: 20_000,
      auto_approval_limit_minor: 10_000,
      expected_version: version,
    });
    expect(put.status).toBe(200);

    const created = await owner.post("/procurement/requests", { instruction: DEMO_INSTRUCTION, budget_limit_minor: 50_000 });
    const r: ProcurementRequestDto = (await owner.post(`/procurement/requests/${created.body.id}/research`)).body;
    const open = r.proposals.filter((p) => p.status === "PROPOSED");
    expect(open.length).toBe(2);
    const results = await Promise.all(
      open.map((p) =>
        owner.post(`/procurement/requests/${r.id}/approve`, {
          purchase_order_id: p.id,
          cart_hash: p.cart_hash,
          acknowledged_review_codes: p.policy_decision!.violations.filter((v) => v.severity === "REVIEW").map((v) => v.code),
        }),
      ),
    );
    const ok = results.filter((x) => x.status === 200);
    const refused = results.filter((x) => x.status !== 200);
    expect(ok.length).toBe(1);
    expect(refused.length).toBe(1);
    expect(["POLICY_BLOCKED", "BUDGET_EXHAUSTED"]).toContain(refused[0]!.body.error.code);
    const budget = (await owner.get("/mandates/current")).body.budget;
    expect(budget.reserved_minor + budget.spent_minor).toBeLessThanOrEqual(budget.limit_minor);
  });
});

describe("background sweeper", () => {
  it("expires unused certificates and releases their reservations", async () => {
    const before = (await owner.get("/mandates/current")).body.budget;
    expect(before.reserved_minor).toBeGreaterThan(0);
    h.clock.now = new Date(h.clock.now.getTime() + 2 * 3_600_000);
    const report = await sweep(h.ctx);
    expect(report.expired).toBeGreaterThanOrEqual(1);
    const after = (await owner.get("/mandates/current")).body.budget;
    expect(after.reserved_minor).toBe(0);
    const audit = (await owner.get("/security/audit?limit=200")).body.items.map((e: { action: string }) => e.action);
    expect(audit).toContain("certificate.expired");
  });

  it("elects a single runner through leases", async () => {
    const t = h.ctx.now();
    expect(await acquireLease(h.ctx.db, "test-job", t, "a")).toBe(true);
    expect(await acquireLease(h.ctx.db, "test-job", t, "b")).toBe(false);
    expect(await acquireLease(h.ctx.db, "test-job", new Date(t.getTime() + 10 * 60_000), "b")).toBe(true);
  });
});
