import { randomUUID } from "node:crypto";
import type { RequestHandler } from "express";
import { requestScope } from "../../context";
import { AppError } from "../../errors";

const CORRELATION = /^[\w.-]{8,64}$/;

/** Assigns a correlation id (accepting a well-formed inbound one) and opens the request scope. */
export const correlation: RequestHandler = (req, res, next) => {
  const inbound = req.get("x-correlation-id");
  const id = inbound && CORRELATION.test(inbound) ? inbound : randomUUID();
  req.correlationId = id;
  res.setHeader("x-correlation-id", id);
  requestScope.run({ correlationId: id, ip: req.ip, userAgent: req.get("user-agent") ?? undefined }, () => next());
};

/**
 * CSRF defence for cookie-authenticated mutations: require a custom header (which browsers
 * will not send cross-site without a CORS preflight) and a JSON content type. Combined with
 * SameSite=Lax cookies this blocks form- and image-based cross-site requests.
 */
export const csrfGuard: RequestHandler = (req, _res, next) => {
  if (["GET", "HEAD", "OPTIONS"].includes(req.method)) return next();
  if (req.get("x-requested-with") !== "quartermaster") {
    return next(new AppError(403, "CSRF_HEADER_MISSING", "Missing X-Requested-With header."));
  }
  const type = req.get("content-type") ?? "";
  if (req.headers["content-length"] && req.headers["content-length"] !== "0" && !type.startsWith("application/json")) {
    return next(new AppError(415, "UNSUPPORTED_MEDIA_TYPE", "Requests must be application/json."));
  }
  next();
};
