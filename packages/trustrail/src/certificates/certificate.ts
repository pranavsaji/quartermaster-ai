import { randomBytes, sign, verify, type KeyObject } from "node:crypto";
import type { CertificateVerificationStatus, IntentCertificatePayload } from "@qm/contracts";
import { canonicalize } from "../canonical";
import type { SigningKey } from "./keys";

export const CERTIFICATE_DOMAIN = "trustrail.intent-certificate.v1";

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
  if (input.ttl_minutes < 1 || input.ttl_minutes > 60) throw new Error("Certificate TTL must be 1–60 minutes");
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
  if (!key || !keyMatches) {
    checks.push({ code: "KEY_KNOWN", passed: false, detail: !key ? `Unknown signing key ${cert.key_id}.` : "Key id in payload differs from envelope." });
    fail("UNKNOWN_KEY");
  } else {
    checks.push({ code: "KEY_KNOWN", passed: true, detail: `Signed by ${cert.key_id}.` });
    let sigOk = false;
    try {
      sigOk = cert.algorithm === "Ed25519" && verify(null, signingInput(cert.payload), key, Buffer.from(cert.signature, "base64url"));
    } catch {
      sigOk = false;
    }
    checks.push({ code: "SIGNATURE", passed: sigOk, detail: sigOk ? "Ed25519 signature is valid." : "Signature does not verify." });
    if (!sigOk) fail("SIGNATURE_INVALID");
  }

  const p = cert.payload;
  const bindingsOk =
    p.certificate_version === 1 &&
    p.intent_id === ctx.expected.intent_id &&
    p.organization_id === ctx.expected.organization_id &&
    p.purchase_order_id === ctx.expected.purchase_order_id &&
    p.supplier_id === ctx.expected.supplier_id;
  checks.push({ code: "BINDINGS", passed: bindingsOk, detail: bindingsOk ? "Certificate is bound to this order, supplier and organization." : "Certificate bindings do not match the order." });
  if (!bindingsOk) fail("PAYLOAD_MISMATCH");

  const cartOk = p.cart_hash === ctx.current_cart_hash;
  checks.push({ code: "CART_HASH", passed: cartOk, detail: cartOk ? "Cart is unchanged since approval." : "Cart contents changed after approval." });
  const amountOk = p.approved_amount_minor === ctx.current_total_minor && p.currency === ctx.current_currency;
  checks.push({ code: "AMOUNT", passed: amountOk, detail: amountOk ? "Amount and currency match the approval." : "Amount or currency differs from the approval." });
  if (!cartOk || !amountOk) fail("CART_MODIFIED");

  const expired = ctx.now.getTime() >= Date.parse(p.expires_at);
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
