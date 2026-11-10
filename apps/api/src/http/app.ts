import express, { Router, json } from "express";
import cookieParser from "cookie-parser";
import helmet from "helmet";
import rateLimit from "express-rate-limit";
import pinoHttp from "pino-http";
import type { AppContext } from "../context";
import { notFound } from "../errors";
import { sweeperHealth } from "../jobs/sweeper";
import { sessionAuth } from "./middleware/auth";
import { edgeTrust } from "./middleware/edge";
import { errorHandler } from "./middleware/errors";
import { correlation, csrfGuard } from "./middleware/security";
import { paypalWebhookGuard, paypalWebhookLimiter, paypalWebhookVerifyCap } from "./middleware/webhooks";
import { authRoutes } from "./routes/auth";
import { inventoryRoutes } from "./routes/inventory";
import { memberRoutes } from "./routes/members";
import { monitoringRoutes } from "./routes/monitoring";
import { operationsRoutes } from "./routes/operations";
import { intentAndPaymentRoutes, webhookRoutes } from "./routes/payments";
import { procurementRoutes } from "./routes/procurement";
import { supplierRoutes } from "./routes/suppliers";
import { limiterStore } from "./rate-limit-store";

/** How long the readiness probe waits for the database before answering 503. */
export const READINESS_TIMEOUT_MS = 2000;

/** Resolves with `work`, or rejects once `ms` have passed (the work itself is not cancelled). */
export function withinTimeout<T>(work: Promise<T>, ms: number): Promise<T> {
  let timer: NodeJS.Timeout | undefined;
  const timeout = new Promise<never>((_, reject) => {
    timer = setTimeout(() => reject(new Error(`timed out after ${ms} ms`)), ms);
    timer.unref();
  });
  return Promise.race([work, timeout]).finally(() => clearTimeout(timer));
}

export interface AppOptions {
  /** Set by the shutdown handler: while draining, /readyz answers 503 so the platform stops routing here. */
  lifecycle?: { readonly draining: boolean };
  readinessTimeoutMs?: number;
}

export function createApp(ctx: AppContext, options: AppOptions = {}) {
  const app = express();
  app.disable("x-powered-by");
  app.set("trust proxy", ctx.config.trustProxy);
  app.set("etag", false);

  app.use(edgeTrust(ctx.config.security.edgeSecret));
  app.use(correlation);
  app.use(
    pinoHttp({
      logger: ctx.log,
      genReqId: (req) => (req as express.Request).correlationId ?? "",
      autoLogging: { ignore: (req) => req.url === "/healthz" || req.url === "/readyz" },
      serializers: {
        req: (req) => ({ id: req.id, method: req.method, url: req.url }),
        res: (res) => ({ statusCode: res.statusCode }),
      },
    }),
  );
  app.use(
    helmet({
      contentSecurityPolicy: { directives: { defaultSrc: ["'none'"], frameAncestors: ["'none'"] } },
      crossOriginResourcePolicy: { policy: "same-site" },
    }),
  );

  // CORS is closed by default: the web app reaches the API through a same-origin proxy.
  app.use((req, res, next) => {
    const origin = req.get("origin");
    if (origin && ctx.config.corsOrigins.includes(origin)) {
      res.setHeader("Access-Control-Allow-Origin", origin);
      res.setHeader("Access-Control-Allow-Credentials", "true");
      res.setHeader("Vary", "Origin");
      if (req.method === "OPTIONS") {
        res.setHeader("Access-Control-Allow-Methods", "GET,POST,PUT");
        res.setHeader("Access-Control-Allow-Headers", "Content-Type,X-Requested-With,Idempotency-Key,X-Correlation-Id");
        res.setHeader("Access-Control-Max-Age", "600");
        return void res.status(204).end();
      }
    }
    next();
  });

  app.get("/healthz", (_req, res) => {
    res.json({ status: "ok" });
  });
  app.get("/readyz", async (_req, res) => {
    res.setHeader("Cache-Control", "no-store");
    if (options.lifecycle?.draining) return void res.status(503).json({ status: "draining" });
    try {
      const timeoutMs = options.readinessTimeoutMs ?? READINESS_TIMEOUT_MS;
      await withinTimeout(ctx.database.ping(), timeoutMs);
      // The sweeper's liveness is reported, never a reason to fail the probe (that would restart a
      // healthy API); an external uptime check can alert on `"sweeper":"stale"`.
      const sweeper = await withinTimeout(sweeperHealth(ctx), timeoutMs).catch(() => null);
      const sweep = { sweeper: sweeper?.status ?? "unknown", last_sweep_age_seconds: sweeper?.last_sweep_age_seconds ?? null };
      // In production the probe says only whether the API can serve; which integrations are
      // configured is not advertised to unauthenticated callers.
      if (ctx.config.env === "production") return void res.json({ status: "ready", ...sweep });
      res.json({
        status: "ready",
        database: ctx.database.driver,
        paypal: ctx.paypal.configured,
        channel3: ctx.channel3.enabled,
        ai: ctx.openai.enabled,
        ...sweep,
      });
    } catch {
      res.status(503).json({ status: "unavailable" });
    }
  });

  const api = Router();
  // Webhooks authenticate by signature and need the raw body, so they precede JSON parsing.
  // They get their own limiter and local header checks, which run before any call to PayPal.
  api.use("/webhooks/paypal", paypalWebhookLimiter(ctx), paypalWebhookGuard(ctx), paypalWebhookVerifyCap(ctx));
  api.use(webhookRoutes(ctx));
  api.use(json({ limit: "100kb" }));
  api.use(cookieParser());
  api.use(
    rateLimit({
      windowMs: 60_000,
      ...limiterStore(ctx, "api"),
      limit: ctx.config.rateLimits.perMinute,
      standardHeaders: "draft-8",
      legacyHeaders: false,
      message: { error: { code: "RATE_LIMITED", message: "Too many requests. Try again shortly." } },
    }),
  );
  api.use(csrfGuard);
  api.use(authRoutes(ctx));

  const authed = Router();
  authed.use(sessionAuth(ctx));
  authed.use((_req, res, next) => {
    res.setHeader("Cache-Control", "no-store");
    next();
  });
  authed.use(inventoryRoutes(ctx));
  authed.use(supplierRoutes(ctx));
  authed.use(memberRoutes(ctx));
  authed.use(procurementRoutes(ctx));
  authed.use(intentAndPaymentRoutes(ctx));
  authed.use(operationsRoutes(ctx));
  authed.use(monitoringRoutes(ctx));
  api.use(authed);

  app.use("/api/v1", api);
  app.use((_req, _res, next) => next(notFound("Route")));
  app.use(errorHandler(ctx.log, (e) => void ctx.errors.capture({ source: "api", ...e })));
  return app;
}
