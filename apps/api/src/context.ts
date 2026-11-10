import { AsyncLocalStorage } from "node:async_hooks";
import type { Database, DatabaseHandle } from "@qm/database";
import { Channel3Client, Mailer, Notifier, OpenAIClient, SentryForwarder } from "@qm/integrations";
import { PayPalClient } from "@qm/payments";
import type { SigningKey } from "@qm/trustrail";
import type { AppConfig } from "./config";
import type { Logger } from "./logger";
import { ErrorTracker } from "./services/monitoring/tracker";
import { ownerNotificationRecipients } from "./services/notifications";

export interface AppContext {
  config: AppConfig;
  log: Logger;
  database: DatabaseHandle;
  db: Database;
  paypal: PayPalClient;
  channel3: Channel3Client;
  openai: OpenAIClient;
  notifier: Notifier;
  /** Transactional email (invitations, password resets, alerts). */
  mailer: Mailer;
  /** Error tracking and operator alerting. */
  errors: ErrorTracker;
  signingKey: SigningKey;
  /** Clock indirection so tests can control time. */
  now: () => Date;
}

export interface ContextOverrides {
  fetch?: typeof fetch;
  paypalFetch?: typeof fetch;
  channel3Fetch?: typeof fetch;
  openaiFetch?: typeof fetch;
  /** Email provider, alert webhook and Sentry calls. */
  monitoringFetch?: typeof fetch;
  now?: () => Date;
}

export function buildContext(
  config: AppConfig,
  log: Logger,
  database: DatabaseHandle,
  signingKey: SigningKey,
  overrides: ContextOverrides = {},
): AppContext {
  const paypal = new PayPalClient({
    clientId: config.paypal.clientId,
    clientSecret: config.paypal.clientSecret,
    environment: config.paypal.environment,
    webhookId: config.paypal.webhookId,
    fetch: overrides.paypalFetch ?? overrides.fetch,
    log: (event, data) => log.info({ ...data, event }, "paypal"),
  });
  const channel3 = new Channel3Client({
    apiKey: config.channel3.apiKey,
    baseUrl: config.channel3.baseUrl,
    fetch: overrides.channel3Fetch ?? overrides.fetch,
    log: (event, data) => log.warn({ ...data, event }, "channel3"),
    breakerThreshold: config.providerBreaker.threshold,
    breakerCooldownMs: config.providerBreaker.cooldownMs,
  });
  const openai = new OpenAIClient({
    apiKey: config.openai.apiKey,
    model: config.openai.model,
    baseUrl: config.openai.baseUrl,
    fetch: overrides.openaiFetch ?? overrides.fetch,
    log: (event, data) => log.warn({ ...data, event }, "openai"),
    breakerThreshold: config.providerBreaker.threshold,
    breakerCooldownMs: config.providerBreaker.cooldownMs,
  });
  const now = overrides.now ?? (() => new Date());
  const mailer = new Mailer({
    resendApiKey: config.email.resendApiKey,
    webhookUrl: config.email.webhookUrl,
    from: config.email.from,
    fetch: overrides.monitoringFetch ?? overrides.fetch,
    log: (event, data) => log.warn({ ...data, event }, "mailer"),
  });
  const sentry = new SentryForwarder({
    dsn: config.monitoring.sentryDsn,
    environment: config.env,
    release: config.monitoring.release,
    fetch: overrides.monitoringFetch ?? overrides.fetch,
  });
  const errors = new ErrorTracker({
    db: database.db,
    log,
    now,
    mailer,
    sentry,
    fetch: overrides.monitoringFetch ?? overrides.fetch,
    appBaseUrl: config.appBaseUrl,
    environment: config.env,
    release: config.monitoring.release,
    alertEmails: config.monitoring.alertEmails,
    alertWebhookUrl: config.monitoring.alertWebhookUrl,
    cooldownMinutes: config.monitoring.alertCooldownMinutes,
  });
  const notifier = new Notifier({
    webhookUrl: config.zapierWebhookUrl,
    appBaseUrl: config.appBaseUrl,
    fetch: overrides.fetch,
    log: (event, data) => log.warn({ ...data, event }, "notifier"),
    channel: config.notifyChannel,
    mailer,
    recipients: ownerNotificationRecipients(database.db),
    // One warning group per channel (deduplicated by the tracker), so a lapsed Zapier plan or a
    // rejected sending domain shows up on the System page instead of only in the logs.
    onFailure: (f) =>
      errors.capture({
        source: "api",
        level: "warning",
        code: "NOTIFY_FAILED",
        message: `Notification delivery failed via ${f.channel}`,
        context: { channel: f.channel, kind: f.kind, reason: f.reason, status: f.status ?? null },
      }),
  });
  return {
    config,
    log,
    database,
    db: database.db,
    paypal,
    channel3,
    openai,
    notifier,
    mailer,
    errors,
    signingKey,
    now,
  };
}

/** Per-request context propagated through async calls (correlation id, actor). */
export interface RequestScope {
  correlationId: string;
  userId?: string;
  organizationId?: string;
  ip?: string;
  userAgent?: string;
}

export const requestScope = new AsyncLocalStorage<RequestScope>();

export function currentScope(): RequestScope | undefined {
  return requestScope.getStore();
}
