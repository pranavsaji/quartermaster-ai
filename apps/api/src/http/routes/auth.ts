import { Router } from "express";
import rateLimit from "express-rate-limit";
import { LoginRequest, type PublicConfig } from "@qm/contracts";
import { PAYPAL_SDK_URL } from "@qm/payments";
import type { AppContext } from "../../context";
import { login, logout, sessionUser } from "../../services/auth";
import { sessionAuth } from "../middleware/auth";
import { asyncHandler, parse } from "../middleware/errors";

export function authRoutes(ctx: AppContext): Router {
  const r = Router();
  const cookie = ctx.config.session;

  const loginLimiter = rateLimit({
    windowMs: 15 * 60_000,
    limit: ctx.config.env === "test" ? 1000 : 20,
    standardHeaders: "draft-8",
    legacyHeaders: false,
    message: { error: { code: "RATE_LIMITED", message: "Too many sign-in attempts. Try again later." } },
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
    loginLimiter,
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
