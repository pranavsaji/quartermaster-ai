import { sign, verify } from "node:crypto";
import { describe, expect, it } from "vitest";
import {
  canonicalize,
  generateSigningKey,
  issueCertificate,
  keyIdMatchesKey,
  loadSigningKey,
  signingInput,
  verifyCertificate,
  type SignedCertificate,
  type VerificationContext,
} from "@qm/trustrail";

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
    const c = issueCertificate({ ...issue().payload, approved_at: approvedAt, ttl_minutes: 15 } as never, other);
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

  describe("key ids and rotation", () => {
    it("rejects a certificate whose envelope key id differs from the signed payload's", () => {
      const c = issue();
      const r = verifyCertificate({ ...c, key_id: "trk_other" }, ctx(c, { resolve_public_key: () => key.public_key }));
      expect(r.status).toBe("UNKNOWN_KEY");
      expect(r.checks.find((x) => x.code === "KEY_KNOWN")?.detail).toMatch(/differs from envelope/);
    });

    it("verifies certificates signed by a rotated-out key, resolved by its id", () => {
      const oldKey = generateSigningKey();
      const newKey = generateSigningKey();
      const registry = new Map([
        [oldKey.key_id, oldKey.public_key],
        [newKey.key_id, newKey.public_key],
      ]);
      const resolve = (id: string) => registry.get(id) ?? null;
      const old = issueCertificate({ ...issue().payload, approved_at: approvedAt, ttl_minutes: 15 } as never, oldKey);
      const fresh = issueCertificate({ ...issue().payload, approved_at: approvedAt, ttl_minutes: 15 } as never, newKey);
      expect(verifyCertificate(old, ctx(old, { resolve_public_key: resolve })).status).toBe("VALID");
      expect(verifyCertificate(fresh, ctx(fresh, { resolve_public_key: resolve })).status).toBe("VALID");
      // Swapping in the other key's id fails: the signature no longer matches the resolved key.
      const swapped = { ...old, key_id: newKey.key_id, payload: { ...old.payload, key_id: newKey.key_id } };
      expect(verifyCertificate(swapped, ctx(swapped, { resolve_public_key: resolve })).valid).toBe(false);
    });

    it("binds fingerprint-shaped key ids to the key they name", () => {
      const a = generateSigningKey();
      const b = generateSigningKey();
      expect(a.key_id).toMatch(/^trk_[0-9a-f]{16}$/);
      expect(keyIdMatchesKey(a.key_id, a.public_key)).toBe(true);
      expect(keyIdMatchesKey(a.key_id, b.public_key)).toBe(false);
      expect(keyIdMatchesKey("trk_test", b.public_key)).toBe(true); // custom ids are registry-bound
      // A registry that maps a's fingerprint to b's key cannot validate anything b signed as "a".
      const forgedIssuer = { ...b, key_id: a.key_id };
      const c = issueCertificate({ ...issue().payload, approved_at: approvedAt, ttl_minutes: 15 } as never, forgedIssuer);
      const r = verifyCertificate(c, ctx(c, { resolve_public_key: (id) => (id === a.key_id ? b.public_key : null) }));
      expect(r.status).toBe("UNKNOWN_KEY");
      expect(r.checks.find((x) => x.code === "KEY_KNOWN")?.detail).toMatch(/not the fingerprint/);
    });

    it("refuses to load a key under another key's fingerprint", () => {
      const a = generateSigningKey();
      const b = generateSigningKey();
      expect(() => loadSigningKey(b.private_key_pem, a.key_id)).toThrow(/fingerprint/);
      expect(() => generateSigningKey("trk_0000000000000000")).toThrow(/fingerprint/);
      expect(loadSigningKey(b.private_key_pem, b.key_id).key_id).toBe(b.key_id);
      expect(loadSigningKey(b.private_key_pem, "prod-2026").key_id).toBe("prod-2026");
    });
  });

  it("detects a currency-only change after approval", () => {
    const c = issue();
    const r = verifyCertificate(c, ctx(c, { current_currency: "EUR" }));
    expect(r.status).toBe("CART_MODIFIED");
    expect(r.checks.find((x) => x.code === "AMOUNT")?.passed).toBe(false);
    expect(r.checks.find((x) => x.code === "CART_HASH")?.passed).toBe(true);
  });

  describe("signature encoding and algorithm", () => {
    it("accepts only the canonical base64url encoding of the signature", () => {
      const c = issue();
      expect(c.signature).toMatch(/^[A-Za-z0-9_-]{86}$/);
      const variants = [
        `${c.signature}=`, // padding
        `${c.signature}==`,
        `${c.signature.slice(0, 40)}!${c.signature.slice(40)}`, // junk char Node would skip
        `${c.signature.slice(0, 40)} ${c.signature.slice(40)}`,
        c.signature.replace(/-/g, "+").replace(/_/g, "/"), // standard alphabet (skipped below if identical)
        c.signature.slice(0, -1), // truncated
        `${c.signature.slice(0, -1)}${{ A: "B", Q: "R", g: "h", w: "x" }[c.signature.at(-1)!]}`, // same bytes, non-canonical tail bits
      ];
      for (const signature of variants.filter((v) => v !== c.signature)) {
        const r = verifyCertificate({ ...c, signature }, ctx(c));
        expect([signature, r.status]).toEqual([signature, "SIGNATURE_INVALID"]);
      }
    });

    it("rejects a non-Ed25519 algorithm label even with a valid signature", () => {
      const c = issue();
      expect(verifyCertificate({ ...c, algorithm: "RS256" as never }, ctx(c)).status).toBe("SIGNATURE_INVALID");
    });

    it("rejects a non-string signature without throwing", () => {
      const c = issue();
      expect(verifyCertificate({ ...c, signature: 42 as never }, ctx(c)).status).toBe("SIGNATURE_INVALID");
    });
  });

  describe("validity window", () => {
    /** Re-signs a modified payload with the real key, as a compromised issuer bug might. */
    const resign = (payload: SignedCertificate["payload"]): SignedCertificate => ({
      payload,
      signature: sign(null, signingInput(payload), key.private_key).toString("base64url"),
      key_id: key.key_id,
      algorithm: "Ed25519",
    });

    it("is not valid before its approval time (beyond a small clock skew)", () => {
      const c = issue();
      const early = verifyCertificate(c, ctx(c, { now: new Date("2026-11-10T17:00:00Z") }));
      expect(early.valid).toBe(false);
      expect(early.status).toBe("PAYLOAD_MISMATCH");
      expect(early.checks.find((x) => x.code === "NOT_BEFORE")?.passed).toBe(false);
      expect(verifyCertificate(c, ctx(c, { now: new Date("2026-11-10T17:59:30Z") })).valid).toBe(true);
    });

    it("fails closed on an unparseable expiry", () => {
      const c = resign({ ...issue().payload, expires_at: "never" });
      const r = verifyCertificate(c, ctx(c));
      expect(r.valid).toBe(false);
      expect(r.checks.find((x) => x.code === "NOT_EXPIRED")?.passed).toBe(false);
      expect(r.checks.find((x) => x.code === "VALIDITY_WINDOW")?.passed).toBe(false);
    });

    it("fails closed on an unparseable approval time or an invalid clock", () => {
      const c = resign({ ...issue().payload, approved_at: "yesterday" });
      expect(verifyCertificate(c, ctx(c)).valid).toBe(false);
      const ok = issue();
      expect(verifyCertificate(ok, ctx(ok, { now: new Date(Number.NaN) })).valid).toBe(false);
    });

    it("rejects a window longer than the maximum TTL", () => {
      const c = resign({ ...issue().payload, expires_at: "2026-11-11T18:00:00.000Z" });
      expect(verifyCertificate(c, ctx(c)).status).toBe("PAYLOAD_MISMATCH");
    });
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
    const c = issue();
    expect(signingInput(c.payload).toString("utf8")).toBe(`trustrail.intent-certificate.v1\n${canonicalize(c.payload)}`);
    // The signature does not verify over the bare canonical payload…
    expect(verify(null, Buffer.from(canonicalize(c.payload), "utf8"), key.public_key, Buffer.from(c.signature, "base64url"))).toBe(false);
    // …and a signature over the bare payload is not accepted as a certificate signature.
    const bare = sign(null, Buffer.from(canonicalize(c.payload), "utf8"), key.private_key).toString("base64url");
    expect(verifyCertificate({ ...c, signature: bare }, ctx(c)).status).toBe("SIGNATURE_INVALID");
  });

  it("refuses non-positive amounts and out-of-range TTLs", () => {
    expect(() => issue({ approved_amount_minor: 0 })).toThrow();
    expect(() => issue({ ttl_minutes: 120 })).toThrow();
  });

  it.each([Number.NaN, 0.5, 15.5, 0, 61, -1, Number.POSITIVE_INFINITY])("refuses a TTL of %s minutes", (ttl) => {
    expect(() => issue({ ttl_minutes: ttl })).toThrow(/whole number of minutes/);
  });

  it("accepts the TTL bounds and refuses an invalid approval time", () => {
    expect(issue({ ttl_minutes: 1 }).payload.expires_at).toBe("2026-11-10T18:01:00.000Z");
    expect(issue({ ttl_minutes: 60 }).payload.expires_at).toBe("2026-11-10T19:00:00.000Z");
    expect(() => issue({ approved_at: new Date(Number.NaN) })).toThrow(/approval time/);
  });

  it("loads base64-encoded PEM keys and derives stable fingerprints", () => {
    const g = generateSigningKey();
    const loaded = loadSigningKey(Buffer.from(g.private_key_pem).toString("base64"));
    expect(loaded.key_id).toBe(g.key_id);
    expect(loaded.public_key_pem).toBe(g.public_key_pem);
  });
});
