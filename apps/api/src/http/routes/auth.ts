import { Router } from "express";
import rateLimit, { ipKeyGenerator } from "express-rate-limit";
import { LoginRequest, type PublicConfig } from "@qm/contracts";
import { PAYPAL_SDK_URL } from "@qm/payments";
import type { AppContext } from "../../context";
import { login, logout, sessionUser } from "../../services/auth";
import { sessionAuth } from "../middleware/auth";
import { asyncHandler, parse } from "../middleware/errors";

/** Normalised email for rate-limit keys; malformed bodies share one bucket per IP. */
export function loginEmailKey(body: unknown): string {
  const email = (body as { email?: unknown } | null | undefined)?.email;
  return typeof email === "string" ? email.trim().toLowerCase().slice(0, 254) : "";
}

export function authRoutes(ctx: AppContext): Router {
  const r = Router();
  const cookie = ctx.config.session;

  // Two buckets: per client IP + email (so one attacker cannot exhaust everyone's sign-ins from
  // a shared address) and a looser per-IP cap against spraying many addresses. Both rely on
  // `req.ip` being the real client, which needs TRUST_PROXY set to match the deployment.
  const limited = { error: { code: "RATE_LIMITED", message: "Too many sign-in attempts. Try again later." } };
  const loginPerAccount = rateLimit({
    windowMs: 15 * 60_000,
    limit: ctx.config.rateLimits.loginPerAccount,
    standardHeaders: "draft-8",
    legacyHeaders: false,
    keyGenerator: (req) => `${ipKeyGenerator(req.ip ?? "")}|${loginEmailKey(req.body)}`,
    message: limited,
  });
  const loginPerIp = rateLimit({
    windowMs: 15 * 60_000,
    limit: ctx.config.rateLimits.loginPerIp,
    standardHeaders: false,
    legacyHeaders: false,
    message: limited,
  });

  r.get(
    "/config/public",
    asyncHandler(async (_req, res) => {
      const body: PublicConfig = {
        environment: ctx.config.env,
        paypal: {
          enabled: ctx.paypal.configured,
          client_id: ctx.config.paypal.clientId,
          sdk_url: PAYPAL_SDK_URL[ctx.config.paypal.environment],
          environment: ctx.config.paypal.environment,
        },
        market_data: { provider: "channel3", enabled: ctx.channel3.enabled },
        ai: { enabled: ctx.openai.enabled, mode: ctx.openai.enabled ? "LLM" : "DETERMINISTIC_FALLBACK" },
      };
      res.json(body);
    }),
  );

  r.post(
    "/auth/login",
    loginPerIp,
    loginPerAccount,
    asyncHandler(async (req, res) => {
      const body = parse(LoginRequest, req.body);
      const { token, expiresAt, user } = await login(ctx, body.email, body.password, { ip: req.ip, userAgent: req.get("user-agent") });
      res.cookie(cookie.cookieName, token, {
        httpOnly: true,
        secure: cookie.cookieSecure,
        sameSite: "lax",
        path: "/",
        expires: expiresAt,
      });
      res.json({ user });
    }),
  );

  r.post(
    "/auth/logout",
    sessionAuth(ctx),
    asyncHandler(async (req, res) => {
      await logout(ctx, req.user!.sessionId);
      res.clearCookie(cookie.cookieName, { httpOnly: true, secure: cookie.cookieSecure, sameSite: "lax", path: "/" });
      res.status(204).end();
    }),
  );

  r.get(
    "/auth/me",
    sessionAuth(ctx),
    asyncHandler(async (req, res) => {
      res.json({ user: await sessionUser(ctx, req.user!.id, req.user!.organizationId) });
    }),
  );

  return r;
}
