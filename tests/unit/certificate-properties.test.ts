import fc from "fast-check";
import { describe, expect, it } from "vitest";
import {
  buildCart,
  computeCartHash,
  generateSigningKey,
  issueCertificate,
  MAX_CERTIFICATE_TTL_MINUTES,
  verifyCertificate,
  type CartLine,
  type IssueCertificateInput,
  type SignedCertificate,
  type VerificationContext,
} from "@qm/trustrail";

/** Property tests: issue → verify round trip, and any change to the payload or cart invalidates. */
const key = generateSigningKey("trk_prop");
const RUNS = { numRuns: 150 };

const id = fc.stringMatching(/^[a-z0-9_-]{1,24}$/);
const issueInput = fc.record({
  intent_id: id,
  organization_id: id,
  buyer_id: id,
  purchase_order_id: id,
  supplier_id: id,
  cart_hash: fc.stringMatching(/^[a-f0-9]{64}$/).map((h) => `sha256:${h}`),
  mandate_id: id,
  mandate_version: fc.integer({ min: 1, max: 10_000 }),
  policy_decision_id: id,
  currency: fc.constantFrom("USD", "EUR", "JPY"),
  approved_amount_minor: fc.maxSafeNat().filter((n) => n > 0),
  approved_at: fc.date({ min: new Date("2020-01-01T00:00:00Z"), max: new Date("2040-01-01T00:00:00Z"), noInvalidDate: true }),
  ttl_minutes: fc.integer({ min: 1, max: MAX_CERTIFICATE_TTL_MINUTES }),
}) satisfies fc.Arbitrary<IssueCertificateInput>;

/** A context that matches the certificate, at a point strictly inside its validity window. */
function contextFor(input: IssueCertificateInput, _cert: SignedCertificate, offsetFraction: number): VerificationContext {
  const ttlMs = input.ttl_minutes * 60_000;
  return {
    current_cart_hash: input.cart_hash,
    current_total_minor: input.approved_amount_minor,
    current_currency: input.currency,
    stored_status: "ACTIVE",
    resolve_public_key: (k) => (k === key.key_id ? key.public_key : null),
    expected: {
      intent_id: input.intent_id,
      organization_id: input.organization_id,
      purchase_order_id: input.purchase_order_id,
      supplier_id: input.supplier_id,
    },
    now: new Date(input.approved_at.getTime() + Math.floor(ttlMs * offsetFraction)),
  };
}

/** A different value of the same JSON type. */
function mutate(value: unknown): unknown {
  if (typeof value === "number") return value === 1 ? 2 : value - 1;
  if (typeof value === "string") return value.length > 0 ? `${value.slice(0, -1)}${value.endsWith("x") ? "y" : "x"}` : "x";
  return null;
}

describe("property: intent certificates", () => {
  it("verifies every issued certificate as VALID within its window", () => {
    fc.assert(
      fc.property(issueInput, fc.double({ min: 0, max: 0.999, noNaN: true }), (input, at) => {
        const cert = issueCertificate(input, key);
        const r = verifyCertificate(cert, contextFor(input, cert, at));
        expect(r.status).toBe("VALID");
        expect(r.checks.every((c) => c.passed)).toBe(true);
      }),
      RUNS,
    );
  });

  it("rejects the certificate when any signed payload field is changed", () => {
    fc.assert(
      fc.property(issueInput, fc.nat(), (input, pick) => {
        const cert = issueCertificate(input, key);
        const fields = Object.keys(cert.payload) as (keyof typeof cert.payload)[];
        const field = fields[pick % fields.length]!;
        const payload = { ...cert.payload, [field]: mutate(cert.payload[field]) };
        const r = verifyCertificate({ ...cert, payload }, contextFor(input, cert, 0.5));
        expect(r.valid, `mutated ${field}`).toBe(false);
        expect(r.status).not.toBe("VALID");
      }),
      RUNS,
    );
  });

  it("rejects the certificate when the signature, key id or algorithm is changed", () => {
    fc.assert(
      fc.property(issueInput, fc.integer({ min: 0, max: 84 }), (input, pos) => {
        const cert = issueCertificate(input, key);
        const ch = cert.signature[pos] === "A" ? "B" : "A";
        const tampered = `${cert.signature.slice(0, pos)}${ch}${cert.signature.slice(pos + 1)}`;
        const ctx = contextFor(input, cert, 0.5);
        expect(verifyCertificate({ ...cert, signature: tampered }, ctx).status).toBe("SIGNATURE_INVALID");
        expect(verifyCertificate({ ...cert, key_id: "trk_other" }, ctx).valid).toBe(false);
        expect(verifyCertificate({ ...cert, algorithm: "HS256" as never }, ctx).valid).toBe(false);
      }),
      { numRuns: 50 },
    );
  });
});

const line = fc
  .record({
    sku: id,
    description: fc.string({ maxLength: 20 }),
    quantity: fc.integer({ min: 1, max: 50 }),
    unit_price_minor: fc.integer({ min: 0, max: 100_000 }),
  })
  .map((l): CartLine => ({
    kind: "PRODUCT",
    sku: l.sku,
    description: l.description,
    category: "food_packaging",
    quantity: l.quantity,
    unit_price_minor: l.unit_price_minor,
    line_total_minor: l.quantity * l.unit_price_minor,
  }));

/** Every way a persisted cart can differ from the approved one while still adding up. */
const cartChange = fc.constantFrom("quantity", "price", "sku", "description", "category", "recurring", "drop", "add", "supplier");
function changeCart(lines: CartLine[], change: string, i: number): { supplier: string; lines: CartLine[] } {
  const next = lines.map((l) => ({ ...l }));
  const target = next[i % next.length]!;
  switch (change) {
    case "quantity":
      target.quantity += 1;
      target.line_total_minor = target.quantity * target.unit_price_minor;
      break;
    case "price":
      target.unit_price_minor += 1;
      target.line_total_minor = target.quantity * target.unit_price_minor;
      break;
    case "sku":
      target.sku = `${target.sku}-2`;
      break;
    case "description":
      target.description = `${target.description}!`;
      break;
    case "category":
      target.category = "cleaning_supplies";
      break;
    case "recurring":
      target.recurring = true;
      break;
    case "drop":
      if (next.length > 1) next.splice(i % next.length, 1);
      else target.quantity += 1;
      break;
    case "add":
      next.push({ ...target, sku: `${target.sku}-extra` });
      break;
  }
  return { supplier: change === "supplier" ? "sup_other" : "sup_1", lines: next };
}

describe("property: certificates bind the cart", () => {
  it("is VALID for the approved cart and CART_MODIFIED for any changed cart", () => {
    fc.assert(
      fc.property(fc.array(line, { minLength: 1, maxLength: 5 }), cartChange, fc.nat(), (lines, change, i) => {
        const cart = buildCart("sup_1", "USD", lines);
        fc.pre(cart.total_minor > 0);
        const input: IssueCertificateInput = {
          intent_id: "intent_1",
          organization_id: "org_1",
          buyer_id: "owner_1",
          purchase_order_id: "po_1",
          supplier_id: "sup_1",
          cart_hash: computeCartHash(cart),
          mandate_id: "m_1",
          mandate_version: 1,
          policy_decision_id: "pd_1",
          currency: "USD",
          approved_amount_minor: cart.total_minor,
          approved_at: new Date("2026-11-10T18:00:00Z"),
          ttl_minutes: 15,
        };
        const cert = issueCertificate(input, key);
        const ctx = contextFor(input, cert, 0.5);
        expect(verifyCertificate(cert, ctx).status).toBe("VALID");

        const changed = changeCart(lines, change, i);
        const current = buildCart(changed.supplier, "USD", changed.lines);
        const r = verifyCertificate(cert, {
          ...ctx,
          current_cart_hash: computeCartHash(current),
          current_total_minor: current.total_minor,
        });
        expect(r.status, change).toBe("CART_MODIFIED");
        expect(r.checks.find((c) => c.code === "CART_HASH")?.passed).toBe(false);
      }),
      RUNS,
    );
  });
});
