import { AsyncLocalStorage } from "node:async_hooks";
import type { Database, DatabaseHandle } from "@qm/database";
import { Channel3Client, Notifier, OpenAIClient } from "@qm/integrations";
import { PayPalClient } from "@qm/payments";
import type { SigningKey } from "@qm/trustrail";
import type { AppConfig } from "./config";
import type { Logger } from "./logger";

export interface AppContext {
  config: AppConfig;
  log: Logger;
  database: DatabaseHandle;
  db: Database;
  paypal: PayPalClient;
  channel3: Channel3Client;
  openai: OpenAIClient;
  notifier: Notifier;
  signingKey: SigningKey;
  /** Clock indirection so tests can control time. */
  now: () => Date;
}

export interface ContextOverrides {
  fetch?: typeof fetch;
  paypalFetch?: typeof fetch;
  channel3Fetch?: typeof fetch;
  openaiFetch?: typeof fetch;
  now?: () => Date;
}

export function buildContext(config: AppConfig, log: Logger, database: DatabaseHandle, signingKey: SigningKey, overrides: ContextOverrides = {}): AppContext {
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
  });
  const openai = new OpenAIClient({
    apiKey: config.openai.apiKey,
    model: config.openai.model,
    baseUrl: config.openai.baseUrl,
    fetch: overrides.openaiFetch ?? overrides.fetch,
    log: (event, data) => log.warn({ ...data, event }, "openai"),
  });
  const notifier = new Notifier({
    webhookUrl: config.zapierWebhookUrl,
    appBaseUrl: config.appBaseUrl,
    fetch: overrides.fetch,
    log: (event, data) => log.warn({ ...data, event }, "notifier"),
  });
  return { config, log, database, db: database.db, paypal, channel3, openai, notifier, signingKey, now: overrides.now ?? (() => new Date()) };
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
