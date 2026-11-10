import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { randomUUID } from "node:crypto";
import { eq } from "drizzle-orm";
import request from "supertest";
import { DEMO_CREDENTIALS, paymentAttempts, systemErrors } from "@qm/database";
import { errorHandler } from "../../apps/api/src/http/middleware/errors";
import { sweep } from "../../apps/api/src/jobs/sweeper";
import { createHarness, type Client, type Harness } from "../helpers/harness";
import { paidOrder, relaxMandate } from "../helpers/flows";

interface Call {
  url: string;
  body: string;
}

function recorder() {
  const calls: Call[] = [];
  const fetchImpl = (async (input: string | URL | Request, init?: RequestInit) => {
    calls.push({ url: String(input), body: typeof init?.body === "string" ? init.body : "" });
    return new Response("{}", { status: 200 });
  }) as typeof fetch;
  return {
    calls,
    fetch: fetchImpl,
    alerts: () =>
      calls.filter((c) => c.url === "https://alerts.example.com/hook").map((c) => JSON.parse(c.body) as { text: string; title: string }),
    alertEmails: () =>
      calls.filter((c) => c.url.includes("api.resend.com")).map((c) => JSON.parse(c.body) as { to: string[]; subject: string }),
    sentry: () => calls.filter((c) => c.url.includes("/envelope/")),
  };
}

describe("error tracking, alerting and PayPal notification health", () => {
  let h: Harness;
  let owner: Client;
  const out = recorder();

  beforeAll(async () => {
    h = await createHarness({
      monitoringFetch: out.fetch,
      extraEnv: {
        OPERATOR_EMAILS: DEMO_CREDENTIALS.owner.email,
        ALERT_EMAILS: "oncall@example.com",
        ALERT_WEBHOOK_URL: "https://alerts.example.com/hook",
        RESEND_API_KEY: "re_test",
        ALERT_COOLDOWN_MINUTES: "30",
        SENTRY_DSN: "https://publickey@o1.ingest.sentry.io/123",
      },
    });
    owner = await h.agent("owner");
    await relaxMandate(owner);
  });
  afterAll(async () => h.close());

  /** Drives the real error handler as Express would for `GET /boom/:id` throwing an unexpected error. */
  async function failRequest(): Promise<{ status: number; body: { error: { message: string } } }> {
    const handler = errorHandler(h.ctx.log, (e) => void h.ctx.errors.capture({ source: "api", ...e }));
    const id = randomUUID();
    const req = { method: "GET", baseUrl: "/api/v1", path: `/boom/${id}`, route: { path: "/boom/:id" }, correlationId: "corr-123" };
    const out = { status: 0, body: undefined as unknown };
    const res = {
      set: () => res,
      status(code: number) {
        out.status = code;
        return res;
      },
      json(body: unknown) {
        out.body = body;
        return res;
      },
    };
    const err = new Error(`kaboom while loading ${id}`);
    (handler as unknown as (e: unknown, q: unknown, r: unknown, n: () => void) => void)(err, req, res, () => undefined);
    await new Promise((r) => setTimeout(r, 50));
    return out as { status: number; body: { error: { message: string } } };
  }

  it("groups unhandled errors by route, alerts once, and stays quiet during the cooldown", async () => {
    const first = await failRequest();
    expect(first.status).toBe(500);
    expect(first.body.error.message).toBe("An unexpected error occurred.");
    await failRequest();

    const rows = await h.ctx.db.select().from(systemErrors).where(eq(systemErrors.code, "INTERNAL"));
    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({
      occurrences: 2,
      route: "GET /api/v1/boom/:id",
      source: "api",
      level: "error",
      lastCorrelationId: "corr-123",
    });
    expect(out.alerts().filter((a) => a.title.includes("INTERNAL"))).toHaveLength(1);
    expect(out.alertEmails().filter((e) => e.subject.includes("INTERNAL"))).toHaveLength(1);
    expect(out.alertEmails()[0]!.to).toEqual(["oncall@example.com"]);
    expect(out.sentry().length).toBeGreaterThanOrEqual(2);
    // The alert links to the System page for details.
    expect(out.alerts()[0]!.text).toContain("Open: http://localhost:3000/system");
  });

  it("re-alerts after the cooldown when new occurrences arrive, and after a resolved error recurs", async () => {
    const saved = h.clock.now;
    h.clock.now = new Date(saved.getTime() + 31 * 60_000);
    try {
      await failRequest();
      expect(out.alerts().filter((a) => a.title.includes("INTERNAL"))).toHaveLength(2);

      const [row] = await h.ctx.db.select().from(systemErrors).where(eq(systemErrors.code, "INTERNAL"));
      const resolved = await owner.post(`/ops/errors/${row!.id}/resolve`);
      expect(resolved.status).toBe(200);
      expect(resolved.body.error.resolved_at).not.toBeNull();
      await failRequest();
      expect(out.alerts().filter((a) => a.title.includes("INTERNAL"))).toHaveLength(3);
      const [reopened] = await h.ctx.db.select().from(systemErrors).where(eq(systemErrors.code, "INTERNAL"));
      expect(reopened!.resolvedAt).toBeNull();
    } finally {
      h.clock.now = saved;
    }
  });

  it("records warnings without alerting", async () => {
    const before = out.alerts().length;
    await h.ctx.errors.capture({ source: "job", level: "warning", code: "SWEEP_PARTIAL_FAILURE", message: "Some steps failed" });
    expect(out.alerts().length).toBe(before);
    const [row] = await h.ctx.db.select().from(systemErrors).where(eq(systemErrors.code, "SWEEP_PARTIAL_FAILURE"));
    expect(row?.level).toBe("warning");
  });

  it("accepts browser error reports without a session", async () => {
    const res = await h.anonymous().post("/client-errors", {
      message: "TypeError: x is undefined",
      path: `/procurement/${randomUUID()}?tab=1`,
      kind: "render",
      digest: "abc",
    });
    expect(res.status).toBe(202);
    const [row] = await h.ctx.db.select().from(systemErrors).where(eq(systemErrors.code, "web.render"));
    expect(row).toMatchObject({ source: "web", route: "/procurement/:id" });
  });

  it("restricts the operations endpoints to operators", async () => {
    const me = await owner.get("/auth/me");
    expect(me.body.user.operator).toBe(true);
    const manager = await h.agent("manager");
    expect((await manager.get("/auth/me")).body.user.operator).toBe(false);
    const denied = await manager.get("/ops/errors");
    expect(denied.status).toBe(403);
    expect(denied.body.error.code).toBe("OPERATOR_REQUIRED");
    // The operator gate is scoped to /ops: other unknown paths are still 404 for everyone.
    expect((await manager.get("/nothing-here")).status).toBe(404);

    const health = await owner.get("/ops/health");
    expect(health.status).toBe(200);
    expect(health.body).toMatchObject({
      alerting: { email: true, webhook: true, recipients: 1 },
      email: { enabled: true, provider: "resend" },
      error_tracking: { sentry: true },
    });
    expect(health.body.error_tracking.open_errors).toBeGreaterThan(0);

    const page = await owner.get("/ops/errors?status=ALL&limit=1");
    expect(page.body.items).toHaveLength(1);
    expect(page.body.next_cursor).toEqual(expect.any(String));
    const next = await owner.get(`/ops/errors?status=ALL&limit=1&cursor=${page.body.next_cursor as string}`);
    expect(next.body.items[0].id).not.toBe(page.body.items[0].id);
  });

  it("sends a test alert to every channel", async () => {
    const res = await owner.post("/ops/alerts/test");
    expect(res.body).toEqual({ email_recipients: 1, emails_sent: 1, webhook_sent: true });
  });

  it("reports PayPal notification health and alerts on captures PayPal never confirmed", async () => {
    const o = await paidOrder(h, owner, "CLN-GLOVES");
    const status = await owner.get("/security/paypal-notifications");
    expect(status.body.status).toMatchObject({ configured: true, unconfirmed_captures_7d: 0 });

    const saved = h.clock.now;
    h.clock.now = new Date(saved.getTime() + 45 * 60_000);
    try {
      await sweep(h.ctx);
      const [monitor] = await h.ctx.db.select().from(systemErrors).where(eq(systemErrors.code, "monitor.paypal_webhook_missing"));
      expect(monitor).toMatchObject({ source: "monitor", level: "error" });
      expect(monitor!.resolvedAt).toBeNull();
      expect(out.alerts().some((a) => a.title.includes("monitor.paypal_webhook_missing"))).toBe(true);
      expect((await owner.get("/security/paypal-notifications")).body.status.unconfirmed_captures_7d).toBe(1);

      // PayPal's notification arrives: the condition clears and the monitor resolves itself.
      const [payment] = await h.ctx.db.select().from(paymentAttempts).where(eq(paymentAttempts.id, o.paymentId));
      const event = {
        id: `WH-${randomUUID()}`,
        event_type: "PAYMENT.CAPTURE.COMPLETED",
        resource: {
          id: payment!.paypalCaptureId,
          status: "COMPLETED",
          supplementary_data: { related_ids: { order_id: o.paypalOrderId } },
        },
      };
      const hook = await request(h.app)
        .post("/api/v1/webhooks/paypal")
        .set(h.paypal.webhookHeaders())
        .set("content-type", "application/json")
        .send(JSON.stringify(event));
      expect(hook.status).toBe(200);
      const after = (await owner.get("/security/paypal-notifications")).body.status;
      expect(after).toMatchObject({ unconfirmed_captures_7d: 0, last_event_type: "PAYMENT.CAPTURE.COMPLETED", received_24h: 1 });

      await sweep(h.ctx);
      const [cleared] = await h.ctx.db.select().from(systemErrors).where(eq(systemErrors.code, "monitor.paypal_webhook_missing"));
      expect(cleared!.resolvedAt).not.toBeNull();
    } finally {
      h.clock.now = saved;
    }
  });

  it("alerts when a capture stays pending with PayPal", async () => {
    const [p] = await h.ctx.db.select().from(paymentAttempts).limit(1);
    const original = { status: p!.status, updatedAt: p!.updatedAt };
    await h.ctx.db
      .update(paymentAttempts)
      .set({ status: "CAPTURE_PENDING", updatedAt: new Date(h.clock.now.getTime() - 20 * 60_000) })
      .where(eq(paymentAttempts.id, p!.id));
    try {
      // Reconciliation is not what is under test: make PayPal unreachable so the row stays pending.
      vi.spyOn(h.ctx.paypal, "getOrder").mockRejectedValue(new Error("PayPal unreachable"));
      await sweep(h.ctx);
      const [monitor] = await h.ctx.db.select().from(systemErrors).where(eq(systemErrors.code, "monitor.capture_pending"));
      expect(monitor?.message).toMatch(/1 payment\(s\) have waited over 15 minutes/);
    } finally {
      vi.restoreAllMocks();
      await h.ctx.db.update(paymentAttempts).set(original).where(eq(paymentAttempts.id, p!.id));
    }
  });
});
