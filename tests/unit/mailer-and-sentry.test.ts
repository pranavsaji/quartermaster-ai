import { describe, expect, it } from "vitest";
import { escapeHtml, Mailer, parseDsn, SentryForwarder } from "@qm/integrations";
import { emailList, loadConfig } from "../../apps/api/src/config";
import { fingerprintOf, normalizeMessage, normalizePath } from "../../apps/api/src/services/monitoring/tracker";

function capture(status = 200) {
  const calls: { url: string; init: RequestInit }[] = [];
  const fetchImpl = (async (url: string | URL | Request, init?: RequestInit) => {
    calls.push({ url: String(url), init: init ?? {} });
    return new Response("{}", { status });
  }) as typeof fetch;
  return { calls, fetch: fetchImpl };
}

const message = { to: "pat@example.com", subject: "Hi", text: "Body", kind: "test" };

describe("Mailer", () => {
  it("is disabled without a provider and never calls out", async () => {
    const c = capture();
    const m = new Mailer({ resendApiKey: null, webhookUrl: null, from: "a@b.c", fetch: c.fetch });
    expect(m.enabled).toBe(false);
    expect(await m.send(message)).toEqual({ sent: false, provider: "none" });
    expect(c.calls).toHaveLength(0);
  });

  it("prefers Resend, with a bearer key and one recipient", async () => {
    const c = capture();
    const m = new Mailer({ resendApiKey: "re_1", webhookUrl: "https://hook.example.com", from: "QM <qm@example.com>", fetch: c.fetch });
    expect(m.provider).toBe("resend");
    expect(await m.send(message)).toEqual({ sent: true, provider: "resend" });
    expect(c.calls[0]!.url).toBe("https://api.resend.com/emails");
    expect((c.calls[0]!.init.headers as Record<string, string>).Authorization).toBe("Bearer re_1");
    expect(JSON.parse(c.calls[0]!.init.body as string)).toMatchObject({ to: ["pat@example.com"], from: "QM <qm@example.com>" });
  });

  it("posts JSON to the webhook transport", async () => {
    const c = capture();
    const m = new Mailer({ resendApiKey: null, webhookUrl: "https://hook.example.com", from: "a@b.c", fetch: c.fetch });
    await m.send(message);
    expect(JSON.parse(c.calls[0]!.init.body as string)).toMatchObject({ to: "pat@example.com", subject: "Hi", kind: "test" });
  });

  it("reports failures without throwing or logging the address", async () => {
    const logs: Record<string, unknown>[] = [];
    const m = new Mailer({
      resendApiKey: "re_1",
      webhookUrl: null,
      from: "a@b.c",
      fetch: capture(500).fetch,
      log: (_e, d) => logs.push(d),
    });
    expect(await m.send(message)).toEqual({ sent: false, provider: "resend" });
    expect(JSON.stringify(logs)).not.toContain("pat@");
    expect(logs[0]).toMatchObject({ domain: "example.com", status: 500 });
    const broken = new Mailer({
      resendApiKey: "re_1",
      webhookUrl: null,
      from: "a@b.c",
      fetch: () => Promise.reject(new TypeError("network")),
    });
    expect((await broken.send(message)).sent).toBe(false);
  });

  it("escapes HTML", () => {
    expect(escapeHtml(`<a href="x">Tom & Jerry's</a>`)).toBe("&lt;a href=&quot;x&quot;&gt;Tom &amp; Jerry&#39;s&lt;/a&gt;");
  });
});

describe("SentryForwarder", () => {
  it("derives the envelope endpoint from a DSN", () => {
    expect(parseDsn("https://abc123@o42.ingest.sentry.io/4507")?.endpoint).toBe(
      "https://o42.ingest.sentry.io/api/4507/envelope/?sentry_key=abc123&sentry_version=7",
    );
    expect(parseDsn("https://key@sentry.example.com/prefix/9")?.endpoint).toBe(
      "https://sentry.example.com/prefix/api/9/envelope/?sentry_key=key&sentry_version=7",
    );
    expect(parseDsn("https://sentry.io/1")).toBeNull();
    expect(parseDsn("not a url")).toBeNull();
  });

  it("sends a three-line envelope with our fingerprint and no request data", async () => {
    const c = capture();
    const s = new SentryForwarder({ dsn: "https://k@o1.ingest.sentry.io/2", environment: "production", release: "abc", fetch: c.fetch });
    expect(await s.capture({ level: "error", fingerprint: "fp1", type: "Error", message: "boom", tags: { code: "INTERNAL" } })).toBe(true);
    const lines = (c.calls[0]!.init.body as string).split("\n").map((l) => JSON.parse(l) as Record<string, unknown>);
    expect(lines).toHaveLength(3);
    expect(lines[1]).toEqual({ type: "event" });
    expect(lines[2]).toMatchObject({
      level: "error",
      fingerprint: ["fp1"],
      environment: "production",
      release: "abc",
      tags: { code: "INTERNAL" },
    });
    expect(lines[2]).not.toHaveProperty("request");
  });

  it("is a no-op without a DSN", async () => {
    const c = capture();
    expect(
      await new SentryForwarder({ dsn: null, environment: "test", release: null, fetch: c.fetch }).capture({
        level: "error",
        fingerprint: "f",
        type: "E",
        message: "m",
        tags: {},
      }),
    ).toBe(false);
    expect(c.calls).toHaveLength(0);
  });
});

describe("error grouping", () => {
  it("groups messages that differ only by ids and numbers", () => {
    expect(normalizeMessage("Order 3f2a1c9e-0000-4000-8000-000000000001 failed after 3 tries (ref 5KD82734HY2938X)")).toBe(
      "Order :id failed after N tries (ref :ref)",
    );
    const a = fingerprintOf({ source: "api", code: "INTERNAL", route: "GET /x/:id", message: "Failed 12 times" });
    const b = fingerprintOf({ source: "api", code: "INTERNAL", route: "GET /x/:id", message: "Failed 99 times" });
    const c = fingerprintOf({ source: "api", code: "INTERNAL", route: "GET /y/:id", message: "Failed 99 times" });
    expect(a).toBe(b);
    expect(a).not.toBe(c);
    expect(normalizePath("/orders/3f2a1c9e-0000-4000-8000-000000000001?tab=2#x")).toBe("/orders/:id");
  });
});

describe("account and monitoring configuration", () => {
  it("parses email lists and refuses malformed addresses", () => {
    expect(emailList(" A@Example.com, b@example.com ,a@example.com,")).toEqual(["a@example.com", "b@example.com"]);
    expect(() => emailList("not-an-email")).toThrow(/not an email address/);
  });

  it("defaults: sign-up on, sample-account hint off in production", () => {
    const base = { NODE_ENV: "production", DATABASE_URL: "postgres://x", TRUSTRAIL_SIGNING_KEY: "k", DATABASE_SSL: "require" };
    const prod = loadConfig(base);
    expect(prod.accounts).toMatchObject({ signupEnabled: true, sampleAccountsHint: false, signupPerHour: 5 });
    expect(loadConfig({ ...base, SAMPLE_ACCOUNTS_HINT: "true", SIGNUP_ENABLED: "false" }).accounts).toMatchObject({
      signupEnabled: false,
      sampleAccountsHint: true,
    });
    expect(loadConfig({ NODE_ENV: "development" }).accounts.sampleAccountsHint).toBe(true);
    expect(loadConfig({ ...base, RENDER_GIT_COMMIT: "0123456789abcdef" }).monitoring.release).toBe("0123456789ab");
  });
});
