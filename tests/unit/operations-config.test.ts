import { describe, expect, it } from "vitest";
import { MIGRATION_LOCK_KEY, createDatabase, withAdvisoryLock, type LockClient } from "@qm/database";
import { generateSigningKey } from "@qm/trustrail";
import { bootstrap } from "../../apps/api/src/bootstrap";
import { loadConfig } from "../../apps/api/src/config";
import { isDeliverableAddress } from "../../apps/api/src/services/notifications";

const PROD = {
  NODE_ENV: "production",
  DATABASE_URL: "postgres://db/x",
  TRUSTRAIL_SIGNING_KEY: "k",
  APP_BASE_URL: "https://app.example",
} as const;

describe("operations configuration", () => {
  it("requires APP_BASE_URL in production, so emailed links never point at localhost", () => {
    const { APP_BASE_URL: _omit, ...withoutUrl } = PROD;
    expect(() => loadConfig(withoutUrl)).toThrow(/APP_BASE_URL/);
    expect(loadConfig(PROD).appBaseUrl).toBe("https://app.example");
    expect(loadConfig({}).appBaseUrl).toBe("http://localhost:3000");
  });

  it("chooses the notification channel from what is configured, unless set", () => {
    expect(loadConfig({}).notifyChannel).toBe("zapier");
    expect(loadConfig({ RESEND_API_KEY: "re" }).notifyChannel).toBe("email");
    expect(loadConfig({ RESEND_API_KEY: "re", ZAPIER_WEBHOOK_URL: "https://hooks.zapier.com/x" }).notifyChannel).toBe("both");
    expect(loadConfig({ RESEND_API_KEY: "re", NOTIFY_CHANNEL: "zapier" }).notifyChannel).toBe("zapier");
    expect(() => loadConfig({ NOTIFY_CHANNEL: "sms" })).toThrow(/NOTIFY_CHANNEL/);
  });

  it("migrates on boot outside production only, unless told otherwise", () => {
    expect(loadConfig({}).migrateOnBoot).toBe(true);
    expect(loadConfig(PROD).migrateOnBoot).toBe(false);
    expect(loadConfig({ ...PROD, MIGRATE_ON_BOOT: "true" }).migrateOnBoot).toBe(true);
    expect(loadConfig({ MIGRATE_ON_BOOT: "false" }).migrateOnBoot).toBe(false);
  });

  it("derives the stale-sweeper limit from the sweep interval (or a five-minute cron)", () => {
    expect(loadConfig({}).sweeperStaleAfterSeconds).toBe(180);
    expect(loadConfig({ SWEEPER_INTERVAL_SECONDS: "120" }).sweeperStaleAfterSeconds).toBe(360);
    expect(loadConfig({ SWEEPER_INTERVAL_SECONDS: "0" }).sweeperStaleAfterSeconds).toBe(900);
    expect(loadConfig({ SWEEPER_STALE_AFTER_SECONDS: "0" }).sweeperStaleAfterSeconds).toBe(0);
  });

  it("has retention, breaker and cache defaults, with bounds", () => {
    const c = loadConfig({});
    expect(c.retentionDays).toBe(90);
    expect(c.providerBreaker).toEqual({ threshold: 3, cooldownMs: 120_000 });
    expect(c.analyticsCacheSeconds).toBe(30);
    expect(loadConfig({ NODE_ENV: "test" }).analyticsCacheSeconds).toBe(0);
    expect(() => loadConfig({ RETENTION_DAYS: "1" })).toThrow(/RETENTION_DAYS/);
    expect(loadConfig({ PROVIDER_BREAKER_THRESHOLD: "0" }).providerBreaker.threshold).toBe(0);
  });
});

describe("migration lock", () => {
  function fakeClient(failOn?: string) {
    const log: string[] = [];
    const client: LockClient = {
      query: async (sql: string, params?: unknown[]) => {
        log.push(`${sql} ${JSON.stringify(params)}`);
        if (failOn && sql.includes(failOn)) throw new Error("boom");
        return {};
      },
      release: () => log.push("release"),
    };
    return { client, log };
  }

  it("holds a session advisory lock around the work and always releases the connection", async () => {
    const { client, log } = fakeClient();
    const result = await withAdvisoryLock(
      async () => client,
      MIGRATION_LOCK_KEY,
      async () => {
        log.push("migrate");
        return 7;
      },
    );
    expect(result).toBe(7);
    expect(log).toEqual([
      `select pg_advisory_lock($1) [${MIGRATION_LOCK_KEY}]`,
      "migrate",
      `select pg_advisory_unlock($1) [${MIGRATION_LOCK_KEY}]`,
      "release",
    ]);
  });

  it("unlocks and releases when the work fails, and releases when locking fails", async () => {
    const failing = fakeClient();
    await expect(
      withAdvisoryLock(
        async () => failing.client,
        1,
        async () => {
          throw new Error("migration failed");
        },
      ),
    ).rejects.toThrow("migration failed");
    expect(failing.log.slice(-2)).toEqual(["select pg_advisory_unlock($1) [1]", "release"]);

    const noLock = fakeClient("pg_advisory_lock");
    await expect(
      withAdvisoryLock(
        async () => noLock.client,
        1,
        async () => "never",
      ),
    ).rejects.toThrow("boom");
    expect(noLock.log).toEqual(["select pg_advisory_lock($1) [1]", "release"]);
  });

  it.skipIf(!process.env.TEST_DATABASE_URL)("lets concurrent migrators on PostgreSQL run one after the other", async () => {
    const a = await createDatabase({ url: process.env.TEST_DATABASE_URL! });
    const b = await createDatabase({ url: process.env.TEST_DATABASE_URL! });
    try {
      await expect(Promise.all([a.migrate(), b.migrate()])).resolves.toBeDefined();
    } finally {
      await Promise.all([a.close(), b.close()]);
    }
  });
});

describe("bootstrap and MIGRATE_ON_BOOT", () => {
  const env = (extra: Record<string, string> = {}) => {
    const key = generateSigningKey("boot_test");
    return {
      NODE_ENV: "test",
      LOG_LEVEL: "silent",
      DATABASE_URL: "pglite://memory",
      TRUSTRAIL_SIGNING_KEY: Buffer.from(key.private_key_pem).toString("base64"),
      TRUSTRAIL_SIGNING_KEY_ID: "boot_test",
      ...extra,
    } as NodeJS.ProcessEnv;
  };

  it("skips migrations when MIGRATE_ON_BOOT=false (the schema is then missing on a fresh database)", async () => {
    await expect(bootstrap({ env: env({ MIGRATE_ON_BOOT: "false" }) })).rejects.toThrow();
    const ctx = await bootstrap({ env: env({ MIGRATE_ON_BOOT: "false" }), migrate: true });
    await ctx.database.close();
  });
});

describe("notification recipients", () => {
  it("never mails removed members, reserved domains or the shared sample accounts", () => {
    expect(isDeliverableAddress("chef@bistro.co")).toBe(true);
    expect(isDeliverableAddress("removed-1@member.invalid")).toBe(false);
    expect(isDeliverableAddress("x@example.com")).toBe(false);
    expect(isDeliverableAddress("x@shop.test")).toBe(false);
    expect(isDeliverableAddress("owner@demo.quartermaster.dev")).toBe(false);
    expect(isDeliverableAddress("no-at-sign")).toBe(false);
  });
});
