import { describe, expect, it } from "vitest";
import { Channel3Client, Channel3Error, flattenOffers, Notifier, OpenAIClient, OpenAIError } from "@qm/integrations";

const jsonResponse = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json" } });

describe("Channel3 client", () => {
  it("sends the API key, query, limit and in-stock filter", async () => {
    let seen: { headers: Headers; body: Record<string, unknown> } | null = null;
    const c = new Channel3Client({
      apiKey: "k",
      fetch: async (_u, init) => {
        seen = { headers: new Headers(init?.headers), body: JSON.parse(String(init?.body)) };
        return jsonResponse({ products: [] });
      },
    });
    await c.search({ query: "takeout containers", limit: 50 });
    expect(seen!.headers.get("x-api-key")).toBe("k");
    expect(seen!.body).toMatchObject({ query: "takeout containers", limit: 30, filters: { availability: ["InStock"] } });
  });

  it("drops malformed products and offers", () => {
    const rows = flattenOffers([
      {
        id: "1",
        title: "Good",
        offers: [{ url: "https://a", domain: "a", price: { price: 10, currency: "usd" }, availability: "InStock" }],
      },
      {
        id: "2",
        title: "Bad price",
        offers: [{ url: "https://b", domain: "b", price: { price: -1, currency: "USD" }, availability: "InStock" }],
      },
    ] as never);
    expect(rows).toHaveLength(1);
    expect(rows[0]!.currency).toBe("USD");
  });

  it("raises a typed error on failures", async () => {
    const c = new Channel3Client({ apiKey: "k", fetch: async () => jsonResponse({ detail: "nope" }, 429) });
    await expect(c.search({ query: "x" })).rejects.toBeInstanceOf(Channel3Error);
    await expect(new Channel3Client({ apiKey: null }).search({ query: "x" })).rejects.toBeInstanceOf(Channel3Error);
  });
});

describe("OpenAI structured-output client", () => {
  it("requests strict JSON schema output and tracks tokens", async () => {
    let body: Record<string, unknown> = {};
    const c = new OpenAIClient({
      apiKey: "k",
      model: "test-model",
      fetch: async (_u, init) => {
        body = JSON.parse(String(init?.body));
        return jsonResponse({
          choices: [{ message: { content: '{"ok":true}' }, finish_reason: "stop" }],
          usage: { prompt_tokens: 10, completion_tokens: 5 },
        });
      },
    });
    const r = await c.structured<{ ok: boolean }>({ name: "t", system: "s", user: "u", schema: { type: "object" } });
    expect(r.data.ok).toBe(true);
    expect((body.response_format as { json_schema: { strict: boolean } }).json_schema.strict).toBe(true);
    expect(c.totalTokens).toBe(15);
  });

  it.each([
    ["refusal", { choices: [{ message: { content: null, refusal: "no" } }] }],
    ["truncation", { choices: [{ message: { content: "{" }, finish_reason: "length" }] }],
    ["invalid JSON", { choices: [{ message: { content: "not json" }, finish_reason: "stop" }] }],
    ["empty", { choices: [] }],
  ])("raises on %s", async (_n, payload) => {
    const c = new OpenAIClient({ apiKey: "k", model: "m", fetch: async () => jsonResponse(payload) });
    await expect(c.structured({ name: "t", system: "s", user: "u", schema: {} })).rejects.toBeInstanceOf(OpenAIError);
  });
});

describe("notifier", () => {
  it("is notification-only and never throws", async () => {
    const sent: unknown[] = [];
    const n = new Notifier({
      webhookUrl: "https://hooks.example/x",
      appBaseUrl: "https://app.example",
      fetch: async (_u, init) => {
        sent.push(JSON.parse(String(init?.body)));
        return new Response(null, { status: 500 });
      },
    });
    await expect(
      n.send({ kind: "PAYMENT_COMPLETED", organization_id: "o", title: "t", summary: "s", link_path: "/orders" }),
    ).resolves.toBeUndefined();
    expect(sent[0]).toMatchObject({ link: "https://app.example/orders", notice: expect.stringMatching(/Informational only/) });
    await expect(
      new Notifier({
        webhookUrl: "https://x.example",
        appBaseUrl: "https://a.example",
        fetch: async () => {
          throw new Error("down");
        },
      }).send({ kind: "INVOICE_FLAGGED", organization_id: "o", title: "t", summary: "s" }),
    ).resolves.toBeUndefined();
  });
});
