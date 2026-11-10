import { isIP } from "node:net";
import { z } from "zod";

const bool = (def: boolean) =>
  z
    .enum(["true", "false", "1", "0", "yes", "no"])
    .optional()
    .transform((v) => (v === undefined ? def : ["true", "1", "yes"].includes(v)));

/** A boolean whose default depends on other settings (undefined when unset). */
const optionalBool = () =>
  z
    .enum(["true", "false", "1", "0", "yes", "no"])
    .optional()
    .transform((v) => (v === undefined ? undefined : ["true", "1", "yes"].includes(v)));

const EnvSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  PORT: z.coerce.number().int().min(1).max(65535).default(4000),
  LOG_LEVEL: z.enum(["fatal", "error", "warn", "info", "debug", "trace", "silent"]).default("info"),
  APP_BASE_URL: z.string().url().default("http://localhost:3000"),
  /** Comma-separated origins allowed to call the API cross-origin (the web app normally proxies). */
  CORS_ORIGINS: z.string().default(""),
  /**
   * Reverse proxies in front of the API, as Express's `trust proxy`: a hop count (0–5), or a
   * comma-separated list of trusted proxy addresses/CIDRs (and loopback|linklocal|uniquelocal).
   * Set it so `req.ip` is the browser's address, or per-IP rate limits are shared by everyone.
   */
  TRUST_PROXY: z.string().default("0"),
  /** Per client IP, per minute, across the API. */
  RATE_LIMIT_PER_MINUTE: z.coerce.number().int().min(1).max(1_000_000).optional(),
  /** Sign-in attempts per client IP + email address, per 15 minutes. */
  LOGIN_RATE_LIMIT_PER_ACCOUNT: z.coerce.number().int().min(1).max(100_000).optional(),
  /** Sign-in attempts per client IP across all email addresses, per 15 minutes. */
  LOGIN_RATE_LIMIT_PER_IP: z.coerce.number().int().min(1).max(100_000).optional(),
  /** PayPal webhook deliveries per source IP, per minute. */
  WEBHOOK_RATE_LIMIT_PER_MINUTE: z.coerce.number().int().min(1).max(100_000).default(120),
  /** Where rate-limit counters live: shared in the database (production default) or per process. */
  RATE_LIMIT_STORE: z.enum(["memory", "database"]).optional(),

  DATABASE_URL: z.string().min(1).optional(),
  /** Defaults to `require` in production and `disable` elsewhere. */
  DATABASE_SSL: z.enum(["require", "disable"]).optional(),
  /** Production refuses DATABASE_SSL=disable unless this is set (e.g. a provider's private network). */
  DATABASE_ALLOW_INSECURE_TRANSPORT: bool(false),
  DATABASE_CA_CERT: z.string().optional(),
  DATABASE_POOL_MAX: z.coerce.number().int().min(1).max(100).default(10),

  SESSION_TTL_HOURS: z.coerce
    .number()
    .int()
    .min(1)
    .max(24 * 30)
    .default(12),
  COOKIE_SECURE: bool(false),

  TRUSTRAIL_SIGNING_KEY: z.string().optional(),
  TRUSTRAIL_SIGNING_KEY_ID: z
    .string()
    .regex(/^[\w.-]{3,64}$/)
    .optional(),

  PAYPAL_ENV: z.enum(["sandbox", "live"]).default("sandbox"),
  PAYPAL_CLIENT_ID: z.string().optional(),
  PAYPAL_CLIENT_SECRET: z.string().optional(),
  PAYPAL_WEBHOOK_ID: z.string().optional(),
  PAYPAL_MERCHANT_ID: z.string().optional(),
  PAYPAL_BRAND_NAME: z.string().max(127).default("Quartermaster Sandbox Suppliers"),

  CHANNEL3_API_KEY: z.string().optional(),
  CHANNEL3_BASE_URL: z.string().url().optional(),

  OPENAI_API_KEY: z.string().optional(),
  OPENAI_MODEL: z.string().default("gpt-5-mini"),
  OPENAI_BASE_URL: z.string().url().optional(),

  ZAPIER_WEBHOOK_URL: z.string().url().optional(),

  /** Anyone may create a workspace (POST /auth/signup). */
  SIGNUP_ENABLED: bool(true),
  /** Sign-ups per client IP per hour. */
  SIGNUP_RATE_LIMIT_PER_HOUR: z.coerce.number().int().min(1).max(100_000).optional(),
  INVITATION_TTL_DAYS: z.coerce.number().int().min(1).max(30).default(7),
  PASSWORD_RESET_TTL_MINUTES: z.coerce
    .number()
    .int()
    .min(10)
    .max(24 * 60)
    .default(60),
  /** Show the shared sample-workspace accounts on the sign-in page. Defaults to off in production. */
  SAMPLE_ACCOUNTS_HINT: optionalBool(),

  /** Email over HTTPS: Resend, or a JSON webhook (e.g. Zapier "Email by Zapier"). */
  RESEND_API_KEY: z.string().optional(),
  EMAIL_WEBHOOK_URL: z.string().url().optional(),
  EMAIL_FROM: z.string().min(3).max(200).default("Quartermaster <onboarding@resend.dev>"),

  /** Comma-separated emails of platform operators (system-wide error tracking). */
  OPERATOR_EMAILS: z.string().default(""),
  /** Comma-separated recipients of operational alerts (needs email configured). */
  ALERT_EMAILS: z.string().default(""),
  /** Slack-compatible incoming webhook (`{ text }`) for operational alerts. */
  ALERT_WEBHOOK_URL: z.string().url().optional(),
  /** Minimum minutes between repeat alerts for the same error. */
  ALERT_COOLDOWN_MINUTES: z.coerce
    .number()
    .int()
    .min(1)
    .max(24 * 60)
    .default(30),
  /** Optional: also forward errors to Sentry. */
  SENTRY_DSN: z.string().url().optional(),
  /** Release identifier attached to error reports (Render sets RENDER_GIT_COMMIT). */
  RENDER_GIT_COMMIT: z.string().max(64).optional(),

  AGENT_MAX_RESEARCH_CALLS: z.coerce.number().int().min(1).max(50).default(8),
  AGENT_DEADLINE_MS: z.coerce.number().int().min(2000).max(120_000).default(45_000),
  AGENT_TOKEN_BUDGET: z.coerce.number().int().min(500).max(200_000).default(12_000),
  MARKET_REFERENCE_MAX_AGE_HOURS: z.coerce
    .number()
    .int()
    .min(1)
    .max(24 * 30)
    .default(72),

  /** How long shutdown waits for in-flight requests and a running sweep (research runs take ~45s). */
  SHUTDOWN_GRACE_MS: z.coerce.number().int().min(0).max(600_000).default(60_000),
  SWEEPER_INTERVAL_SECONDS: z.coerce.number().int().min(0).max(3600).default(60),
  /** Demo-only delivery simulation. Defaults to false in production, true elsewhere. */
  ALLOW_SYNTHETIC_DELIVERY_ACTIONS: optionalBool(),

  /* ---------------------------------------------------------------------------------------------
   * Security hardening (abuse limits, shared sample workspace, edge trust, sessions).
   * Every setting is optional; the defaults suit production. Under NODE_ENV=test the limits are
   * effectively off and the sample workspace is writable, so suites can drive the demo freely;
   * tests of these features set them explicitly.
   * ------------------------------------------------------------------------------------------- */
  /**
   * Shared secret the web app's proxy sends as `X-QM-Edge`. When set, forwarded client addresses
   * (X-Forwarded-For, per TRUST_PROXY) are believed only on requests carrying it; any other request
   * is limited by its socket peer address. Unset: forwarded addresses are trusted as before.
   */
  EDGE_SECRET: z.string().min(16).max(256).optional(),
  /** Refuse account, team, mandate and supplier changes in the shared sample workspace. */
  SAMPLE_WORKSPACE_READONLY: optionalBool(),
  /** Reset the shared sample workspace once a day at this UTC hour (0–23). Unset: never. */
  SAMPLE_RESET_HOUR_UTC: z.coerce.number().int().min(0).max(23).optional(),
  /** Research runs per organisation per UTC day that may call OpenAI/Channel3; beyond it, deterministic. */
  RESEARCH_DAILY_RUNS_PER_ORG: z.coerce.number().int().min(0).max(1_000_000).optional(),
  /** Research runs per UTC day across the platform that may call OpenAI/Channel3. */
  RESEARCH_DAILY_RUNS_GLOBAL: z.coerce.number().int().min(0).max(10_000_000).optional(),
  /** Model tokens per UTC day across the platform; beyond it, language-model steps are deterministic. */
  RESEARCH_DAILY_TOKENS_GLOBAL: z.coerce.number().int().min(0).max(10_000_000_000).optional(),
  /** Invitations per workspace per hour and per day. */
  INVITE_RATE_LIMIT_PER_HOUR: z.coerce.number().int().min(1).max(100_000).optional(),
  INVITE_RATE_LIMIT_PER_DAY: z.coerce.number().int().min(1).max(1_000_000).optional(),
  /** Red-team evaluations per user and per workspace, per minute. */
  RED_TEAM_RATE_LIMIT_PER_USER: z.coerce.number().int().min(1).max(100_000).optional(),
  RED_TEAM_RATE_LIMIT_PER_ORG: z.coerce.number().int().min(1).max(100_000).optional(),
  /** Sessions unused for this many minutes end (0 turns idle expiry off). */
  SESSION_IDLE_MINUTES: z.coerce
    .number()
    .int()
    .min(0)
    .max(24 * 60 * 30)
    .optional(),
  /** PayPal webhook deliveries verified with PayPal per minute, across all sources. */
  WEBHOOK_VERIFY_GLOBAL_PER_MINUTE: z.coerce.number().int().min(1).max(100_000).default(300),
});

export type Env = z.infer<typeof EnvSchema>;

export interface AppConfig {
  env: Env["NODE_ENV"];
  port: number;
  logLevel: Env["LOG_LEVEL"];
  appBaseUrl: string;
  corsOrigins: string[];
  /** Hop count, or trusted proxy addresses/subnets. */
  trustProxy: number | string[];
  rateLimits: { perMinute: number; loginPerAccount: number; loginPerIp: number; webhookPerMinute: number; store: "memory" | "database" };
  database: { url: string; ssl: boolean; ca?: string; poolMax: number };
  session: { ttlHours: number; cookieSecure: boolean; cookieName: string };
  signing: { privateKey: string | null; keyId: string | undefined };
  paypal: {
    environment: "sandbox" | "live";
    clientId: string | null;
    clientSecret: string | null;
    webhookId: string | null;
    merchantId: string | null;
    brandName: string;
  };
  channel3: { apiKey: string | null; baseUrl?: string };
  openai: { apiKey: string | null; model: string; baseUrl?: string };
  zapierWebhookUrl: string | null;
  accounts: {
    signupEnabled: boolean;
    signupPerHour: number;
    invitationTtlDays: number;
    passwordResetTtlMinutes: number;
    sampleAccountsHint: boolean;
  };
  email: { resendApiKey: string | null; webhookUrl: string | null; from: string };
  monitoring: {
    operatorEmails: string[];
    alertEmails: string[];
    alertWebhookUrl: string | null;
    alertCooldownMinutes: number;
    sentryDsn: string | null;
    release: string | null;
  };
  agent: { maxResearchCalls: number; deadlineMs: number; tokenBudget: number; marketReferenceMaxAgeHours: number };
  sweeperIntervalSeconds: number;
  shutdownGraceMs: number;
  allowSyntheticDeliveryActions: boolean;
  /** Security hardening (see the block at the end of EnvSchema). */
  security: {
    edgeSecret: string | null;
    sampleReadOnly: boolean;
    sampleResetHourUtc: number | null;
    research: { dailyRunsPerOrg: number; dailyRunsGlobal: number; dailyTokensGlobal: number };
    invitesPerHour: number;
    invitesPerDay: number;
    redTeamPerUserPerMinute: number;
    redTeamPerOrgPerMinute: number;
    /** 0 = no idle expiry. */
    sessionIdleMinutes: number;
    webhookVerifyPerMinute: number;
  };
}

const NAMED_PROXY_RANGES = new Set(["loopback", "linklocal", "uniquelocal"]);

function isTrustedProxyEntry(entry: string): boolean {
  if (NAMED_PROXY_RANGES.has(entry)) return true;
  const [addr, prefix, ...rest] = entry.split("/");
  const family = isIP(addr ?? "");
  if (!family || rest.length) return false;
  if (prefix === undefined) return true;
  if (!/^\d{1,3}$/.test(prefix)) return false;
  return Number(prefix) <= (family === 4 ? 32 : 128);
}

/** Parses TRUST_PROXY into Express's `trust proxy` setting. `true` (trust everything) is refused. */
export function parseTrustProxy(raw: string): number | string[] {
  const value = raw.trim();
  if (/^\d+$/.test(value)) {
    const hops = Number(value);
    if (hops > 5) throw new Error("Invalid configuration: TRUST_PROXY hop count must be between 0 and 5");
    return hops;
  }
  const entries = value
    .split(",")
    .map((v) => v.trim())
    .filter(Boolean);
  const bad = entries.filter((v) => !isTrustedProxyEntry(v));
  if (!entries.length || bad.length) {
    throw new Error(
      `Invalid configuration: TRUST_PROXY must be a hop count or a list of proxy addresses/CIDRs (invalid: ${bad.join(", ") || "empty"})`,
    );
  }
  return entries;
}

/** Lower-cased, de-duplicated addresses from a comma-separated list; malformed entries are refused. */
export function emailList(raw: string): string[] {
  const list = [
    ...new Set(
      raw
        .split(",")
        .map((v) => v.trim().toLowerCase())
        .filter(Boolean),
    ),
  ];
  const bad = list.filter((v) => !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v));
  if (bad.length) throw new Error(`Invalid configuration: not an email address: ${bad.map((b) => b.slice(0, 40)).join(", ")}`);
  return list;
}

export function loadConfig(source: NodeJS.ProcessEnv = process.env): AppConfig {
  const parsed = EnvSchema.safeParse(source);
  if (!parsed.success) {
    const issues = parsed.error.issues.map((i) => `${i.path.join(".")}: ${i.message}`).join("; ");
    throw new Error(`Invalid configuration: ${issues}`);
  }
  const e = parsed.data;
  const production = e.NODE_ENV === "production";

  if (production) {
    const missing = [
      ["DATABASE_URL", e.DATABASE_URL],
      ["TRUSTRAIL_SIGNING_KEY", e.TRUSTRAIL_SIGNING_KEY],
    ].filter(([, v]) => !v);
    if (missing.length) throw new Error(`Missing required production configuration: ${missing.map(([k]) => k).join(", ")}`);
    if (e.DATABASE_URL!.startsWith("pglite://")) throw new Error("PGlite is for local development only; use PostgreSQL in production");
    if (e.PAYPAL_ENV === "live")
      throw new Error("Live PayPal is disabled in this release; unattended production payments are out of scope");
    if (e.DATABASE_SSL === "disable" && !e.DATABASE_ALLOW_INSECURE_TRANSPORT) {
      throw new Error(
        "DATABASE_SSL=disable is refused in production; use TLS, or set DATABASE_ALLOW_INSECURE_TRANSPORT=true for a trusted private network",
      );
    }
  }
  if (Boolean(e.PAYPAL_CLIENT_ID) !== Boolean(e.PAYPAL_CLIENT_SECRET)) {
    throw new Error("PAYPAL_CLIENT_ID and PAYPAL_CLIENT_SECRET must be set together");
  }
  if (production && e.PAYPAL_CLIENT_ID) {
    // Without these, webhooks cannot be verified and captures to an arbitrary payee are not refused.
    const paypalMissing = [
      ["PAYPAL_WEBHOOK_ID", e.PAYPAL_WEBHOOK_ID],
      ["PAYPAL_MERCHANT_ID", e.PAYPAL_MERCHANT_ID],
    ].filter(([, v]) => !v);
    if (paypalMissing.length) {
      throw new Error(
        `PayPal is configured but ${paypalMissing.map(([k]) => k).join(" and ")} ${paypalMissing.length > 1 ? "are" : "is"} missing; both are required in production`,
      );
    }
  }

  return {
    env: e.NODE_ENV,
    port: e.PORT,
    logLevel: e.LOG_LEVEL,
    appBaseUrl: e.APP_BASE_URL,
    corsOrigins: e.CORS_ORIGINS.split(",")
      .map((o) => o.trim())
      .filter(Boolean),
    trustProxy: parseTrustProxy(e.TRUST_PROXY),
    // Tests drive many requests from one address; their defaults are effectively unlimited.
    rateLimits: {
      perMinute: e.RATE_LIMIT_PER_MINUTE ?? (e.NODE_ENV === "test" ? 10_000 : 300),
      loginPerAccount: e.LOGIN_RATE_LIMIT_PER_ACCOUNT ?? (e.NODE_ENV === "test" ? 1000 : 10),
      loginPerIp: e.LOGIN_RATE_LIMIT_PER_IP ?? (e.NODE_ENV === "test" ? 1000 : 100),
      webhookPerMinute: e.WEBHOOK_RATE_LIMIT_PER_MINUTE,
      store: e.RATE_LIMIT_STORE ?? (production ? "database" : "memory"),
    },
    database: {
      url: e.DATABASE_URL ?? "pglite://./.data/pglite",
      ssl: (e.DATABASE_SSL ?? (production ? "require" : "disable")) === "require",
      ca: e.DATABASE_CA_CERT,
      poolMax: e.DATABASE_POOL_MAX,
    },
    session: {
      ttlHours: e.SESSION_TTL_HOURS,
      cookieSecure: production || e.COOKIE_SECURE,
      cookieName: production ? "__Host-qm_session" : "qm_session",
    },
    signing: { privateKey: e.TRUSTRAIL_SIGNING_KEY ?? null, keyId: e.TRUSTRAIL_SIGNING_KEY_ID },
    paypal: {
      environment: e.PAYPAL_ENV,
      clientId: e.PAYPAL_CLIENT_ID ?? null,
      clientSecret: e.PAYPAL_CLIENT_SECRET ?? null,
      webhookId: e.PAYPAL_WEBHOOK_ID ?? null,
      merchantId: e.PAYPAL_MERCHANT_ID ?? null,
      brandName: e.PAYPAL_BRAND_NAME,
    },
    channel3: { apiKey: e.CHANNEL3_API_KEY ?? null, baseUrl: e.CHANNEL3_BASE_URL },
    openai: { apiKey: e.OPENAI_API_KEY ?? null, model: e.OPENAI_MODEL, baseUrl: e.OPENAI_BASE_URL },
    zapierWebhookUrl: e.ZAPIER_WEBHOOK_URL ?? null,
    accounts: {
      signupEnabled: e.SIGNUP_ENABLED,
      signupPerHour: e.SIGNUP_RATE_LIMIT_PER_HOUR ?? (e.NODE_ENV === "test" ? 1000 : 5),
      invitationTtlDays: e.INVITATION_TTL_DAYS,
      passwordResetTtlMinutes: e.PASSWORD_RESET_TTL_MINUTES,
      sampleAccountsHint: e.SAMPLE_ACCOUNTS_HINT ?? !production,
    },
    email: { resendApiKey: e.RESEND_API_KEY ?? null, webhookUrl: e.EMAIL_WEBHOOK_URL ?? null, from: e.EMAIL_FROM },
    monitoring: {
      operatorEmails: emailList(e.OPERATOR_EMAILS),
      alertEmails: emailList(e.ALERT_EMAILS),
      alertWebhookUrl: e.ALERT_WEBHOOK_URL ?? null,
      alertCooldownMinutes: e.ALERT_COOLDOWN_MINUTES,
      sentryDsn: e.SENTRY_DSN ?? null,
      release: e.RENDER_GIT_COMMIT?.slice(0, 12) ?? null,
    },
    agent: {
      maxResearchCalls: e.AGENT_MAX_RESEARCH_CALLS,
      deadlineMs: e.AGENT_DEADLINE_MS,
      tokenBudget: e.AGENT_TOKEN_BUDGET,
      marketReferenceMaxAgeHours: e.MARKET_REFERENCE_MAX_AGE_HOURS,
    },
    sweeperIntervalSeconds: e.SWEEPER_INTERVAL_SECONDS,
    shutdownGraceMs: e.SHUTDOWN_GRACE_MS,
    allowSyntheticDeliveryActions: e.ALLOW_SYNTHETIC_DELIVERY_ACTIONS ?? !production,
    // Security hardening. `test` keeps limits out of the way of suites that drive the demo hard.
    security: {
      edgeSecret: e.EDGE_SECRET ?? null,
      sampleReadOnly: e.SAMPLE_WORKSPACE_READONLY ?? e.NODE_ENV !== "test",
      sampleResetHourUtc: e.SAMPLE_RESET_HOUR_UTC ?? null,
      research: {
        dailyRunsPerOrg: e.RESEARCH_DAILY_RUNS_PER_ORG ?? (e.NODE_ENV === "test" ? 100_000 : 40),
        dailyRunsGlobal: e.RESEARCH_DAILY_RUNS_GLOBAL ?? (e.NODE_ENV === "test" ? 1_000_000 : 600),
        dailyTokensGlobal: e.RESEARCH_DAILY_TOKENS_GLOBAL ?? (e.NODE_ENV === "test" ? 1_000_000_000 : 6_000_000),
      },
      invitesPerHour: e.INVITE_RATE_LIMIT_PER_HOUR ?? (e.NODE_ENV === "test" ? 1000 : 20),
      invitesPerDay: e.INVITE_RATE_LIMIT_PER_DAY ?? (e.NODE_ENV === "test" ? 10_000 : 100),
      redTeamPerUserPerMinute: e.RED_TEAM_RATE_LIMIT_PER_USER ?? (e.NODE_ENV === "test" ? 1000 : 30),
      redTeamPerOrgPerMinute: e.RED_TEAM_RATE_LIMIT_PER_ORG ?? (e.NODE_ENV === "test" ? 1000 : 120),
      sessionIdleMinutes: e.SESSION_IDLE_MINUTES ?? (e.NODE_ENV === "test" ? 0 : 120),
      webhookVerifyPerMinute: e.WEBHOOK_VERIFY_GLOBAL_PER_MINUTE,
    },
  };
}
