import { randomBytes, sign, verify, type KeyObject } from "node:crypto";
import type { CertificateVerificationStatus, IntentCertificatePayload } from "@qm/contracts";
import { canonicalize } from "../canonical";
import { keyIdMatchesKey, type SigningKey } from "./keys";

export const CERTIFICATE_DOMAIN = "trustrail.intent-certificate.v1";
export const MAX_CERTIFICATE_TTL_MINUTES = 60;
/**
 * A 64-byte Ed25519 signature in unpadded base64url is exactly 86 characters, and the last one
 * carries only 2 significant bits, so it must be one of A, Q, g or w; anything else would be a
 * second spelling of the same bytes.
 */
const ED25519_SIGNATURE_RE = /^[A-Za-z0-9_-]{85}[AQgw]$/;
/** Clock skew tolerated before `approved_at` (the certificate's not-before time). */
export const CERTIFICATE_CLOCK_SKEW_MS = 60_000;

export interface IssueCertificateInput {
  intent_id: string;
  organization_id: string;
  buyer_id: string;
  purchase_order_id: string;
  supplier_id: string;
  cart_hash: string;
  mandate_id: string;
  mandate_version: number;
  policy_decision_id: string;
  currency: string;
  approved_amount_minor: number;
  approved_at: Date;
  ttl_minutes: number;
}

export interface SignedCertificate {
  payload: IntentCertificatePayload;
  signature: string;
  key_id: string;
  algorithm: "Ed25519";
}

/** Domain-separated signing input, so a certificate signature can never be replayed as anything else. */
export function signingInput(payload: IntentCertificatePayload): Buffer {
  return Buffer.from(`${CERTIFICATE_DOMAIN}\n${canonicalize(payload)}`, "utf8");
}

export function issueCertificate(input: IssueCertificateInput, key: SigningKey): SignedCertificate {
  if (!Number.isSafeInteger(input.approved_amount_minor) || input.approved_amount_minor <= 0) {
    throw new Error("Approved amount must be a positive integer in minor units");
  }
  if (!Number.isInteger(input.ttl_minutes) || input.ttl_minutes < 1 || input.ttl_minutes > MAX_CERTIFICATE_TTL_MINUTES) {
    throw new Error(`Certificate TTL must be a whole number of minutes between 1 and ${MAX_CERTIFICATE_TTL_MINUTES}`);
  }
  if (!(input.approved_at instanceof Date) || Number.isNaN(input.approved_at.getTime()))
    throw new Error("Certificate approval time is invalid");
  const expires = new Date(input.approved_at.getTime() + input.ttl_minutes * 60_000);
  const payload: IntentCertificatePayload = {
    certificate_version: 1,
    intent_id: input.intent_id,
    organization_id: input.organization_id,
    buyer_id: input.buyer_id,
    purchase_order_id: input.purchase_order_id,
    supplier_id: input.supplier_id,
    cart_hash: input.cart_hash,
    mandate_id: input.mandate_id,
    mandate_version: input.mandate_version,
    policy_decision_id: input.policy_decision_id,
    currency: input.currency,
    approved_amount_minor: input.approved_amount_minor,
    approved_at: input.approved_at.toISOString(),
    expires_at: expires.toISOString(),
    nonce: randomBytes(16).toString("hex"),
    key_id: key.key_id,
  };
  const signature = sign(null, signingInput(payload), key.private_key).toString("base64url");
  return { payload, signature, key_id: key.key_id, algorithm: "Ed25519" };
}

export interface VerificationContext {
  /** Hash recomputed from the persisted cart snapshot right now. */
  current_cart_hash: string;
  /** Total recomputed from the persisted cart snapshot right now. */
  current_total_minor: number;
  current_currency: string;
  /** Persisted certificate lifecycle status. */
  stored_status: "ACTIVE" | "CONSUMED" | "REVOKED" | "EXPIRED";
  revoked_reason?: string | null;
  /** Public keys known to TrustRail, by key id (supports rotation). */
  resolve_public_key: (keyId: string) => KeyObject | null;
  /** Expected bindings from the persisted records. */
  expected: {
    intent_id: string;
    organization_id: string;
    purchase_order_id: string;
    supplier_id: string;
  };
  now: Date;
  /** CONSUMED certificates are still cryptographically valid; callers decide whether that is acceptable. */
  allow_consumed?: boolean;
}

export interface VerificationResult {
  status: CertificateVerificationStatus;
  valid: boolean;
  checks: { code: string; passed: boolean; detail: string }[];
}

export function verifyCertificate(cert: SignedCertificate, ctx: VerificationContext): VerificationResult {
  const checks: VerificationResult["checks"] = [];
  let status: CertificateVerificationStatus = "VALID";
  const fail = (s: CertificateVerificationStatus) => {
    if (status === "VALID") status = s;
  };

  const key = ctx.resolve_public_key(cert.key_id);
  const keyMatches = cert.payload.key_id === cert.key_id;
  const keyBound = !!key && keyIdMatchesKey(cert.key_id, key);
  if (!key || !keyMatches || !keyBound) {
    checks.push({
      code: "KEY_KNOWN",
      passed: false,
      detail: !key
        ? `Unknown signing key ${cert.key_id}.`
        : !keyMatches
          ? "Key id in payload differs from envelope."
          : `Key ${cert.key_id} is not the fingerprint of the resolved public key.`,
    });
    fail("UNKNOWN_KEY");
  } else {
    checks.push({ code: "KEY_KNOWN", passed: true, detail: `Signed by ${cert.key_id}.` });
    let sigOk = false;
    // Node's base64url decoder silently skips invalid characters, so several distinct strings
    // decode to the same bytes. Only the one canonical unpadded encoding of 64 bytes is accepted.
    const encodingOk = typeof cert.signature === "string" && ED25519_SIGNATURE_RE.test(cert.signature);
    try {
      sigOk =
        encodingOk &&
        cert.algorithm === "Ed25519" &&
        key.asymmetricKeyType === "ed25519" &&
        verify(null, signingInput(cert.payload), key, Buffer.from(cert.signature, "base64url"));
    } catch {
      sigOk = false;
    }
    checks.push({
      code: "SIGNATURE",
      passed: sigOk,
      detail: sigOk
        ? "Ed25519 signature is valid."
        : !encodingOk
          ? "Signature is not a canonical base64url Ed25519 signature."
          : "Signature does not verify.",
    });
    if (!sigOk) fail("SIGNATURE_INVALID");
  }

  const p = cert.payload;
  const bindingsOk =
    p.certificate_version === 1 &&
    p.intent_id === ctx.expected.intent_id &&
    p.organization_id === ctx.expected.organization_id &&
    p.purchase_order_id === ctx.expected.purchase_order_id &&
    p.supplier_id === ctx.expected.supplier_id;
  checks.push({
    code: "BINDINGS",
    passed: bindingsOk,
    detail: bindingsOk ? "Certificate is bound to this order, supplier and organization." : "Certificate bindings do not match the order.",
  });
  if (!bindingsOk) fail("PAYLOAD_MISMATCH");

  const cartOk = p.cart_hash === ctx.current_cart_hash;
  checks.push({
    code: "CART_HASH",
    passed: cartOk,
    detail: cartOk ? "Cart is unchanged since approval." : "Cart contents changed after approval.",
  });
  const amountOk = p.approved_amount_minor === ctx.current_total_minor && p.currency === ctx.current_currency;
  checks.push({
    code: "AMOUNT",
    passed: amountOk,
    detail: amountOk ? "Amount and currency match the approval." : "Amount or currency differs from the approval.",
  });
  if (!cartOk || !amountOk) fail("CART_MODIFIED");

  // Validity window [approved_at − skew, expires_at). Every comparison is written so that a
  // NaN (unparseable timestamp or invalid clock) fails closed.
  const now = ctx.now instanceof Date ? ctx.now.getTime() : Number.NaN;
  const approvedAt = Date.parse(p.approved_at);
  const expiresAt = Date.parse(p.expires_at);
  const windowOk = expiresAt > approvedAt && expiresAt - approvedAt <= MAX_CERTIFICATE_TTL_MINUTES * 60_000;
  checks.push({
    code: "VALIDITY_WINDOW",
    passed: windowOk,
    detail: windowOk ? "Approval and expiry times are well-formed." : "Approval or expiry time is malformed.",
  });
  if (!windowOk) fail("PAYLOAD_MISMATCH");
  const notYetValid = !(now >= approvedAt - CERTIFICATE_CLOCK_SKEW_MS);
  checks.push({
    code: "NOT_BEFORE",
    passed: !notYetValid,
    detail: notYetValid ? `Not valid before ${p.approved_at}.` : "Certificate is within its validity period.",
  });
  if (notYetValid) fail("PAYLOAD_MISMATCH");
  const expired = !(now < expiresAt);
  checks.push({ code: "NOT_EXPIRED", passed: !expired, detail: expired ? `Expired at ${p.expires_at}.` : `Valid until ${p.expires_at}.` });

  if (ctx.stored_status === "REVOKED") {
    checks.push({ code: "NOT_REVOKED", passed: false, detail: `Revoked: ${ctx.revoked_reason ?? "no reason recorded"}.` });
    fail(ctx.revoked_reason?.startsWith("MANDATE") ? "MANDATE_CHANGED" : "REVOKED");
  } else if (ctx.stored_status === "CONSUMED") {
    checks.push({ code: "NOT_CONSUMED", passed: !!ctx.allow_consumed, detail: "Certificate has already authorised a payment." });
    if (!ctx.allow_consumed) fail("CONSUMED");
  } else if (ctx.stored_status === "EXPIRED") {
    checks.push({ code: "NOT_EXPIRED_STORED", passed: false, detail: "Certificate was marked expired." });
    fail("EXPIRED");
  } else if (ctx.stored_status === "ACTIVE") {
    checks.push({ code: "NOT_REVOKED", passed: true, detail: "Certificate is active." });
  } else {
    // Fail closed on any status this code does not understand.
    checks.push({ code: "STATUS_KNOWN", passed: false, detail: `Unrecognised certificate status ${String(ctx.stored_status)}.` });
    fail("REVOKED");
  }
  if (expired && ctx.stored_status !== "CONSUMED") fail("EXPIRED");

  return { status, valid: status === "VALID", checks };
}
