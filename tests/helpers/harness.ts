import request from "supertest";
import { randomUUID } from "node:crypto";
import { DEMO_CREDENTIALS, jobLeases, paypalWebhookEvents, seedDemo } from "@qm/database";
import { generateSigningKey } from "@qm/trustrail";
import { bootstrap } from "../../apps/api/src/bootstrap";
import { createApp } from "../../apps/api/src/http/app";
import type { AppContext } from "../../apps/api/src/context";
import { FakePayPal } from "./fake-paypal";

export const PASSWORD = "integration-test-password";

export interface Harness {
  ctx: AppContext;
  app: ReturnType<typeof createApp>;
  paypal: FakePayPal;
  clock: { now: Date };
  agent(role?: keyof typeof DEMO_CREDENTIALS): Promise<Client>;
  close(): Promise<void>;
}

export interface Client {
  get(path: string): request.Test;
  post(path: string, body?: unknown, idempotencyKey?: string): request.Test;
  put(path: string, body?: unknown, idempotencyKey?: string): request.Test;
}

/** Boots the real API against in-memory PostgreSQL (PGlite) and a fake PayPal sandbox. */
export async function createHarness(
  opts: { channel3Fetch?: typeof fetch; openaiFetch?: typeof fetch; extraEnv?: Record<string, string> } = {},
): Promise<Harness> {
  const paypal = new FakePayPal();
  const clock = { now: new Date() };
  paypal.clock = clock;
  // A unique key id per harness: on a shared PostgreSQL database every test file registers its own
  // key, and TrustRail refuses to rebind an existing id to a different key.
  const keyId = `itest_${randomUUID().slice(0, 8)}`;
  const key = generateSigningKey(keyId);
  const env: NodeJS.ProcessEnv = {
    NODE_ENV: "test",
    LOG_LEVEL: "silent",
    // HARNESS_DATABASE_URL runs the same suite against a real PostgreSQL server.
    DATABASE_URL: process.env.HARNESS_DATABASE_URL ?? "pglite://memory",
    TRUSTRAIL_SIGNING_KEY: Buffer.from(key.private_key_pem).toString("base64"),
    TRUSTRAIL_SIGNING_KEY_ID: keyId,
    PAYPAL_CLIENT_ID: "fake-client",
    PAYPAL_CLIENT_SECRET: "fake-secret",
    PAYPAL_WEBHOOK_ID: "WH-FAKE",
    PAYPAL_MERCHANT_ID: "FAKEMERCHANT",
    SWEEPER_INTERVAL_SECONDS: "0",
    ...(opts.channel3Fetch ? { CHANNEL3_API_KEY: "fake-channel3" } : {}),
    ...(opts.openaiFetch ? { OPENAI_API_KEY: "fake-openai" } : {}),
    ...opts.extraEnv,
  };
  const ctx = await bootstrap({
    env,
    paypalFetch: paypal.fetch,
    channel3Fetch: opts.channel3Fetch,
    openaiFetch: opts.openaiFetch,
    now: () => clock.now,
  });
  // Tables outside any organisation survive the demo reset; clear them so test files sharing one
  // PostgreSQL database start from the same state as a fresh in-memory one.
  await ctx.db.delete(paypalWebhookEvents);
  await ctx.db.delete(jobLeases);
  await seedDemo(ctx.db, { password: PASSWORD, now: clock.now, reset: true });
  const app = createApp(ctx);

  async function agent(role: keyof typeof DEMO_CREDENTIALS = "owner"): Promise<Client> {
    const a = request.agent(app);
    const res = await a
      .post("/api/v1/auth/login")
      .set("X-Requested-With", "quartermaster")
      .send({ email: DEMO_CREDENTIALS[role].email, password: PASSWORD });
    if (res.status !== 200) throw new Error(`login failed: ${res.status} ${JSON.stringify(res.body)}`);
    const withHeaders = (t: request.Test, key?: string) => {
      t.set("X-Requested-With", "quartermaster");
      if (key !== undefined) t.set("Idempotency-Key", key);
      return t;
    };
    return {
      get: (path) => a.get(`/api/v1${path}`),
      post: (path, body, key = randomUUID()) => withHeaders(a.post(`/api/v1${path}`), key).send(body ?? {}),
      put: (path, body, key = randomUUID()) => withHeaders(a.put(`/api/v1${path}`), key).send(body ?? {}),
    };
  }

  return { ctx, app, paypal, clock, agent, close: () => ctx.database.close() };
}

export const DEMO_INSTRUCTION = "We're expecting a busy weekend. Restock takeaway containers and cooking oil without exceeding $300.";
