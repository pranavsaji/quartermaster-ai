import express, { Router, json } from "express";
import cookieParser from "cookie-parser";
import helmet from "helmet";
import rateLimit from "express-rate-limit";
import pinoHttp from "pino-http";
import type { AppContext } from "../context";
import { notFound } from "../errors";
import { sessionAuth } from "./middleware/auth";
import { errorHandler } from "./middleware/errors";
import { correlation, csrfGuard } from "./middleware/security";
import { paypalWebhookGuard, paypalWebhookLimiter } from "./middleware/webhooks";
import { authRoutes } from "./routes/auth";
import { inventoryRoutes } from "./routes/inventory";
import { operationsRoutes } from "./routes/operations";
import { intentAndPaymentRoutes, webhookRoutes } from "./routes/payments";
import { procurementRoutes } from "./routes/procurement";

export function createApp(ctx: AppContext) {
  const app = express();
  app.disable("x-powered-by");
  app.set("trust proxy", ctx.config.trustProxy);
  app.set("etag", false);

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
  app.use(helmet({ contentSecurityPolicy: { directives: { defaultSrc: ["'none'"], frameAncestors: ["'none'"] } }, crossOriginResourcePolicy: { policy: "same-site" } }));

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
        return res.status(204).end();
      }
    }
    next();
  });

  app.get("/healthz", (_req, res) => {
    res.json({ status: "ok" });
  });
  app.get("/readyz", async (_req, res) => {
    try {
      await ctx.database.ping();
      res.json({ status: "ready", database: ctx.database.driver, paypal: ctx.paypal.configured, channel3: ctx.channel3.enabled, ai: ctx.openai.enabled });
    } catch {
      res.status(503).json({ status: "unavailable" });
    }
  });

  const api = Router();
  // Webhooks authenticate by signature and need the raw body, so they precede JSON parsing.
  // They get their own limiter and local header checks, which run before any call to PayPal.
  api.use("/webhooks/paypal", paypalWebhookLimiter(ctx), paypalWebhookGuard(ctx));
  api.use(webhookRoutes(ctx));
  api.use(json({ limit: "100kb" }));
  api.use(cookieParser());
  api.use(
    rateLimit({
      windowMs: 60_000,
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
  authed.use(procurementRoutes(ctx));
  authed.use(intentAndPaymentRoutes(ctx));
  authed.use(operationsRoutes(ctx));
  api.use(authed);

  app.use("/api/v1", api);
  app.use((_req, _res, next) => next(notFound("Route")));
  app.use(errorHandler(ctx.log));
  return app;
}
