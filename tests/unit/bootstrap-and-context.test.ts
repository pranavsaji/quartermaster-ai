import { afterEach, describe, expect, it, vi } from "vitest";
import { existsSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { eq } from "drizzle-orm";
import { signingKeys, type DatabaseHandle } from "@qm/database";
import { generateSigningKey } from "@qm/trustrail";
import { bootstrap, loadDotEnv, REPO_ROOT } from "../../apps/api/src/bootstrap";
import { loadConfig } from "../../apps/api/src/config";
import { buildContext } from "../../apps/api/src/context";
import type { Logger } from "../../apps/api/src/logger";
import { registerSigningKey } from "../../apps/api/src/services/certificates";

afterEach(() => {
  vi.restoreAllMocks();
});

describe("bootstrap", () => {
  it("uses an ephemeral, registered signing key in development when none is configured", async () => {
    const ctx = await bootstrap({ env: { NODE_ENV: "development", LOG_LEVEL: "silent", DATABASE_URL: "pglite://memory" } });
    try {
      expect(ctx.config.env).toBe("development");
      expect(ctx.signingKey.key_id).toMatch(/^dev_ephemeral_/);
      const [row] = await ctx.db.select().from(signingKeys).where(eq(signingKeys.keyId, ctx.signingKey.key_id));
      expect(row!.publicKeyPem.trim()).toBe(ctx.signingKey.public_key_pem.trim());
      // A key id can never be rebound to a different key (certificates signed by it would change meaning).
      const impostor = generateSigningKey(ctx.signingKey.key_id);
      await expect(registerSigningKey(ctx.db, impostor)).rejects.toThrow(/already registered with a different public key/);
      // Registering the same key again is a no-op.
      await expect(registerSigningKey(ctx.db, ctx.signingKey)).resolves.toBeUndefined();
    } finally {
      await ctx.database.close();
    }
  });

  it("loads the configured signing key", async () => {
    const key = generateSigningKey("unit_configured_key");
    const ctx = await bootstrap({
      env: {
        NODE_ENV: "test",
        LOG_LEVEL: "silent",
        DATABASE_URL: "pglite://memory",
        TRUSTRAIL_SIGNING_KEY: Buffer.from(key.private_key_pem).toString("base64"),
        TRUSTRAIL_SIGNING_KEY_ID: key.key_id,
      },
    });
    try {
      expect(ctx.signingKey.key_id).toBe("unit_configured_key");
      expect(ctx.signingKey.public_key_pem.trim()).toBe(key.public_key_pem.trim());
    } finally {
      await ctx.database.close();
    }
  });

  it("refuses to start in production without a signing key or with embedded PGlite", async () => {
    await expect(bootstrap({ env: { NODE_ENV: "production", DATABASE_URL: "postgres://db.example.test/qm" } })).rejects.toThrow(
      /TRUSTRAIL_SIGNING_KEY/,
    );
    const key = generateSigningKey("unit_prod_key");
    await expect(
      bootstrap({
        env: {
          NODE_ENV: "production",
          DATABASE_URL: "pglite://memory",
          TRUSTRAIL_SIGNING_KEY: Buffer.from(key.private_key_pem).toString("base64"),
        },
      }),
    ).rejects.toThrow(/PGlite is for local development only/);
  });
});

describe("loadDotEnv", () => {
  it("loads exactly one .env file, preferring the repository root over the working directory", () => {
    const dir = mkdtempSync(path.join(tmpdir(), "qm-dotenv-"));
    const cwd = process.cwd();
    const load = vi.spyOn(process, "loadEnvFile").mockImplementation(() => undefined);
    try {
      writeFileSync(path.join(dir, ".env"), "QM_DOTENV_TEST=1\n");
      process.chdir(dir);
      loadDotEnv();
      const rootEnv = path.join(REPO_ROOT, ".env");
      expect(load).toHaveBeenCalledTimes(1);
      expect(load).toHaveBeenCalledWith(existsSync(rootEnv) ? rootEnv : path.join(process.cwd(), ".env"));
    } finally {
      process.chdir(cwd);
      rmSync(dir, { recursive: true, force: true });
    }
  });
});

describe("buildContext", () => {
  const logger = () => {
    const log = { info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn() };
    return log as typeof log & Logger;
  };
  const json = (status: number, body: unknown) =>
    new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json" } });

  function build(fetchImpl: typeof fetch, now?: () => Date) {
    const config = loadConfig({
      NODE_ENV: "test",
      PAYPAL_CLIENT_ID: "id",
      PAYPAL_CLIENT_SECRET: "secret",
      CHANNEL3_API_KEY: "c3",
      OPENAI_API_KEY: "oa",
      ZAPIER_WEBHOOK_URL: "https://hooks.example.test/qm",
    });
    const log = logger();
    const database = { db: {} } as unknown as DatabaseHandle;
    const ctx = buildContext(config, log, database, generateSigningKey("unit_ctx_key"), { fetch: fetchImpl, ...(now ? { now } : {}) });
    return { ctx, log };
  }

  it("routes every integration through the shared fetch and the wall clock by default", async () => {
    const urls: string[] = [];
    const fetchImpl: typeof fetch = async (input) => {
      const url = String(input instanceof Request ? input.url : input);
      urls.push(url);
      if (url.endsWith("/v1/oauth2/token")) return json(200, { access_token: "t", expires_in: 3600, token_type: "Bearer" });
      return json(500, {});
    };
    const { ctx } = build(fetchImpl);
    const before = Date.now();
    const now = ctx.now().getTime();
    expect(now).toBeGreaterThanOrEqual(before);
    expect(now).toBeLessThanOrEqual(Date.now());
    await ctx.paypal.getAccessToken();
    expect(urls.some((u) => u.endsWith("/v1/oauth2/token"))).toBe(true);
  });

  it("uses an injected clock", () => {
    const fixed = new Date("2026-11-10T12:00:00Z");
    const { ctx } = build(
      async () => json(200, {}),
      () => fixed,
    );
    expect(ctx.now()).toBe(fixed);
  });

  it("logs integration failures with the event name and without request content", async () => {
    const fetchImpl: typeof fetch = async (input) => {
      const url = String(input instanceof Request ? input.url : input);
      if (url.includes("hooks.example.test")) return json(502, {});
      // One well-formed product and one that is missing every required field.
      return json(200, { products: [{}, { id: "p1", title: "Gloves", offers: [] }] });
    };
    const { ctx, log } = build(fetchImpl);

    await ctx.notifier.send({ kind: "PURCHASE_BLOCKED", organization_id: "org", title: "t", summary: "s", link_path: "/orders" });
    expect(log.warn).toHaveBeenCalledWith(expect.objectContaining({ event: "notify.failed", status: 502 }), "notifier");

    ctx.openai.reportFallback("interpret", "model unavailable");
    expect(log.warn).toHaveBeenCalledWith(
      expect.objectContaining({ event: "openai.fallback", name: "interpret", reason: "model unavailable" }),
      "openai",
    );

    await ctx.channel3.search({ query: "nitrile gloves" }).catch(() => undefined);
    expect(log.warn).toHaveBeenCalledWith(expect.objectContaining({ event: "channel3.items_dropped" }), "channel3");
  });
});
