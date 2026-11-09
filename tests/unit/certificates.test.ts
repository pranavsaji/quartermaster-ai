import { describe, expect, it } from "vitest";
import { generateSigningKey, issueCertificate, loadSigningKey, signingInput, verifyCertificate, type SignedCertificate, type VerificationContext } from "@qm/trustrail";

const key = generateSigningKey("trk_test");
const approvedAt = new Date("2026-11-10T18:00:00Z");

function issue(overrides: Partial<Parameters<typeof issueCertificate>[0]> = {}) {
  return issueCertificate(
    {
      intent_id: "intent_1",
      organization_id: "org_1",
      buyer_id: "owner_1",
      purchase_order_id: "po_1",
      supplier_id: "sup_1",
      cart_hash: "sha256:" + "a".repeat(64),
      mandate_id: "m_1",
      mandate_version: 1,
      policy_decision_id: "pd_1",
      currency: "USD",
      approved_amount_minor: 8_000,
      approved_at: approvedAt,
      ttl_minutes: 15,
      ...overrides,
    },
    key,
  );
}

function ctx(cert: SignedCertificate, overrides: Partial<VerificationContext> = {}): VerificationContext {
  return {
    current_cart_hash: cert.payload.cart_hash,
    current_total_minor: cert.payload.approved_amount_minor,
    current_currency: cert.payload.currency,
    stored_status: "ACTIVE",
    resolve_public_key: (id) => (id === key.key_id ? key.public_key : null),
    expected: { intent_id: "intent_1", organization_id: "org_1", purchase_order_id: "po_1", supplier_id: "sup_1" },
    now: new Date("2026-11-10T18:05:00Z"),
    ...overrides,
  };
}

describe("Intent Certificates", () => {
  it("issues a certificate bound to the exact approval", () => {
    const c = issue();
    expect(c.payload.expires_at).toBe("2026-11-10T18:15:00.000Z");
    expect(c.payload.key_id).toBe("trk_test");
    expect(c.payload.nonce).toMatch(/^[a-f0-9]{32}$/);
    expect(verifyCertificate(c, ctx(c))).toMatchObject({ valid: true, status: "VALID" });
  });

  it("uses a fresh nonce for every certificate", () => {
    expect(issue().payload.nonce).not.toBe(issue().payload.nonce);
  });

  it("detects a cart change after approval", () => {
    const c = issue();
    expect(verifyCertificate(c, ctx(c, { current_cart_hash: "sha256:" + "b".repeat(64) })).status).toBe("CART_MODIFIED");
  });

  it("detects an amount change after approval", () => {
    const c = issue();
    expect(verifyCertificate(c, ctx(c, { current_total_minor: 8_001 })).status).toBe("CART_MODIFIED");
  });

  it("rejects a tampered payload", () => {
    const c = issue();
    const forged: SignedCertificate = { ...c, payload: { ...c.payload, approved_amount_minor: 80_000 } };
    expect(verifyCertificate(forged, ctx(forged)).status).toBe("SIGNATURE_INVALID");
  });

  it("rejects a signature from another key", () => {
    const other = generateSigningKey("trk_test");
    const c = issueCertificate({ ...issue().payload, approved_at: approvedAt, ttl_minutes: 15 }, other);
    expect(verifyCertificate(c, ctx(c)).status).toBe("SIGNATURE_INVALID");
  });

  it("rejects unknown key ids", () => {
    const c = issue();
    expect(verifyCertificate(c, ctx(c, { resolve_public_key: () => null })).status).toBe("UNKNOWN_KEY");
  });

  it("rejects a certificate presented for a different order", () => {
    const c = issue();
    expect(verifyCertificate(c, ctx(c, { expected: { intent_id: "intent_1", organization_id: "org_1", purchase_order_id: "po_2", supplier_id: "sup_1" } })).status).toBe("PAYLOAD_MISMATCH");
  });

  it("expires at the stated time", () => {
    const c = issue();
    expect(verifyCertificate(c, ctx(c, { now: new Date("2026-11-10T18:15:00Z") })).status).toBe("EXPIRED");
  });

  it("rejects revoked certificates and reports mandate changes", () => {
    const c = issue();
    expect(verifyCertificate(c, ctx(c, { stored_status: "REVOKED", revoked_reason: "MANDATE_CHANGED: v2" })).status).toBe("MANDATE_CHANGED");
    expect(verifyCertificate(c, ctx(c, { stored_status: "REVOKED", revoked_reason: "PAYMENT_FAILED" })).status).toBe("REVOKED");
  });

  it("rejects a consumed certificate unless explicitly allowed", () => {
    const c = issue();
    expect(verifyCertificate(c, ctx(c, { stored_status: "CONSUMED" })).status).toBe("CONSUMED");
    expect(verifyCertificate(c, ctx(c, { stored_status: "CONSUMED", allow_consumed: true })).valid).toBe(true);
  });

  it("fails closed on unknown stored statuses", () => {
    const c = issue();
    expect(verifyCertificate(c, ctx(c, { stored_status: "WEIRD" as never })).valid).toBe(false);
  });

  it("domain-separates the signing input", () => {
    expect(signingInput(issue().payload).toString("utf8").startsWith("trustrail.intent-certificate.v1\n")).toBe(true);
  });

  it("refuses non-positive amounts and out-of-range TTLs", () => {
    expect(() => issue({ approved_amount_minor: 0 })).toThrow();
    expect(() => issue({ ttl_minutes: 120 })).toThrow();
  });

  it("loads base64-encoded PEM keys and derives stable fingerprints", () => {
    const g = generateSigningKey();
    const loaded = loadSigningKey(Buffer.from(g.private_key_pem).toString("base64"));
    expect(loaded.key_id).toBe(g.key_id);
    expect(loaded.public_key_pem).toBe(g.public_key_pem);
  });
});
