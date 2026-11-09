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

  DATABASE_URL: z.string().min(1).optional(),
  /** Defaults to `require` in production and `disable` elsewhere. */
  DATABASE_SSL: z.enum(["require", "disable"]).optional(),
  /** Production refuses DATABASE_SSL=disable unless this is set (e.g. a provider's private network). */
  DATABASE_ALLOW_INSECURE_TRANSPORT: bool(false),
  DATABASE_CA_CERT: z.string().optional(),
  DATABASE_POOL_MAX: z.coerce.number().int().min(1).max(100).default(10),

  SESSION_TTL_HOURS: z.coerce.number().int().min(1).max(24 * 30).default(12),
  COOKIE_SECURE: bool(false),

  TRUSTRAIL_SIGNING_KEY: z.string().optional(),
  TRUSTRAIL_SIGNING_KEY_ID: z.string().regex(/^[\w.-]{3,64}$/).optional(),

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

  AGENT_MAX_RESEARCH_CALLS: z.coerce.number().int().min(1).max(50).default(8),
  AGENT_DEADLINE_MS: z.coerce.number().int().min(2000).max(120_000).default(45_000),
  AGENT_TOKEN_BUDGET: z.coerce.number().int().min(500).max(200_000).default(12_000),
  MARKET_REFERENCE_MAX_AGE_HOURS: z.coerce.number().int().min(1).max(24 * 30).default(72),

  /** How long shutdown waits for in-flight requests and a running sweep (research runs take ~45s). */
  SHUTDOWN_GRACE_MS: z.coerce.number().int().min(0).max(600_000).default(60_000),
  SWEEPER_INTERVAL_SECONDS:z.coerce.number().int().min(0).max(3600).default(60),
  /** Demo-only delivery simulation. Defaults to false in production, true elsewhere. */
  ALLOW_SYNTHETIC_DELIVERY_ACTIONS: optionalBool(),
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
  rateLimits: { perMinute: number; loginPerAccount: number; loginPerIp: number; webhookPerMinute: number };
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
  agent: { maxResearchCalls: number; deadlineMs: number; tokenBudget: number; marketReferenceMaxAgeHours: number };
  sweeperIntervalSeconds: number;
  shutdownGraceMs: number;
  allowSyntheticDeliveryActions: boolean;
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
  const entries = value.split(",").map((v) => v.trim()).filter(Boolean);
  const bad = entries.filter((v) => !isTrustedProxyEntry(v));
  if (!entries.length || bad.length) {
    throw new Error(`Invalid configuration: TRUST_PROXY must be a hop count or a list of proxy addresses/CIDRs (invalid: ${bad.join(", ") || "empty"})`);
  }
  return entries;
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
    if (e.PAYPAL_ENV === "live") throw new Error("Live PayPal is disabled in this release; unattended production payments are out of scope");
    if (e.DATABASE_SSL === "disable" && !e.DATABASE_ALLOW_INSECURE_TRANSPORT) {
      throw new Error("DATABASE_SSL=disable is refused in production; use TLS, or set DATABASE_ALLOW_INSECURE_TRANSPORT=true for a trusted private network");
    }
  }
  if (!!e.PAYPAL_CLIENT_ID !== !!e.PAYPAL_CLIENT_SECRET) {
    throw new Error("PAYPAL_CLIENT_ID and PAYPAL_CLIENT_SECRET must be set together");
  }
  if (production && e.PAYPAL_CLIENT_ID) {
    // Without these, webhooks cannot be verified and captures to an arbitrary payee are not refused.
    const paypalMissing = [
      ["PAYPAL_WEBHOOK_ID", e.PAYPAL_WEBHOOK_ID],
      ["PAYPAL_MERCHANT_ID", e.PAYPAL_MERCHANT_ID],
    ].filter(([, v]) => !v);
    if (paypalMissing.length) {
      throw new Error(`PayPal is configured but ${paypalMissing.map(([k]) => k).join(" and ")} ${paypalMissing.length > 1 ? "are" : "is"} missing; both are required in production`);
    }
  }

  return {
    env: e.NODE_ENV,
    port: e.PORT,
    logLevel: e.LOG_LEVEL,
    appBaseUrl: e.APP_BASE_URL,
    corsOrigins: e.CORS_ORIGINS.split(",").map((o) => o.trim()).filter(Boolean),
    trustProxy: parseTrustProxy(e.TRUST_PROXY),
    // Tests drive many requests from one address; their defaults are effectively unlimited.
    rateLimits: {
      perMinute: e.RATE_LIMIT_PER_MINUTE ?? (e.NODE_ENV === "test" ? 10_000 : 300),
      loginPerAccount: e.LOGIN_RATE_LIMIT_PER_ACCOUNT ?? (e.NODE_ENV === "test" ? 1000 : 10),
      loginPerIp: e.LOGIN_RATE_LIMIT_PER_IP ?? (e.NODE_ENV === "test" ? 1000 : 100),
      webhookPerMinute: e.WEBHOOK_RATE_LIMIT_PER_MINUTE,
    },
    database: { url: e.DATABASE_URL ?? "pglite://./.data/pglite", ssl: (e.DATABASE_SSL ?? (production ? "require" : "disable")) === "require", ca: e.DATABASE_CA_CERT, poolMax: e.DATABASE_POOL_MAX },
    session: { ttlHours: e.SESSION_TTL_HOURS, cookieSecure: production || e.COOKIE_SECURE, cookieName: production ? "__Host-qm_session" : "qm_session" },
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
    agent: {
      maxResearchCalls: e.AGENT_MAX_RESEARCH_CALLS,
      deadlineMs: e.AGENT_DEADLINE_MS,
      tokenBudget: e.AGENT_TOKEN_BUDGET,
      marketReferenceMaxAgeHours: e.MARKET_REFERENCE_MAX_AGE_HOURS,
    },
    sweeperIntervalSeconds: e.SWEEPER_INTERVAL_SECONDS,
    shutdownGraceMs: e.SHUTDOWN_GRACE_MS,
    allowSyntheticDeliveryActions: e.ALLOW_SYNTHETIC_DELIVERY_ACTIONS ?? !production,
  };
}
