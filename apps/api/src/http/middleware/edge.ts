import { createHash, timingSafeEqual } from "node:crypto";
import type { RequestHandler } from "express";

/** Header the web app's proxy (apps/web/proxy.ts) adds to every request it forwards to the API. */
export const EDGE_HEADER = "x-qm-edge";

const digest = (value: string) => createHash("sha256").update(value).digest();

/** Constant-time comparison of a presented edge secret with the configured one. */
export function edgeSecretMatches(presented: string | undefined, secret: string): boolean {
  if (presented === undefined || presented.length > 512) return false;
  return timingSafeEqual(digest(presented), digest(secret));
}

/**
 * Forwarded client addresses are only as trustworthy as whoever set X-Forwarded-For. When the API
 * host is reachable directly (not only through the web app), anyone can send that header, and
 * with TRUST_PROXY set every per-IP limit would key on an address the caller chose.
 *
 * With EDGE_SECRET configured, a request believes X-Forwarded-For (as TRUST_PROXY allows) only
 * when it carries the web proxy's `X-QM-Edge` secret; every other request (direct callers, PayPal
 * webhooks) is keyed on its socket peer address. Without EDGE_SECRET nothing changes. Runs first,
 * so the request scope, logs and every limiter see the same address. The header is removed so it
 * never reaches logs or handlers.
 */
export function edgeTrust(secret: string | null): RequestHandler {
  if (!secret) return (_req, _res, next) => next();
  return (req, _res, next) => {
    const trusted = edgeSecretMatches(req.get(EDGE_HEADER), secret);
    delete req.headers[EDGE_HEADER];
    if (!trusted) {
      const peer = req.socket.remoteAddress;
      Object.defineProperty(req, "ip", { configurable: true, enumerable: true, value: peer });
      Object.defineProperty(req, "ips", { configurable: true, enumerable: true, value: [] });
    }
    next();
  };
}
