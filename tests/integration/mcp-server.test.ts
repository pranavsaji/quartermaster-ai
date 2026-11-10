import { afterAll, beforeAll, describe, expect, it } from "vitest";
import type { AddressInfo } from "node:net";
import type { Server } from "node:http";
import { fileURLToPath } from "node:url";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { getDefaultEnvironment, StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";
import { InMemoryTransport } from "@modelcontextprotocol/sdk/inMemory.js";
import { eq } from "drizzle-orm";
import { DEMO_CREDENTIALS, sessions, users } from "@qm/database";
import { ADVERSARIAL_LISTING_TEXT } from "../../packages/database/src/seed";
import { ApiError, QuartermasterClient } from "../../apps/mcp/src/client";
import { ConfigError, loadConfig } from "../../apps/mcp/src/config";
import { createMcpServer } from "../../apps/mcp/src/server";
import { callTool, TOOL_NAMES, type ToolContext } from "../../apps/mcp/src/tools";
import { createHarness, DEMO_INSTRUCTION, PASSWORD, type Harness } from "../helpers/harness";
import { relaxMandate } from "../helpers/flows";

/**
 * The MCP server drives the real API over HTTP (an ephemeral port on the harness app), signed in
 * as the sample MANAGER: an account that can propose but that the API itself refuses to let approve.
 */
let h: Harness;
let http: Server;
let apiUrl: string;
let mcp: Client;
let ctx: ToolContext;

const UNTRUSTED_BLOCK = /<untrusted-([0-9a-f]{16}) source="[^"]*">[\s\S]*?<\/untrusted-\1>/;
const ALL_UNTRUSTED_BLOCKS = new RegExp(UNTRUSTED_BLOCK.source, "g");

/** Every string value in a parsed tool result. */
function strings(value: unknown): string[] {
  if (typeof value === "string") return [value];
  if (Array.isArray(value)) return value.flatMap(strings);
  if (value && typeof value === "object") return Object.values(value).flatMap(strings);
  return [];
}

function managerContext(fetchImpl?: typeof fetch): ToolContext {
  return {
    client: new QuartermasterClient({ apiUrl, email: DEMO_CREDENTIALS.manager.email, password: PASSWORD, fetch: fetchImpl }),
    appUrl: "http://localhost:3000",
  };
}

async function call(name: string, args: Record<string, unknown> = {}) {
  const res = await mcp.callTool({ name, arguments: args });
  const content = res.content as { type: string; text: string }[];
  return { isError: res.isError === true, text: content[0]!.text, body: JSON.parse(content[0]!.text) };
}

beforeAll(async () => {
  h = await createHarness();
  await relaxMandate(await h.agent("owner"));
  http = await new Promise<Server>((resolve) => {
    const s = h.app.listen(0, "127.0.0.1", () => resolve(s));
  });
  apiUrl = `http://127.0.0.1:${(http.address() as AddressInfo).port}`;
  ctx = managerContext();
  const [clientTransport, serverTransport] = InMemoryTransport.createLinkedPair();
  await createMcpServer(ctx).connect(serverTransport);
  mcp = new Client({ name: "mcp-test", version: "1.0.0" });
  await mcp.connect(clientTransport);
});
afterAll(async () => {
  await mcp?.close();
  await new Promise((resolve) => http?.close(resolve));
  await h.close();
});

describe("MCP tool surface", () => {
  it("lists exactly the propose-and-read tools, with no way to approve or pay", async () => {
    const { tools } = await mcp.listTools();
    const names = tools.map((t) => t.name).sort();
    expect(names).toEqual(
      [
        "create_purchase_request",
        "evaluate_request",
        "get_request",
        "get_spend_mandate",
        "list_inventory",
        "list_security_events",
        "list_suppliers",
        "research_request",
      ].sort(),
    );
    expect(names).toEqual([...TOOL_NAMES].sort());
    for (const t of tools) {
      expect(t.name).not.toMatch(/approv|pay|captur|refund|reject|mandate_(update|edit|set)|update|delete|supplier_(add|create)/i);
      expect(t.description).toMatch(/owner reviews and approves/);
      expect(t.description).toMatch(/no approve, pay, capture or refund tool/);
    }
    expect(mcp.getInstructions()).toMatch(/never approve or pay/);
  });

  it("refuses unknown tools such as an approval tool", async () => {
    const res = await mcp.callTool({ name: "approve_purchase", arguments: {} });
    expect(res.isError).toBe(true);
    expect((await callTool(ctx, "approve_purchase")).isError).toBe(true);
  });

  it("reads the mandate from the database, read-only", async () => {
    const { body, isError } = await call("get_spend_mandate");
    expect(isError).toBe(false);
    expect(body.mandate.weekly_budget).toBe("10000.00 USD");
    expect(body.mandate.human_approval_required).toBe(true);
    expect(body.budget.remaining_minor).toBeGreaterThan(0);
    expect(body.note).toMatch(/http:\/\/localhost:3000\/mandate/);
  });

  it("lists inventory and suppliers, fencing supplier-written text", async () => {
    const inventory = await call("list_inventory");
    expect(inventory.body.items.length).toBeGreaterThan(0);
    expect(inventory.body.items[0]).toHaveProperty("reorder_point");

    const suppliers = await call("list_suppliers");
    const names = suppliers.body.suppliers.map((s: { name: string }) => s.name);
    expect(names).toEqual(expect.arrayContaining(["QuickServe Packaging Co.", "PackRight Wholesale"]));
    for (const s of suppliers.body.suppliers as { description: string | null }[]) {
      if (s.description) expect(s.description).toMatch(UNTRUSTED_BLOCK);
    }
  });
});

describe("propose through TrustRail", () => {
  let requestId: string;

  it("creates, researches and evaluates a request; TrustRail quarantines the adversarial supplier", async () => {
    const created = await call("create_purchase_request", { instruction: DEMO_INSTRUCTION });
    expect(created.isError).toBe(false);
    expect(created.body.status).toBe("DRAFT");
    requestId = created.body.request_id;
    expect(created.body.owner_action.view_in_app).toBe(`http://localhost:3000/procurement/${requestId}`);

    const researched = await call("research_request", { request_id: requestId });
    expect(researched.isError).toBe(false);
    const r = researched.body;
    expect(r.status).toBe("READY_FOR_REVIEW");
    expect(r.trustrail.outcome).toBe("ALLOWED_PENDING_OWNER_APPROVAL");
    expect(r.trustrail.allowed_proposals).toBeGreaterThan(0);

    const quickserve = r.proposals.find((p: { supplier: string }) => p.supplier.startsWith("QuickServe"));
    expect(quickserve.status).toBe("BLOCKED");
    expect(quickserve.allowed).toBe(false);
    expect(quickserve.trustrail_decision).toBe("BLOCK");
    expect(quickserve.reasons.map((v: { code: string }) => v.code)).toEqual(
      expect.arrayContaining(["QUARANTINED_SOURCE", "UNAUTHORIZED_LINE_ITEM"]),
    );
    expect(r.quarantined_sources.some((s: { supplier?: string }) => s.supplier?.startsWith("QuickServe"))).toBe(true);
    expect(r.security_findings.map((f: { type: string }) => f.type)).toEqual(expect.arrayContaining(["PROMPT_INJECTION"]));

    const harbor = r.proposals.find((p: { supplier: string }) => p.supplier.startsWith("Harbor"));
    expect(harbor.allowed).toBe(true);
    expect(harbor.total).toBe("173.20 USD");
    expect(r.owner_action.approve_in_app).toBe(`http://localhost:3000/procurement/${requestId}`);
    expect(r.owner_action.note).toMatch(/owner reviews and approves/);

    const evaluated = await call("evaluate_request", { request_id: requestId });
    expect(evaluated.isError).toBe(false);
    expect(evaluated.body.trustrail.outcome).toBe("ALLOWED_PENDING_OWNER_APPROVAL");
    const again = evaluated.body.proposals.find((p: { supplier: string }) => p.supplier.startsWith("QuickServe"));
    expect(again.allowed).toBe(false);

    const fetched = await call("get_request", { request_id: requestId });
    expect(fetched.body.request_id).toBe(requestId);
    expect(fetched.body.proposals.map((p: { purchase_order_id: string }) => p.purchase_order_id).sort()).toEqual(
      evaluated.body.proposals.map((p: { purchase_order_id: string }) => p.purchase_order_id).sort(),
    );
  });

  it("returns supplier- and model-derived text only inside untrusted fences", async () => {
    const { body } = await call("get_request", { request_id: requestId });
    const values = strings(body);
    // The listing's charge reaches the model only as fenced, quoted data.
    expect(values.some((s) => /service charge/i.test(s) && UNTRUSTED_BLOCK.test(s))).toBe(true);
    const outside = values.map((s) => s.replace(ALL_UNTRUSTED_BLOCKS, "")).join("\n");
    expect(outside).not.toMatch(/ignore your previous|NOTE TO AI|service charge|skip the approval/i);
    expect(ADVERSARIAL_LISTING_TEXT).toMatch(/NOTE TO AI/);
    expect(values.join("\n")).not.toContain(ADVERSARIAL_LISTING_TEXT);
  });

  it("shows the injection in the security events", async () => {
    const { body } = await call("list_security_events", { type: "PROMPT_INJECTION", limit: 5 });
    expect(body.events.length).toBeGreaterThan(0);
    for (const e of body.events as { type: string; description: string | null; title: string | null }[]) {
      expect(e.type).toBe("PROMPT_INJECTION");
      if (e.description) expect(e.description).toMatch(UNTRUSTED_BLOCK);
    }
  });

  it("leaves the proposals unapproved: the agent's account cannot approve even through the API", async () => {
    const { body } = await call("get_request", { request_id: requestId });
    expect(body.proposals.every((p: { status: string }) => p.status === "PROPOSED" || p.status === "BLOCKED")).toBe(true);
    const harbor = body.proposals.find((p: { supplier: string }) => p.supplier.startsWith("Harbor"));
    const err = await ctx.client
      .post(
        `/procurement/requests/${requestId}/approve`,
        {
          purchase_order_id: harbor.purchase_order_id,
          cart_hash: harbor.cart_hash,
          acknowledged_review_codes: harbor.owner_must_acknowledge,
        },
        { idempotencyKey: "mcp-test-approve-attempt" },
      )
      .catch((e: unknown) => e);
    expect(err).toBeInstanceOf(ApiError);
    expect((err as ApiError).status).toBe(403);
  });
});

describe("sessions and errors", () => {
  it("signs in again once when the session is revoked", async () => {
    const logins: string[] = [];
    const counted = managerContext(async (input, init) => {
      if (String(input).endsWith("/auth/login")) logins.push(String(init?.method));
      return fetch(input, init);
    });
    const first = await callTool(counted, "get_spend_mandate");
    expect(first.isError, first.content[0]!.text).toBeFalsy();
    expect((await callTool(counted, "list_suppliers")).isError).toBeFalsy();
    expect(logins).toHaveLength(1);

    const [manager] = await h.ctx.db.select().from(users).where(eq(users.email, DEMO_CREDENTIALS.manager.email));
    await h.ctx.db.delete(sessions).where(eq(sessions.userId, manager!.id));
    const res = await callTool(counted, "get_spend_mandate");
    expect(res.isError).toBeFalsy();
    expect(JSON.parse(res.content[0]!.text).mandate.version).toBeGreaterThan(0);
    expect(logins).toHaveLength(2);
  });

  it("reports bad credentials with fixed text and never echoes the password", async () => {
    const bad: ToolContext = {
      client: new QuartermasterClient({ apiUrl, email: DEMO_CREDENTIALS.manager.email, password: "wrong-password-123" }),
      appUrl: null,
    };
    const res = await callTool(bad, "list_inventory");
    expect(res.isError).toBe(true);
    const body = JSON.parse(res.content[0]!.text);
    expect(body.error.code).toBe("SIGN_IN_FAILED");
    expect(res.content[0]!.text).not.toContain("wrong-password-123");
  });

  it("maps unreachable APIs, missing requests and invalid arguments to fixed errors", async () => {
    const down: ToolContext = {
      client: new QuartermasterClient({ apiUrl: "http://127.0.0.1:1", email: "a@b.c", password: "x", timeoutMs: 2_000 }),
      appUrl: null,
    };
    const unreachable = JSON.parse((await callTool(down, "get_spend_mandate")).content[0]!.text);
    expect(unreachable.error.code).toBe("API_UNREACHABLE");

    const missing = await call("get_request", { request_id: "00000000-0000-4000-8000-000000000000" });
    expect(missing.isError).toBe(true);
    expect(missing.body.error.code).toMatch(/NOT_FOUND/);
    expect(missing.text).not.toMatch(/at .*\.ts:\d+/);

    const invalid = await callTool(ctx, "get_request", { request_id: "not-a-uuid" });
    expect(invalid.isError).toBe(true);
    expect(JSON.parse(invalid.content[0]!.text).error.code).toBe("INVALID_ARGUMENTS");
  });

  it("validates configuration without echoing secrets", () => {
    expect(() => loadConfig({})).toThrow(ConfigError);
    expect(() => loadConfig({ QM_API_URL: "http://api.example.com", QM_EMAIL: "a@b.c", QM_PASSWORD: "s3cret" })).toThrow(/https/);
    const ok = loadConfig({ QM_API_URL: "http://localhost:4000/api/v1/", QM_EMAIL: " a@b.c ", QM_PASSWORD: "s3cret" });
    expect(ok).toMatchObject({ apiUrl: "http://localhost:4000", email: "a@b.c", appUrl: null });
    const err: unknown = (() => {
      try {
        return loadConfig({ QM_API_URL: "nope", QM_EMAIL: "a@b.c", QM_PASSWORD: "s3cret" });
      } catch (e) {
        return e;
      }
    })();
    expect(err).toBeInstanceOf(ConfigError);
    expect(String(err)).not.toContain("s3cret");
  });
});

describe("stdio entry point", () => {
  it("serves the same tools over stdio to a spawned client", async () => {
    const transport = new StdioClientTransport({
      command: process.execPath,
      args: ["--import", "tsx", fileURLToPath(new URL("../../apps/mcp/src/index.ts", import.meta.url))],
      cwd: fileURLToPath(new URL("../..", import.meta.url)),
      env: { ...getDefaultEnvironment(), QM_API_URL: apiUrl, QM_EMAIL: DEMO_CREDENTIALS.manager.email, QM_PASSWORD: PASSWORD },
      stderr: "pipe",
    });
    const client = new Client({ name: "mcp-stdio-test", version: "1.0.0" });
    try {
      await client.connect(transport);
      expect((await client.listTools()).tools.map((t) => t.name).sort()).toEqual([...TOOL_NAMES].sort());
      const res = await client.callTool({ name: "get_spend_mandate", arguments: {} });
      expect(res.isError).toBeFalsy();
      const body = JSON.parse((res.content as { text: string }[])[0]!.text);
      expect(body.mandate.human_approval_required).toBe(true);
    } finally {
      await client.close();
    }
  });
});
