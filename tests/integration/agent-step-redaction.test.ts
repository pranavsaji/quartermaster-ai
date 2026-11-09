import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from "vitest";
import { randomUUID } from "node:crypto";
import { eq } from "drizzle-orm";
import { toolExecutions } from "@qm/database";
import type { ProcurementRequestDto } from "@qm/contracts";
import { createHarness, type Client, type Harness } from "../helpers/harness";
import { createRequest, relaxMandate, setStock } from "../helpers/flows";

/**
 * Agent steps are visible to every member of the organization, viewers included. Provider and
 * driver error text (which can quote credentials) must never reach them.
 */
const SECRET = `sk-proj-${randomUUID().replace(/-/g, "")}`;
const SECRET_FRAGMENT = SECRET.slice(8, 24);

const json = (body: unknown, status: number) =>
  new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json" } });

let h: Harness;
let owner: Client;
let viewer: Client;

beforeAll(async () => {
  h = await createHarness({
    channel3Fetch: async () => json({ detail: `invalid x-api-key ${SECRET}` }, 401),
    openaiFetch: async () => json({ error: { message: `Incorrect API key provided: ${SECRET}.` } }, 401),
  });
  owner = await h.agent("owner");
  viewer = await h.agent("viewer");
  await relaxMandate(owner);
});
afterEach(() => {
  vi.restoreAllMocks();
});
afterAll(async () => {
  await h.close();
});

function expectNoSecret(body: unknown) {
  const text = JSON.stringify(body);
  expect(text).not.toContain(SECRET);
  expect(text).not.toContain(SECRET_FRAGMENT);
}

describe("agent step redaction", () => {
  it("authors model and market failure summaries from error kinds, not provider text", async () => {
    vi.spyOn(h.ctx.log, "warn").mockImplementation(() => undefined);
    await setStock(owner, "CLN-GLOVES", 5);
    const created = await createRequest(owner, "Restock nitrile gloves");
    const res = await owner.post(`/procurement/requests/${created.id}/research`);
    expect(res.status).toBe(200);
    expectNoSecret(res.body);

    const seen = await viewer.get(`/procurement/requests/${created.id}`);
    expect(seen.status).toBe(200);
    expectNoSecret(seen.body);
    const steps = (seen.body as ProcurementRequestDto).agent_steps;
    const interpret = steps.find((s) => s.tool === "intent.interpret")!;
    expect(interpret.summary).toContain("Model provider returned an error (HTTP 401)");
    const market = steps.find((s) => s.tool === "market.search")!;
    expect(market.summary).toContain("not authorised by Channel3");
  });

  it("never returns a failed tool's raw error message, and keeps a redacted copy internally", async () => {
    await setStock(owner, "CLN-TOWELS", 5);
    const created = await createRequest(owner, "Restock paper towels");
    // The claim transaction succeeds; the first TrustRail evaluation transaction fails with a
    // driver-style message that quotes a credential.
    const real = h.ctx.db.transaction.bind(h.ctx.db);
    let calls = 0;
    vi.spyOn(h.ctx.db, "transaction").mockImplementation((fn: Parameters<typeof real>[0]) => {
      calls++;
      if (calls === 2) return Promise.reject(new Error(`connection failed: password=${SECRET} host=db`));
      return real(fn);
    });
    vi.spyOn(h.ctx.log, "error").mockImplementation(() => undefined);
    vi.spyOn(h.ctx.log, "warn").mockImplementation(() => undefined);
    const res = await owner.post(`/procurement/requests/${created.id}/research`);
    expect(res.status).toBe(500);
    expectNoSecret(res.body);
    vi.restoreAllMocks();

    const seen = await viewer.get(`/procurement/requests/${created.id}`);
    expect(seen.status).toBe(200);
    expectNoSecret(seen.body);
    const failed = (seen.body as ProcurementRequestDto).agent_steps.filter((s) => s.status === "FAILED");
    expect(failed.map((s) => s.summary)).toContain("trustrail.evaluate failed.");

    const rows = await h.ctx.db.select().from(toolExecutions).where(eq(toolExecutions.status, "FAILED"));
    const internal = rows.find((r) => r.tool === "trustrail.evaluate" && r.error?.includes("connection failed"));
    expect(internal, "a redacted internal diagnostic").toBeTruthy();
    expect(internal!.error).not.toContain(SECRET);
  });
});
