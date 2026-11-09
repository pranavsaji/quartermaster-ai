import { afterAll, beforeAll, describe, expect, it } from "vitest";
import request from "supertest";
import { createHarness, type Harness } from "../helpers/harness";

/** The webhook endpoint must reject junk locally, before any OAuth or verify call to PayPal. */
let h: Harness;
const LIMIT = 10;

beforeAll(async () => {
  h = await createHarness({ extraEnv: { WEBHOOK_RATE_LIMIT_PER_MINUTE: String(LIMIT) } });
});
afterAll(async () => {
  await h.close();
});

const event = JSON.stringify({ id: "WH-GUARD-1", event_type: "CHECKOUT.ORDER.APPROVED", resource: { id: "UNKNOWN-ORDER" } });
const send = (headers: Record<string, string>, body = event) => request(h.app).post("/api/v1/webhooks/paypal").set(headers).set("content-type", "application/json").send(body);
const at = (offsetMs: number) => new Date(h.clock.now.getTime() + offsetMs).toISOString();

describe("PayPal webhook guard", () => {
  it.each([
    ["a transmission time 10 minutes old", () => ({ "paypal-transmission-time": at(-10 * 60_000) }), "WEBHOOK_STALE"],
    ["a transmission time 10 minutes ahead", () => ({ "paypal-transmission-time": at(10 * 60_000) }), "WEBHOOK_STALE"],
    ["an unparseable transmission time", () => ({ "paypal-transmission-time": "yesterday" }), "WEBHOOK_MALFORMED"],
    ["a malformed transmission id", () => ({ "paypal-transmission-id": "../../etc/passwd" }), "WEBHOOK_MALFORMED"],
    ["an oversized transmission id", () => ({ "paypal-transmission-id": "a".repeat(65) }), "WEBHOOK_MALFORMED"],
    ["a missing signature", () => ({ "paypal-transmission-sig": "" }), "WEBHOOK_MALFORMED"],
  ])("rejects %s with 400 and no PayPal call", async (_name, override, code) => {
    const calls = h.paypal.calls.length;
    const res = await send({ ...h.paypal.webhookHeaders(), ...override() });
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe(code);
    expect(h.paypal.calls.length).toBe(calls);
  });

  it("rejects oversized bodies before reading them", async () => {
    const calls = h.paypal.calls.length;
    const res = await send(h.paypal.webhookHeaders(), JSON.stringify({ pad: "x".repeat(70 * 1024) }));
    expect(res.status).toBe(413);
    expect(h.paypal.calls.length).toBe(calls);
  });

  it("lets a well-formed, fresh delivery through to signature verification", async () => {
    const res = await send({ ...h.paypal.webhookHeaders(), "paypal-transmission-time": at(-60_000) });
    expect(res.status).toBe(200);
    expect(h.paypal.calls.some((c) => c.path === "/v1/notifications/verify-webhook-signature")).toBe(true);
  });

  it("rate-limits deliveries with 429 before any PayPal call", async () => {
    let limited: request.Response | null = null;
    for (let i = 0; i <= LIMIT && !limited; i++) {
      const res = await send({ ...h.paypal.webhookHeaders(), "paypal-transmission-time": "garbage" });
      if (res.status === 429) limited = res;
    }
    expect(limited?.body.error.code).toBe("RATE_LIMITED");
    const calls = h.paypal.calls.length;
    expect((await send(h.paypal.webhookHeaders())).status).toBe(429);
    expect(h.paypal.calls.length).toBe(calls);
  });
});
