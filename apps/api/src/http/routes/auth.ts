import { Router, type Request, type Response } from "express";
import rateLimit, { ipKeyGenerator } from "express-rate-limit";
import {
  AcceptInvitationRequest,
  ChangePasswordRequest,
  ClientErrorReport,
  ForgotPasswordRequest,
  InvitationTokenRequest,
  LoginRequest,
  ResetPasswordRequest,
  SignupRequest,
  type PublicConfig,
} from "@qm/contracts";
import { PAYPAL_SDK_URL } from "@qm/payments";
import type { AppContext } from "../../context";
import { changePassword, requestPasswordReset, resetPassword, signup } from "../../services/accounts/accounts";
import { acceptInvitation, previewInvitation } from "../../services/accounts/members";
import { authenticate, login, logout, sessionUser } from "../../services/auth";
import { normalizePath } from "../../services/monitoring/tracker";
import { sessionAuth } from "../middleware/auth";
import { asyncHandler, parse } from "../middleware/errors";
import { limiterStore } from "../rate-limit-store";

/** Open browser-error groups before further reports share one overflow group. */
const MAX_OPEN_WEB_GROUPS = 100;

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
    ...limiterStore(ctx, "login-account"),
    limit: ctx.config.rateLimits.loginPerAccount,
    standardHeaders: "draft-8",
    legacyHeaders: false,
    keyGenerator: (req) => `${ipKeyGenerator(req.ip ?? "")}|${loginEmailKey(req.body)}`,
    message: limited,
  });
  const loginPerIp = rateLimit({
    windowMs: 15 * 60_000,
    ...limiterStore(ctx, "login-ip"),
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
        accounts: { signup_enabled: ctx.config.accounts.signupEnabled, email_enabled: ctx.mailer.enabled },
        sample_accounts_hint: ctx.config.accounts.sampleAccountsHint,
      };
      res.json(body);
    }),
  );

  const setSessionCookie = (res: Response, token: string, expiresAt: Date) =>
    res.cookie(cookie.cookieName, token, { httpOnly: true, secure: cookie.cookieSecure, sameSite: "lax", path: "/", expires: expiresAt });

  const hourly = (name: string, limit: number, keyGenerator?: (req: Request) => string) =>
    rateLimit({
      windowMs: 60 * 60_000,
      ...limiterStore(ctx, name),
      limit,
      standardHeaders: "draft-8",
      legacyHeaders: false,
      ...(keyGenerator ? { keyGenerator } : {}),
      message: { error: { code: "RATE_LIMITED", message: "Too many attempts. Try again later." } },
    });
  const test = ctx.config.env === "test";
  const signupLimiter = hourly("signup", ctx.config.accounts.signupPerHour);
  // Reset requests: per IP, and per address so one inbox cannot be flooded from many IPs.
  const forgotPerIp = hourly("forgot-ip", test ? 1000 : 10);
  const forgotPerEmail = hourly("forgot-email", test ? 1000 : 3, (req) => `email|${loginEmailKey(req.body)}`);
  // Token endpoints: links carry 256 random bits, so this only bounds wasted work.
  const tokenLimiter = hourly("link-token", test ? 1000 : 60);
  const clientErrorLimiter = rateLimit({
    windowMs: 60_000,
    ...limiterStore(ctx, "client-errors"),
    limit: test ? 1000 : 20,
    standardHeaders: false,
    legacyHeaders: false,
    message: { error: { code: "RATE_LIMITED", message: "Too many reports." } },
  });

  r.post(
    "/auth/signup",
    signupLimiter,
    asyncHandler(async (req, res) => {
      const body = parse(SignupRequest, req.body);
      const { token, expiresAt, user } = await signup(ctx, body, { ip: req.ip, userAgent: req.get("user-agent") });
      setSessionCookie(res, token, expiresAt);
      res.status(201).json({ user });
    }),
  );

  r.post(
    "/auth/password/forgot",
    forgotPerIp,
    forgotPerEmail,
    asyncHandler(async (req, res) => {
      const body = parse(ForgotPasswordRequest, req.body);
      // Answered before any lookup, so neither the response nor its timing reveals whether the
      // address has an account. The work continues in the background.
      res.status(202).json({ status: "sent" });
      void requestPasswordReset(ctx, body.email).catch((err: unknown) =>
        ctx.errors.capture({ source: "api", level: "error", code: "PASSWORD_RESET_FAILED", message: "Password reset request failed", err }),
      );
    }),
  );

  r.post(
    "/auth/password/reset",
    tokenLimiter,
    asyncHandler(async (req, res) => {
      await resetPassword(ctx, parse(ResetPasswordRequest, req.body));
      res.json({ status: "reset" });
    }),
  );

  r.post(
    "/invitations/lookup",
    tokenLimiter,
    asyncHandler(async (req, res) => {
      const { token } = parse(InvitationTokenRequest, req.body);
      res.json({ invitation: await previewInvitation(ctx, token) });
    }),
  );

  r.post(
    "/invitations/accept",
    tokenLimiter,
    asyncHandler(async (req, res) => {
      const body = parse(AcceptInvitationRequest, req.body);
      const { token, expiresAt, user } = await acceptInvitation(ctx, body, { ip: req.ip, userAgent: req.get("user-agent") });
      setSessionCookie(res, token, expiresAt);
      res.status(201).json({ user });
    }),
  );

  r.post(
    "/auth/password/change",
    sessionAuth(ctx),
    asyncHandler(async (req, res) => {
      const u = req.user!;
      await changePassword(
        ctx,
        { id: u.id, organizationId: u.organizationId, sessionId: u.sessionId },
        parse(ChangePasswordRequest, req.body),
      );
      res.json({ status: "changed" });
    }),
  );

  // Browser errors for error tracking. No session is needed (the sign-in page can fail too), and
  // sign-up is open, so a session is not a trust signal: reports are warnings (never alert),
  // grouped by page rather than free text, and spill into one overflow group once many are open.
  // Only operators' own reports are errors that alert.
  r.post(
    "/client-errors",
    clientErrorLimiter,
    asyncHandler(async (req, res) => {
      const report = parse(ClientErrorReport, req.body);
      const token = req.cookies?.[cookie.cookieName] as string | undefined;
      const user = token && token.length <= 200 ? await authenticate(ctx, token) : null;
      const trusted = Boolean(user?.operator);
      const route = trusted || (await ctx.errors.openGroups("web")) < MAX_OPEN_WEB_GROUPS ? normalizePath(report.path) : "(overflow)";
      await ctx.errors.capture({
        source: "web",
        level: trusted ? "error" : "warning",
        code: `web.${report.kind}`,
        message: report.message || "Unknown browser error",
        route,
        key: trusted ? undefined : route,
        correlationId: req.correlationId ?? null,
        context: { digest: report.digest ?? null, signed_in: Boolean(user), stack: report.stack?.slice(0, 2000) ?? null },
      });
      res.status(202).json({ status: "recorded" });
    }),
  );

  r.post(
    "/auth/login",
    loginPerIp,
    loginPerAccount,
    asyncHandler(async (req, res) => {
      const body = parse(LoginRequest, req.body);
      const { token, expiresAt, user } = await login(ctx, body.email, body.password, { ip: req.ip, userAgent: req.get("user-agent") });
      setSessionCookie(res, token, expiresAt);
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
