import request from "supertest";
import { randomUUID } from "node:crypto";
import { DEMO_CREDENTIALS, jobLeases, paypalWebhookEvents, seedDemo, systemErrors } from "@qm/database";
import { generateSigningKey } from "@qm/trustrail";
import { bootstrap } from "../../apps/api/src/bootstrap";
import { createApp } from "../../apps/api/src/http/app";
import type { AppContext } from "../../apps/api/src/context";
import { FakePayPal } from "./fake-paypal";

export const PASSWORD = "integration-test-password";
/** The harness clock's starting instant (Wednesday 11 March 2026, 10:00 UTC). */
export const HARNESS_EPOCH = "2026-03-11T10:00:00.000Z";

export interface Harness {
  ctx: AppContext;
  app: ReturnType<typeof createApp>;
  paypal: FakePayPal;
  clock: { now: Date };
  agent(role?: keyof typeof DEMO_CREDENTIALS): Promise<Client>;
  /** Signs in any account; throws unless the API answers 200. */
  signIn(email: string, password: string): Promise<Client>;
  /** A signed-out client (cookies are kept, so sign-up and invitation acceptance sign it in). */
  anonymous(): Client;
  close(): Promise<void>;
}

export interface Client {
  get(path: string): request.Test;
  post(path: string, body?: unknown, idempotencyKey?: string): request.Test;
  put(path: string, body?: unknown, idempotencyKey?: string): request.Test;
}

/** Boots the real API against in-memory PostgreSQL (PGlite) and a fake PayPal sandbox. */
export async function createHarness(
  opts: {
    channel3Fetch?: typeof fetch;
    openaiFetch?: typeof fetch;
    /** Email provider, alert webhook and Sentry calls. */
    monitoringFetch?: typeof fetch;
    extraEnv?: Record<string, string>;
  } = {},
): Promise<Harness> {
  const paypal = new FakePayPal();
  // A fixed instant, so no test depends on the day or hour it runs: a Wednesday mid-morning UTC,
  // clear of week, month and DST boundaries. Tests that need time to pass move this clock.
  const clock = { now: new Date(HARNESS_EPOCH) };
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
    monitoringFetch: opts.monitoringFetch,
    now: () => clock.now,
  });
  // Tables outside any organisation survive the demo reset; clear them so test files sharing one
  // PostgreSQL database start from the same state as a fresh in-memory one.
  await ctx.db.delete(paypalWebhookEvents);
  await ctx.db.delete(jobLeases);
  await ctx.db.delete(systemErrors);
  await seedDemo(ctx.db, { password: PASSWORD, now: clock.now, reset: true });
  const app = createApp(ctx);

  function client(a: ReturnType<typeof clockedAgent>): Client {
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

  async function signIn(email: string, password: string): Promise<Client> {
    const a = clockedAgent(app, clock);
    const res = await a.post("/api/v1/auth/login").set("X-Requested-With", "quartermaster").send({ email, password });
    if (res.status !== 200) throw new Error(`login failed: ${res.status} ${JSON.stringify(res.body)}`);
    return client(a);
  }

  const agent = (role: keyof typeof DEMO_CREDENTIALS = "owner") => signIn(DEMO_CREDENTIALS[role].email, PASSWORD);
  const anonymous = () => client(clockedAgent(app, clock));

  return { ctx, app, paypal, clock, agent, signIn, anonymous, close: () => ctx.database.close() };
}

/**
 * A supertest agent whose cookie jar judges cookie expiry by the harness clock. The API sets
 * `Expires` from its injected clock, but the jar compares it with the wall clock, so with a fixed
 * clock a session cookie could look expired (or immortal) to the client. Each `Expires` is moved
 * into the wall-clock frame by the same offset, so a cookie lives exactly as long, measured on the
 * clock the server used. The response the test sees is not changed.
 */
function clockedAgent(app: ReturnType<typeof createApp>, clock: { now: Date }) {
  const a = request.agent(app);
  const internals = a as unknown as { _saveCookies(res: { headers: Record<string, unknown> }): void };
  const save = internals._saveCookies.bind(a);
  internals._saveCookies = (res) => {
    const raw = res.headers["set-cookie"];
    if (!raw) return save(res);
    const cookies = (Array.isArray(raw) ? raw : [raw]).map((c: string) =>
      c.replace(/(;\s*expires=)([^;]+)/i, (whole: string, attr: string, date: string) => {
        const at = Date.parse(date);
        return Number.isNaN(at) ? whole : `${attr}${new Date(Date.now() + (at - clock.now.getTime())).toUTCString()}`;
      }),
    );
    save({ ...res, headers: { ...res.headers, "set-cookie": cookies } });
  };
  return a;
}

export const DEMO_INSTRUCTION = "We're expecting a busy weekend. Restock takeaway containers and cooking oil without exceeding $300.";
