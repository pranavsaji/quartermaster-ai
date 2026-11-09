import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from "vitest";
import { eq } from "drizzle-orm";
import request from "supertest";
import { sessions, users } from "@qm/database";
import { createHarness, PASSWORD, type Client, type Harness } from "../helpers/harness";

/**
 * The HTTP surface outside individual features: probes, CORS, CSRF, body limits, error mapping,
 * sessions, and a deployment without PayPal or synthetic delivery actions.
 */
const ALLOWED_ORIGIN = "https://app.example.test";
let h: Harness;
let owner: Client;

beforeAll(async () => {
  h = await createHarness({
    // A key is configured, so the model is reported as enabled; this file never calls it.
    openaiFetch: async () => new Response("{}", { status: 503 }),
    extraEnv: {
      CORS_ORIGINS: `${ALLOWED_ORIGIN}, https://other.example.test`,
      ALLOW_SYNTHETIC_DELIVERY_ACTIONS: "false",
      PAYPAL_CLIENT_ID: "",
      PAYPAL_CLIENT_SECRET: "",
    },
  });
  owner = await h.agent("owner");
});
afterEach(() => {
  vi.restoreAllMocks();
});
afterAll(async () => {
  await h.close();
});

const api = () => request(h.app);

describe("probes", () => {
  it("answers liveness without touching the database", async () => {
    const ping = vi.spyOn(h.ctx.database, "ping");
    const res = await api().get("/healthz");
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ status: "ok" });
    expect(ping).not.toHaveBeenCalled();
  });

  it("reports readiness with the configured integrations", async () => {
    const res = await api().get("/readyz");
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ status: "ready", database: h.ctx.database.driver, paypal: false, channel3: false, ai: true });
  });

  it("reports 503 without details when the database is unreachable", async () => {
    vi.spyOn(h.ctx.database, "ping").mockRejectedValue(new Error("connect ECONNREFUSED 10.0.0.5:5432"));
    const res = await api().get("/readyz");
    expect(res.status).toBe(503);
    expect(res.body).toEqual({ status: "unavailable" });
  });
});

describe("routing and request hygiene", () => {
  it("answers unknown routes with a JSON 404 and a correlation id", async () => {
    const res = await api().get("/nope");
    expect(res.status).toBe(404);
    expect(res.body.error.code).toBe("NOT_FOUND");
    expect(res.body.error.correlation_id).toBe(res.headers["x-correlation-id"]);
    // Inside the API, authentication comes first; once signed in an unknown path is a 404.
    expect((await api().get("/api/v1/nope")).status).toBe(401);
    expect((await owner.get("/nope")).status).toBe(404);
  });

  it("echoes a well-formed correlation id and replaces a malformed one", async () => {
    const good = await api().get("/healthz").set("X-Correlation-Id", "trace-1234.abc");
    expect(good.headers["x-correlation-id"]).toBe("trace-1234.abc");
    const bad = await api().get("/healthz").set("X-Correlation-Id", "<script>");
    expect(bad.headers["x-correlation-id"]).not.toBe("<script>");
    expect(bad.headers["x-correlation-id"]).toMatch(/^[0-9a-f-]{36}$/);
  });

  it("refuses mutations without the CSRF header or with a non-JSON body", async () => {
    const noHeader = await api().post("/api/v1/auth/login").send({ email: "owner@demo.quartermaster.dev", password: PASSWORD });
    expect(noHeader.status).toBe(403);
    expect(noHeader.body.error.code).toBe("CSRF_HEADER_MISSING");
    const form = await api()
      .post("/api/v1/auth/login")
      .set("X-Requested-With", "quartermaster")
      .type("form")
      .send("email=owner%40demo.quartermaster.dev&password=x");
    expect(form.status).toBe(415);
    expect(form.body.error.code).toBe("UNSUPPORTED_MEDIA_TYPE");
  });

  it("maps malformed and oversized JSON bodies to client errors", async () => {
    const malformed = await api()
      .post("/api/v1/auth/login")
      .set("X-Requested-With", "quartermaster")
      .set("content-type", "application/json")
      .send('{"email": ');
    expect(malformed.status).toBe(400);
    expect(malformed.body.error.code).toBe("MALFORMED_JSON");
    const huge = await api()
      .post("/api/v1/auth/login")
      .set("X-Requested-With", "quartermaster")
      .send({ email: "owner@demo.quartermaster.dev", password: "x".repeat(150_000) });
    expect(huge.status).toBe(413);
    expect(huge.body.error.code).toBe("PAYLOAD_TOO_LARGE");
  });

  it("marks authenticated responses as not cacheable", async () => {
    const res = await owner.get("/auth/me");
    expect(res.status).toBe(200);
    expect((await owner.get("/inventory")).headers["cache-control"]).toBe("no-store");
  });
});

describe("CORS", () => {
  it("allows configured origins with credentials and answers their preflight", async () => {
    const res = await api().get("/healthz").set("Origin", ALLOWED_ORIGIN);
    expect(res.headers["access-control-allow-origin"]).toBe(ALLOWED_ORIGIN);
    expect(res.headers["access-control-allow-credentials"]).toBe("true");
    expect(res.headers.vary).toMatch(/Origin/);

    const preflight = await api().options("/api/v1/procurement/requests").set("Origin", "https://other.example.test");
    expect(preflight.status).toBe(204);
    expect(preflight.headers["access-control-allow-methods"]).toBe("GET,POST,PUT");
    expect(preflight.headers["access-control-allow-headers"]).toContain("Idempotency-Key");
  });

  it("stays closed to other origins", async () => {
    const res = await api().get("/healthz").set("Origin", "https://evil.example.test");
    expect(res.headers["access-control-allow-origin"]).toBeUndefined();
    const preflight = await api().options("/api/v1/procurement/requests").set("Origin", "https://evil.example.test");
    expect(preflight.status).not.toBe(204);
    expect(preflight.headers["access-control-allow-origin"]).toBeUndefined();
  });
});

describe("server errors", () => {
  it("returns a generic 500 when an unexpected error escapes, without leaking its message", async () => {
    const error = vi.spyOn(h.ctx.log, "error").mockImplementation(() => undefined);
    vi.spyOn(h.ctx.db, "select").mockImplementation(() => {
      throw new Error("relation internal_secret_table does not exist");
    });
    // Authentication itself reads the database, so the failure surfaces there.
    const res = await owner.get("/invoices");
    expect(res.status).toBe(500);
    expect(res.body.error.code).toBe("INTERNAL");
    expect(JSON.stringify(res.body)).not.toContain("internal_secret_table");
    expect(error).toHaveBeenCalled();
  });

  it("reports a unique-constraint race as a retryable 409", async () => {
    vi.spyOn(h.ctx.db, "select").mockImplementation(() => {
      throw Object.assign(new Error("Failed query"), { cause: { code: "23505" } });
    });
    const res = await owner.get("/invoices");
    expect(res.status).toBe(409);
    expect(res.body.error.code).toBe("CONFLICT");
  });
});

describe("sessions", () => {
  it("serves /auth/me and /config/public", async () => {
    const me = await owner.get("/auth/me");
    expect(me.body.user).toMatchObject({ email: "owner@demo.quartermaster.dev", role: "OWNER" });
    const cfg = await api().get("/api/v1/config/public");
    expect(cfg.status).toBe(200);
    expect(cfg.body).toMatchObject({
      environment: "test",
      paypal: { enabled: false, environment: "sandbox" },
      market_data: { provider: "channel3", enabled: false },
      ai: { enabled: true, mode: "LLM" },
    });
  });

  it("rejects bad sign-ins without saying which part was wrong", async () => {
    const login = (body: object) => api().post("/api/v1/auth/login").set("X-Requested-With", "quartermaster").send(body);
    const wrong = await login({ email: "viewer@demo.quartermaster.dev", password: "not-the-password" });
    const unknown = await login({ email: "nobody@demo.quartermaster.dev", password: "not-the-password" });
    expect(wrong.status).toBe(401);
    expect(unknown.status).toBe(401);
    expect(wrong.body.error.message).toBe(unknown.body.error.message);
    expect((await login({ email: 42, password: PASSWORD })).status).toBe(400);
  });

  it("signs out: the cookie is cleared and the old token no longer authenticates", async () => {
    const login = await api()
      .post("/api/v1/auth/login")
      .set("X-Requested-With", "quartermaster")
      .send({ email: "manager@demo.quartermaster.dev", password: PASSWORD });
    expect(login.status).toBe(200);
    const cookie = String(login.headers["set-cookie"]).split(";")[0]!;
    const me = () => api().get("/api/v1/auth/me").set("Cookie", cookie);
    expect((await me()).status).toBe(200);

    const out = await api().post("/api/v1/auth/logout").set("X-Requested-With", "quartermaster").set("Cookie", cookie);
    expect(out.status).toBe(204);
    expect(String(out.headers["set-cookie"])).toMatch(/qm_session=;/);
    // A replayed token is refused as an ended session.
    const after = await me();
    expect(after.status).toBe(401);
    expect(after.body.error.message).toMatch(/expired/i);
    // Without any cookie the request is simply unauthenticated.
    const anonymous = await api().post("/api/v1/auth/logout").set("X-Requested-With", "quartermaster");
    expect(anonymous.status).toBe(401);
    expect(anonymous.body.error.message).not.toMatch(/expired/i);
  });

  it("ends the sessions of a disabled user", async () => {
    const viewer = await h.agent("viewer");
    const me = (await viewer.get("/auth/me")).body.user;
    await h.ctx.db.update(users).set({ disabled: true }).where(eq(users.id, me.id));
    try {
      expect((await viewer.get("/inventory")).status).toBe(401);
    } finally {
      await h.ctx.db.update(users).set({ disabled: false }).where(eq(users.id, me.id));
    }
  });

  it("refreshes a session's last-seen time at most once a minute", async () => {
    const viewer = await h.agent("viewer");
    const userId = (await viewer.get("/auth/me")).body.user.id as string;
    const lastSeen = async () =>
      (await h.ctx.db.select().from(sessions).where(eq(sessions.userId, userId)))
        .filter((s) => !s.revokedAt)
        .map((s) => s.lastSeenAt.getTime())
        .sort((a, b) => b - a)[0]!;
    const start = h.clock.now;
    try {
      const before = await lastSeen();
      await viewer.get("/inventory");
      expect(await lastSeen()).toBe(before);
      h.clock.now = new Date(start.getTime() + 5 * 60_000);
      await viewer.get("/inventory");
      expect(await lastSeen()).toBe(h.clock.now.getTime());
    } finally {
      h.clock.now = start;
    }
  });
});

describe("a deployment without PayPal or synthetic delivery actions", () => {
  it("refuses payment routes with 503 before doing any work", async () => {
    const intent = await owner.post("/intents/00000000-0000-4000-8000-000000000000/paypal-order");
    expect(intent.status).toBe(503);
    expect(intent.body.error.code).toBe("PAYPAL_NOT_CONFIGURED");
    const capture = await owner.post("/payments/00000000-0000-4000-8000-000000000000/capture", { paypal_order_id: "ORDER-1" });
    expect(capture.status).toBe(503);
    expect(capture.body.error.code).toBe("PAYPAL_NOT_CONFIGURED");
  });

  it("refuses to simulate receiving or delaying deliveries", async () => {
    const manager = await h.agent("manager");
    const id = "00000000-0000-4000-8000-000000000000";
    const receive = await manager.post(`/deliveries/${id}/receive`, {
      lines: [{ purchase_order_item_id: id, quantity_received: 1 }],
    });
    expect(receive.status).toBe(403);
    const delay = await manager.post(`/deliveries/${id}/delay`, { new_expected_date: "2099-01-01", reason: "x" });
    expect(delay.status).toBe(403);
    expect((await manager.get("/deliveries")).body).toEqual({ items: [] });
    expect((await manager.get("/invoices")).body).toEqual({ items: [] });
  });
});

describe("expensive or revealing endpoints", () => {
  it("lets only managers and owners recompute the audit chain", async () => {
    const viewer = await h.agent("viewer");
    const denied = await viewer.get("/security/audit/verify");
    expect(denied.status).toBe(403);
    expect(denied.body.error.code).toBe("ROLE_REQUIRED");
    const manager = await h.agent("manager");
    expect((await manager.get("/security/audit/verify")).status).toBe(200);
  });
});
