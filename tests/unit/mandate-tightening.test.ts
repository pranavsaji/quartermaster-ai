import { describe, expect, it } from "vitest";
import {
  MANDATE_IDENTITY_FIELDS,
  MANDATE_SECURITY_FIELDS,
  MANDATE_TIGHTENING,
  mandateTightened,
  tightenedMandateFields,
  type MandateSecurityField,
  type SpendMandate,
} from "@qm/trustrail";
import { mandate, OTHER_SUPPLIER } from "../helpers/fixtures";

/**
 * One tightening and one loosening change per security field, relative to the fixture mandate
 * (USD, $500/week, $250/order, $100 auto, 10 % premium REVIEW, 24 h duplicate REVIEW, no
 * subscriptions, 30 min TTL, 2× need, human approval required). Currency has no loosening: any
 * change invalidates amounts approved in the old currency, so its "loosening" row is null.
 */
const CASES: Record<MandateSecurityField, { tighten: Partial<SpendMandate>; loosen: Partial<SpendMandate> | null }> = {
  currency: { tighten: { currency: "EUR" }, loosen: null },
  weekly_budget_minor: { tighten: { weekly_budget_minor: 40_000 }, loosen: { weekly_budget_minor: 80_000 } },
  per_order_limit_minor: { tighten: { per_order_limit_minor: 10_000 }, loosen: { per_order_limit_minor: 30_000 } },
  auto_approval_limit_minor: { tighten: { auto_approval_limit_minor: 5_000 }, loosen: { auto_approval_limit_minor: 20_000 } },
  approved_supplier_ids: {
    tighten: { approved_supplier_ids: [] },
    loosen: { approved_supplier_ids: [mandate().approved_supplier_ids[0]!, OTHER_SUPPLIER] },
  },
  allowed_categories: {
    tighten: { allowed_categories: ["food_packaging"] },
    loosen: { allowed_categories: ["food_packaging", "cleaning_supplies", "cooking_ingredients", "alcohol"] },
  },
  max_market_price_premium_pct: { tighten: { max_market_price_premium_pct: 5 }, loosen: { max_market_price_premium_pct: 20 } },
  market_price_action: { tighten: { market_price_action: "BLOCK" }, loosen: { market_price_action: "REVIEW" } },
  duplicate_window_hours: { tighten: { duplicate_window_hours: 48 }, loosen: { duplicate_window_hours: 12 } },
  duplicate_action: { tighten: { duplicate_action: "BLOCK" }, loosen: { duplicate_action: "REVIEW" } },
  subscriptions_allowed: { tighten: { subscriptions_allowed: false }, loosen: { subscriptions_allowed: true } },
  max_quantity_multiple_of_need: { tighten: { max_quantity_multiple_of_need: 1.5 }, loosen: { max_quantity_multiple_of_need: 3 } },
  human_approval_required: { tighten: { human_approval_required: true }, loosen: { human_approval_required: false } },
  certificate_ttl_minutes: { tighten: { certificate_ttl_minutes: 10 }, loosen: { certificate_ttl_minutes: 60 } },
};

/**
 * Baselines from which the tightening is visible: the fixture already has the strict value for
 * actions, subscriptions and human approval, so those start from the loose value.
 */
const LOOSE_BASE: Partial<SpendMandate> = {
  market_price_action: "REVIEW",
  duplicate_action: "REVIEW",
  subscriptions_allowed: true,
  human_approval_required: false,
};
const STRICT_BASE: Partial<SpendMandate> = {
  market_price_action: "BLOCK",
  duplicate_action: "BLOCK",
  subscriptions_allowed: false,
  human_approval_required: true,
};

describe("mandate field coverage", () => {
  it("classifies every SpendMandate key as identity or security, exactly once", () => {
    const keys = Object.keys(mandate()).sort();
    expect([...MANDATE_IDENTITY_FIELDS, ...MANDATE_SECURITY_FIELDS].sort()).toEqual(keys);
    expect(new Set(MANDATE_SECURITY_FIELDS).size).toBe(MANDATE_SECURITY_FIELDS.length);
  });

  it("has a tightening rule and a test case for every security field", () => {
    expect(Object.keys(MANDATE_TIGHTENING).sort()).toEqual([...MANDATE_SECURITY_FIELDS].sort());
    expect(Object.keys(CASES).sort()).toEqual([...MANDATE_SECURITY_FIELDS].sort());
  });
});

describe.each(MANDATE_SECURITY_FIELDS.map((f) => [f]))("mandateTightened — %s", (field) => {
  const { tighten, loosen } = CASES[field];

  it("detects the tightening, and attributes it to this field only", () => {
    const prev = mandate(LOOSE_BASE);
    const next = mandate({ ...LOOSE_BASE, ...tighten });
    expect(mandateTightened(prev, next)).toBe(true);
    expect(tightenedMandateFields(prev, next)).toEqual([field]);
  });

  it("does not treat the loosening as tightening", () => {
    if (loosen === null) {
      // Currency: changing back and forth is a tightening in both directions.
      expect(mandateTightened(mandate({ currency: "EUR" }), mandate())).toBe(true);
      return;
    }
    const prev = mandate(STRICT_BASE);
    const next = mandate({ ...STRICT_BASE, ...loosen });
    expect(mandateTightened(prev, next)).toBe(false);
    expect(tightenedMandateFields(prev, next)).toEqual([]);
  });

  it("treats an unchanged value as no change", () => {
    expect(mandateTightened(mandate(), mandate())).toBe(false);
  });
});

describe("identity fields", () => {
  it("never count as tightening", () => {
    const next = mandate({ id: "mandate_2", organization_id: "org_1", version: 2, status: "SUPERSEDED" });
    expect(mandateTightened(mandate(), next)).toBe(false);
  });

  it("reports every tightened field at once", () => {
    const next = mandate({ weekly_budget_minor: 1, currency: "EUR", certificate_ttl_minutes: 5 });
    expect(tightenedMandateFields(mandate(), next)).toEqual(["currency", "weekly_budget_minor", "certificate_ttl_minutes"]);
  });
});
