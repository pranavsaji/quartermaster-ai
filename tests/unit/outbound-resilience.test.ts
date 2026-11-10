import { describe, expect, it } from "vitest";
import { Channel3Client, Channel3Error, CircuitBreaker, Mailer, Notifier, OpenAIClient, OpenAIError } from "@qm/integrations";
import { PayPalApiError, PayPalClient, isIdempotent, isRetryableStatus } from "@qm/payments";
import { fallbackNote } from "../../apps/api/src/services/agent/llm";
import { marketSearchFailure } from "../../apps/api/src/services/market";

/**
 * Outbound resilience: the provider circuit breaker (OpenAI, Channel3), the single jittered retry
 * of idempotent PayPal calls, and notifier failure reporting / the email channel.
 */

const json = (status: number, body: unknown) =>
  new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json" } });

describe("CircuitBreaker", () => {
  it("opens after the threshold of consecutive failures, half-opens after the cooldown, and closes on success", () => {
    let t = 0;
    const changes: string[] = [];
    const b = new CircuitBreaker({ threshold: 3, cooldownMs: 1000, now: () => t, onChange: (s) => changes.push(s) });
    b.failure();
    b.failure();
    b.success(); // a success resets the count
    b.failure();
    b.failure();
    expect(b.state).toBe("closed");
    b.failure();
    expect(b.state).toBe("open");
    expect(b.allow()).toBe(false);
    t = 999;
    expect(b.allow()).toBe(false);
    t = 1000;
    expect(b.state).toBe("half_open");
    expect(b.allow()).toBe(true); // one trial call
    expect(b.allow()).toBe(false); // and only one
    b.failure(); // the trial failed: open for another cooldown
    expect(b.state).toBe("open");
    t = 2000;
    expect(b.allow()).toBe(true);
    b.success();
    expect(b.state).toBe("closed");
    expect(changes).toEqual(["open", "open", "closed"]);
  });

  it("releases the half-open trial slot on a neutral outcome, and can be disabled", () => {
    let t = 0;
    const b = new CircuitBreaker({ threshold: 1, cooldownMs: 10, now: () => t });
    b.failure();
    t = 10;
    expect(b.allow()).toBe(true);
    b.neutral();
    expect(b.allow()).toBe(true);
    const off = new CircuitBreaker({ threshold: 0, cooldownMs: 10 });
    for (let i = 0; i < 10; i++) off.failure();
    expect(off.allow()).toBe(true);
    expect(off.state).toBe("closed");
  });

  it("never lets a throwing observer break the call path", () => {
    const b = new CircuitBreaker({
      threshold: 1,
      cooldownMs: 10,
      onChange: () => {
        throw new Error("observer");
      },
    });
    expect(() => b.failure()).not.toThrow();
  });
});

describe("OpenAI circuit breaker", () => {
  const call = (c: OpenAIClient, signal?: AbortSignal) => c.structured({ name: "t", system: "s", user: "u", schema: {}, signal });

  it("skips the provider after three provider failures, then lets one trial through after the cooldown", async () => {
    let t = 0;
    let calls = 0;
    let status = 503;
    const logs: string[] = [];
    const c = new OpenAIClient({
      apiKey: "k",
      model: "m",
      now: () => t,
      breakerCooldownMs: 120_000,
      log: (event) => logs.push(event),
      fetch: async () => {
        calls++;
        return status === 200
          ? json(200, { choices: [{ message: { content: "{}" }, finish_reason: "stop" }], usage: {} })
          : json(status, { error: { message: "overloaded" } });
      },
    });
    for (let i = 0; i < 3; i++) await expect(call(c)).rejects.toMatchObject({ kind: "http", status: 503 });
    expect(c.circuitState).toBe("open");
    expect(logs).toContain("openai.circuit_open");
    // Open: rejected at once, without a request, with a kind callers map to their fallback.
    const skipped = await call(c).catch((e: unknown) => e);
    expect(skipped).toBeInstanceOf(OpenAIError);
    expect(skipped).toMatchObject({ kind: "unavailable", status: null });
    expect(fallbackNote(skipped)).toBe("Model provider is paused after repeated failures; using deterministic rules.");
    expect(calls).toBe(3);

    t = 120_000;
    status = 200;
    await expect(call(c)).resolves.toMatchObject({ data: {} });
    expect(calls).toBe(4);
    expect(c.circuitState).toBe("closed");
    expect(logs).toContain("openai.circuit_closed");
  });

  it("does not count caller aborts, client errors or unusable model output as provider failures", async () => {
    let respond: () => Response = () => json(400, { error: { message: "bad request" } });
    const c = new OpenAIClient({ apiKey: "k", model: "m", breakerThreshold: 1, fetch: async () => respond() });
    await expect(call(c)).rejects.toMatchObject({ kind: "http", status: 400 });
    respond = () => json(200, { choices: [{ message: { content: "not json" }, finish_reason: "stop" }] });
    await expect(call(c)).rejects.toMatchObject({ kind: "invalid_json" });
    const aborted = new AbortController();
    aborted.abort();
    await expect(call(c, aborted.signal)).rejects.toMatchObject({ kind: "aborted" });
    expect(c.circuitState).toBe("closed");
    // A network failure does count.
    respond = () => {
      throw new TypeError("fetch failed");
    };
    await expect(call(c)).rejects.toMatchObject({ kind: "network" });
    expect(c.circuitState).toBe("open");
  });

  it("is bypassed when OpenAI is not configured", async () => {
    const c = new OpenAIClient({ apiKey: null, model: "m", breakerThreshold: 1 });
    for (let i = 0; i < 3; i++) await expect(call(c)).rejects.toMatchObject({ kind: "not_configured" });
    expect(c.circuitState).toBe("closed");
  });
});

describe("Channel3 circuit breaker", () => {
  it("opens on 5xx/429/network failures and reports a client-safe reason while open", async () => {
    let t = 0;
    let calls = 0;
    let respond: () => Response = () => json(502, {});
    const c = new Channel3Client({
      apiKey: "k",
      now: () => t,
      fetch: async () => {
        calls++;
        return respond();
      },
    });
    await expect(c.search({ query: "gloves" })).rejects.toMatchObject({ status: 502 });
    respond = () => json(429, {});
    await expect(c.search({ query: "gloves" })).rejects.toMatchObject({ status: 429 });
    respond = () => {
      throw new TypeError("fetch failed");
    };
    await expect(c.search({ query: "gloves" })).rejects.toMatchObject({ status: null });
    expect(c.circuitState).toBe("open");

    const skipped = await c.search({ query: "gloves" }).catch((e: unknown) => e);
    expect(skipped).toBeInstanceOf(Channel3Error);
    expect(skipped).toMatchObject({ circuitOpen: true, status: null });
    expect(marketSearchFailure(skipped)).toBe("Market search is paused after repeated Channel3 failures; using cached listings.");
    expect(calls).toBe(3);

    t = 120_000;
    respond = () => json(200, { products: [] });
    await expect(c.search({ query: "gloves" })).resolves.toEqual({ products: [], next_page_token: null });
    expect(c.circuitState).toBe("closed");
  });

  it("treats a 4xx answer as a reachable provider", async () => {
    const c = new Channel3Client({ apiKey: "k", breakerThreshold: 1, fetch: async () => json(401, {}) });
    await expect(c.search({ query: "x" })).rejects.toMatchObject({ status: 401 });
    await expect(c.search({ query: "x" })).rejects.toMatchObject({ status: 401, circuitOpen: false });
    expect(c.circuitState).toBe("closed");
  });
});

describe("PayPal retries", () => {
  type Call = { method: string; path: string; requestId: string | null };
  function paypal(plan: Record<string, number[]>) {
    const calls: Call[] = [];
    const logs: { event: string; data: Record<string, unknown> }[] = [];
    const c = new PayPalClient({
      clientId: "id",
      clientSecret: "secret",
      environment: "sandbox",
      webhookId: "WH",
      retryDelayMs: 0,
      log: (event, data) => logs.push({ event, data }),
      fetch: async (input, init) => {
        const url = new URL(String(input));
        const method = (init?.method ?? "GET").toUpperCase();
        if (url.pathname === "/v1/oauth2/token") return json(200, { access_token: "t", expires_in: 3600, token_type: "Bearer" });
        calls.push({ method, path: url.pathname, requestId: new Headers(init?.headers).get("PayPal-Request-Id") });
        const key = `${method} ${url.pathname}`;
        const next = plan[key]?.shift() ?? 200;
        if (next !== 200) return json(next, { name: "INTERNAL_SERVER_ERROR", details: [{ issue: "INTERNAL_SERVER_ERROR" }] });
        if (url.pathname.endsWith("verify-webhook-signature")) return json(200, { verification_status: "SUCCESS" });
        return json(200, { id: "ORDER1", status: "COMPLETED" });
      },
    });
    return { c, calls, logs };
  }

  it("classifies retryable statuses and idempotent calls", () => {
    expect([429, 500, 503].map(isRetryableStatus)).toEqual([true, true, true]);
    expect([400, 401, 404, 422].map(isRetryableStatus)).toEqual([false, false, false, false]);
    expect(isIdempotent("GET", {})).toBe(true);
    expect(isIdempotent("POST", { "PayPal-Request-Id": "r" })).toBe(true);
    expect(isIdempotent("POST", {})).toBe(false);
  });

  it("retries a read once after a 5xx and succeeds", async () => {
    const { c, calls, logs } = paypal({ "GET /v2/checkout/orders/ORDER1": [503] });
    await expect(c.getOrder("ORDER1")).resolves.toMatchObject({ id: "ORDER1" });
    expect(calls).toHaveLength(2);
    expect(logs.find((l) => l.event === "paypal.retry")?.data).toMatchObject({ operation: "orders.get", status: 503 });
  });

  it("retries a capture once, with the same PayPal-Request-Id, after a 429", async () => {
    const { c, calls } = paypal({ "POST /v2/checkout/orders/ORDER1/capture": [429] });
    await expect(c.captureOrder("ORDER1", "capture-req-1")).resolves.toMatchObject({ id: "ORDER1" });
    expect(calls.map((x) => x.requestId)).toEqual(["capture-req-1", "capture-req-1"]);
  });

  it("retries only once: a second 5xx is returned to the caller", async () => {
    const { c, calls } = paypal({ "GET /v2/payments/captures/CAP1": [500, 502] });
    await expect(c.getCapture("CAP1")).rejects.toBeInstanceOf(PayPalApiError);
    expect(calls).toHaveLength(2);
  });

  it("never retries a POST without a PayPal-Request-Id, or a 4xx", async () => {
    const webhook = paypal({ "POST /v1/notifications/verify-webhook-signature": [503] });
    const headers = {
      "paypal-auth-algo": "SHA256withRSA",
      "paypal-cert-url": "https://api-m.sandbox.paypal.com/cert.pem",
      "paypal-transmission-id": "t",
      "paypal-transmission-sig": "s",
      "paypal-transmission-time": "2026-11-10T00:00:00Z",
    };
    await expect(webhook.c.verifyWebhook(headers, { id: "WH-1", event_type: "X", resource: {} })).rejects.toBeInstanceOf(PayPalApiError);
    expect(webhook.calls).toHaveLength(1);

    const declined = paypal({ "POST /v2/checkout/orders/ORDER1/capture": [422] });
    await expect(declined.c.captureOrder("ORDER1", "r")).rejects.toBeInstanceOf(PayPalApiError);
    expect(declined.calls).toHaveLength(1);
  });
});

describe("notifier failures and the email channel", () => {
  const note = {
    kind: "PAYMENT_COMPLETED" as const,
    organization_id: "org-1",
    title: "Paid",
    summary: "PO-1 was paid.",
    link_path: "/orders",
  };

  function mailer(ok: boolean) {
    const sent: { to: string; subject: string; html: string | null; kind: string }[] = [];
    const m = new Mailer({
      resendApiKey: "re_test",
      webhookUrl: null,
      from: "QM <n@example.org>",
      fetch: async (_u, init) => {
        const body = JSON.parse(String(init?.body)) as { to: string[]; subject: string; html?: string };
        sent.push({ to: body.to[0]!, subject: body.subject, html: body.html ?? null, kind: "notification" });
        return new Response(null, { status: ok ? 200 : 403 });
      },
    });
    return { m, sent };
  }

  it("reports a failed Zapier delivery once, with no content or recipients", async () => {
    const failures: unknown[] = [];
    const n = new Notifier({
      webhookUrl: "https://hooks.example/x",
      appBaseUrl: "https://app.example",
      fetch: async () => new Response(null, { status: 410 }),
      onFailure: (f) => failures.push(f),
    });
    await n.send(note);
    expect(failures).toEqual([{ channel: "zapier", kind: "PAYMENT_COMPLETED", status: 410, reason: "http" }]);
  });

  it("emails the organisation's owners when the channel is email, and skips Zapier", async () => {
    const { m, sent } = mailer(true);
    let hooked = 0;
    const n = new Notifier({
      webhookUrl: "https://hooks.example/x",
      appBaseUrl: "https://app.example",
      channel: "email",
      mailer: m,
      recipients: async (org) => (org === "org-1" ? ["a@shop.example.org", "b@shop.example.org"] : []),
      fetch: async () => {
        hooked++;
        return new Response(null, { status: 200 });
      },
    });
    expect(n.emailEnabled).toBe(true);
    expect(n.zapierEnabled).toBe(false);
    await n.send(note);
    expect(hooked).toBe(0);
    expect(sent.map((s) => s.to)).toEqual(["a@shop.example.org", "b@shop.example.org"]);
    expect(sent[0]).toMatchObject({ subject: "Paid" });
    expect(sent[0]!.html).toContain("https://app.example/orders");
  });

  it("sends on both channels, and reports an email failure once per notification", async () => {
    const { m } = mailer(false);
    let hooked = 0;
    const failures: unknown[] = [];
    const n = new Notifier({
      webhookUrl: "https://hooks.example/x",
      appBaseUrl: "https://app.example",
      channel: "both",
      mailer: m,
      recipients: async () => ["a@shop.example.org", "b@shop.example.org"],
      fetch: async () => {
        hooked++;
        return new Response(null, { status: 200 });
      },
      onFailure: (f) => failures.push(f),
    });
    await n.send(note);
    expect(hooked).toBe(1);
    expect(failures).toEqual([{ channel: "email", kind: "PAYMENT_COMPLETED", reason: "send_failed" }]);
  });

  it("never throws: a failing recipient lookup or failure observer is contained", async () => {
    const { m } = mailer(true);
    const n = new Notifier({
      webhookUrl: null,
      appBaseUrl: "https://app.example",
      channel: "email",
      mailer: m,
      recipients: async () => {
        throw new Error("db down");
      },
      onFailure: () => {
        throw new Error("observer down");
      },
    });
    await expect(n.send(note)).resolves.toBeUndefined();
    const rejecting = new Notifier({
      webhookUrl: "https://hooks.example/x",
      appBaseUrl: "https://app.example",
      fetch: async () => {
        throw new TypeError("fetch failed");
      },
      onFailure: () => Promise.reject(new Error("tracker down")),
    });
    await expect(rejecting.send(note)).resolves.toBeUndefined();
  });

  it("is disabled for email without a mailer provider, and defaults to the Zapier channel", () => {
    const none = new Mailer({ resendApiKey: null, webhookUrl: null, from: "x <x@example.org>" });
    const n = new Notifier({
      webhookUrl: null,
      appBaseUrl: "https://a.example",
      channel: "both",
      mailer: none,
      recipients: async () => [],
    });
    expect(n.enabled).toBe(false);
    expect(new Notifier({ webhookUrl: "https://hooks.example/x", appBaseUrl: "https://a.example" }).zapierEnabled).toBe(true);
  });
});
