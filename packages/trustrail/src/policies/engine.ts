import {
  COMMITTED_PO_STATUSES,
  applyBps,
  isValidBps,
  type PolicyDecisionKind,
  type ProductCategory,
  type PurchaseOrderStatus,
  type ViolationCode,
} from "@qm/contracts";
import { type Cart, checkCartArithmetic } from "../cart";
import { digest } from "../canonical";
import type { SpendMandate } from "../mandates/types";

export const POLICY_VERSION = "trustrail-policy/1.4.0";

/** Market references older than this many hours are stale unless the caller overrides it. */
export const DEFAULT_MARKET_MAX_AGE_HOURS = 72;

/** Published, supplier-level terms. Anything on a cart that is not covered here is unauthorized. */
export interface SupplierTerms {
  id: string;
  active: boolean;
  fee_terms: { code: string; kind: "SHIPPING" | "FEE"; amount_minor: number; waived_over_minor: number | null }[];
  tax_rate_bps: number;
}

export interface CatalogEntry {
  sku: string;
  supplier_id: string;
  category: ProductCategory;
  unit_price_minor: number;
  recurring: boolean;
  quarantined: boolean;
}

export interface MarketReference {
  sku: string;
  /** Normalised price per usable unit, in minor units (may be fractional). */
  reference_unit_price_minor: number | null;
  /** Price per usable unit for the cart line's product. */
  candidate_unit_price_minor: number;
  observed_at: string | null;
  comparable: boolean;
}

export interface PriorOrder {
  id: string;
  supplier_id: string;
  skus: string[];
  /**
   * Purchase-order status. Typed as the contracts union; plain strings are still accepted for
   * callers that read an untyped text column, and any unknown status never counts as committed.
   */
  status: PurchaseOrderStatus | (string & {});
  created_at: string;
}

/**
 * Purchase-order statuses that commit spend: they count against request budgets and as
 * potential duplicates. Single source of truth for TrustRail and its callers.
 */
/** Orders that hold or have spent budget (shared with the API through @qm/contracts). */
export const COMMITTED_ORDER_STATUSES = COMMITTED_PO_STATUSES;
export type CommittedOrderStatus = (typeof COMMITTED_ORDER_STATUSES)[number];

export function isCommittedOrderStatus(status: string): status is CommittedOrderStatus {
  return (COMMITTED_ORDER_STATUSES as readonly string[]).includes(status);
}

export interface BudgetSnapshot {
  limit_minor: number;
  spent_minor: number;
  reserved_minor: number;
}

export interface PolicyInput {
  mandate: SpendMandate | null;
  cart: Cart;
  supplier: SupplierTerms | null;
  catalog: CatalogEntry[];
  budget: BudgetSnapshot;
  /** Owner-stated cap for this specific request, if any. */
  request_budget_limit_minor: number | null;
  /** Forecast need per SKU in usable units, for over-purchase detection. */
  needed_units_by_sku: Record<string, number>;
  pack_quantity_by_sku: Record<string, number>;
  market: MarketReference[];
  prior_orders: PriorOrder[];
  /** Ids of sources (supplier / catalog items) quarantined by threat detection. */
  quarantined_source_ids: string[];
  now: Date;
  market_reference_max_age_hours?: number;
}

export interface Violation {
  code: ViolationCode;
  severity: "BLOCK" | "REVIEW";
  message: string;
  evidence?: Record<string, unknown>;
}

export interface PolicyCheck {
  code: string;
  passed: boolean;
  detail: string;
}

export interface PolicyResult {
  decision: PolicyDecisionKind;
  violations: Violation[];
  checks: PolicyCheck[];
  human_approval_required: boolean;
  mandate_version: number;
  policy_version: string;
  input_digest: string;
  evaluated_at: string;
}

/** Tolerated clock skew for market observations timestamped slightly after `now`. */
export const MARKET_CLOCK_SKEW_MS = 5 * 60_000;

/**
 * Deterministic TrustRail policy evaluation. Pure function: identical input produces an
 * identical decision. Nothing produced by a language model can change the result except by
 * changing the cart itself, which is then evaluated on its own merits.
 *
 * Total: it never throws. Malformed input (non-finite or fractional amounts, an invalid clock,
 * a malformed mandate, or anything that makes evaluation fail) yields a BLOCK decision with a
 * violation explaining why, so a caller bug can never turn into an unhandled exception on the
 * approval or capture path, nor into an ALLOW.
 */
export function evaluatePolicy(input: PolicyInput): PolicyResult {
  try {
    return evaluate(input);
  } catch (err) {
    return failClosed(input, err);
  }
}

const isMinor = (v: unknown): v is number => typeof v === "number" && Number.isSafeInteger(v);
const isNonNegativeMinor = (v: unknown): v is number => isMinor(v) && v >= 0;
const isNonNegativeFinite = (v: unknown): v is number => typeof v === "number" && Number.isFinite(v) && v >= 0;

/** Names of mandate fields whose values the engine cannot reason about. */
function malformedMandateFields(m: SpendMandate): string[] {
  const bad: string[] = [];
  for (const f of ["weekly_budget_minor", "per_order_limit_minor", "auto_approval_limit_minor"] as const)
    if (!isNonNegativeMinor(m[f])) bad.push(f);
  for (const f of ["max_market_price_premium_pct", "duplicate_window_hours"] as const) if (!isNonNegativeFinite(m[f])) bad.push(f);
  if (!(
    typeof m.max_quantity_multiple_of_need === "number" &&
    Number.isFinite(m.max_quantity_multiple_of_need) &&
    m.max_quantity_multiple_of_need > 0
  )) {
    bad.push("max_quantity_multiple_of_need");
  }
  if (!Array.isArray(m.approved_supplier_ids)) bad.push("approved_supplier_ids");
  if (!Array.isArray(m.allowed_categories)) bad.push("allowed_categories");
  if (m.market_price_action !== "REVIEW" && m.market_price_action !== "BLOCK") bad.push("market_price_action");
  if (m.duplicate_action !== "REVIEW" && m.duplicate_action !== "BLOCK") bad.push("duplicate_action");
  // Type confusion must never loosen a mandate: the string "false" is truthy.
  if (typeof m.subscriptions_allowed !== "boolean") bad.push("subscriptions_allowed");
  if (typeof m.human_approval_required !== "boolean") bad.push("human_approval_required");
  if (!isCurrencyCode(m.currency)) bad.push("currency");
  if (Array.isArray(m.approved_supplier_ids) && !isStringArray(m.approved_supplier_ids)) bad.push("approved_supplier_ids");
  if (Array.isArray(m.allowed_categories) && !isStringArray(m.allowed_categories)) bad.push("allowed_categories");
  return bad;
}

const isObject = (v: unknown): v is Record<string, unknown> => typeof v === "object" && v !== null && !Array.isArray(v);
/** Array.from reads holes as undefined, which `every` would skip. */
const isStringArray = (v: unknown): v is string[] => Array.isArray(v) && Array.from(v).every((x) => typeof x === "string");
const isCurrencyCode = (v: unknown): v is string => typeof v === "string" && /^[A-Z]{3}$/.test(v);
const isStringOrNull = (v: unknown) => v === null || typeof v === "string";
const everyItem = (v: unknown, ok: (item: Record<string, unknown>) => boolean) =>
  Array.isArray(v) && Array.from(v as unknown[]).every((x) => isObject(x) && ok(x));

/**
 * Paths of facts whose JavaScript type the engine cannot reason about. Values of the right type
 * keep their specific handling below (a NaN market price or a zero pack size is a REVIEW, a
 * fractional quantity an arithmetic violation); this catches type confusion that would otherwise
 * be coerced into a permissive answer: `quarantined_source_ids: "sup_1"` read as a set of
 * characters, `market_reference_max_age_hours: "100000"` multiplied as a number, `active:
 * "false"` read as true, a prior order whose status is not a string never counted as a duplicate.
 */
function malformedFacts(input: PolicyInput): string[] {
  const bad: string[] = [];
  const { cart, supplier } = input;
  if (!isObject(cart)) {
    bad.push("cart");
  } else {
    if (typeof cart.supplier_id !== "string") bad.push("cart.supplier_id");
    if (!isCurrencyCode(cart.currency)) bad.push("cart.currency");
    if (
      !everyItem(
        cart.lines,
        (l) => isStringOrNull(l.sku) && typeof l.description === "string" && isStringOrNull(l.category) && typeof l.kind === "string",
      )
    )
      bad.push("cart.lines");
  }
  if (supplier !== null) {
    if (!isObject(supplier)) bad.push("supplier");
    else {
      if (typeof supplier.id !== "string") bad.push("supplier.id");
      if (typeof supplier.active !== "boolean") bad.push("supplier.active");
      if (
        !everyItem(
          supplier.fee_terms,
          (t) =>
            typeof t.code === "string" &&
            (t.kind === "SHIPPING" || t.kind === "FEE") &&
            isNonNegativeMinor(t.amount_minor) &&
            (t.waived_over_minor === null || isNonNegativeMinor(t.waived_over_minor)),
        )
      )
        bad.push("supplier.fee_terms");
    }
  }
  if (
    !everyItem(
      input.catalog,
      (c) =>
        typeof c.sku === "string" &&
        typeof c.supplier_id === "string" &&
        typeof c.category === "string" &&
        isNonNegativeMinor(c.unit_price_minor) &&
        typeof c.recurring === "boolean" &&
        typeof c.quarantined === "boolean",
    )
  )
    bad.push("catalog");
  if (!isObject(input.needed_units_by_sku)) bad.push("needed_units_by_sku");
  if (!isObject(input.pack_quantity_by_sku)) bad.push("pack_quantity_by_sku");
  if (
    !everyItem(
      input.market,
      (m) =>
        typeof m.sku === "string" &&
        (m.reference_unit_price_minor === null || typeof m.reference_unit_price_minor === "number") &&
        isStringOrNull(m.observed_at) &&
        typeof m.comparable === "boolean",
    )
  )
    bad.push("market");
  if (
    !everyItem(
      input.prior_orders,
      (o) =>
        typeof o.id === "string" &&
        typeof o.supplier_id === "string" &&
        typeof o.status === "string" &&
        typeof o.created_at === "string" &&
        isStringArray(o.skus),
    )
  )
    bad.push("prior_orders");
  if (!isStringArray(input.quarantined_source_ids)) bad.push("quarantined_source_ids");
  if (input.market_reference_max_age_hours !== undefined && !isNonNegativeFinite(input.market_reference_max_age_hours))
    bad.push("market_reference_max_age_hours");
  return bad;
}

const validNow = (now: unknown): now is Date => now instanceof Date && !Number.isNaN(now.getTime());

function evaluate(input: PolicyInput): PolicyResult {
  const violations: Violation[] = [];
  const checks: PolicyCheck[] = [];
  const { cart, mandate, supplier } = input;

  const check = (code: string, passed: boolean, detail: string) => checks.push({ code, passed, detail });
  const violate = (v: Violation) => violations.push(v);

  // --- Mandate presence --------------------------------------------------------------
  if (!mandate || mandate.status !== "ACTIVE") {
    violate({ code: "MANDATE_INACTIVE", severity: "BLOCK", message: "No active Spend Mandate is in force." });
    return finalize(input, violations, checks, mandate);
  }
  const badFields = malformedMandateFields(mandate);
  if (badFields.length > 0) {
    violate({
      code: "POLICY_INPUT_INVALID",
      severity: "BLOCK",
      message: "The Spend Mandate is malformed; no valid mandate is in force.",
      evidence: { fields: badFields },
    });
    return finalize(input, violations, checks, mandate);
  }
  if (!validNow(input.now)) {
    // Freshness, duplicate windows and the mandate's validity are all judged at `now`.
    violate({
      code: "POLICY_INPUT_INVALID",
      severity: "BLOCK",
      message: "Evaluation time is invalid; the mandate cannot be applied.",
      evidence: { reason: "invalid_now" },
    });
    return finalize(input, violations, checks, mandate);
  }
  const badFacts = malformedFacts(input);
  if (badFacts.length > 0) {
    violate({
      code: "POLICY_INPUT_INVALID",
      severity: "BLOCK",
      message: "Policy facts have the wrong type; the cart cannot be evaluated.",
      evidence: { fields: badFacts },
    });
    return finalize(input, violations, checks, mandate);
  }
  check("MANDATE_ACTIVE", true, `Mandate v${mandate.version} is active.`);

  // --- Malformed facts from the system of record ----------------------------------------
  const budgetFields = (["limit_minor", "spent_minor", "reserved_minor"] as const).filter((f) => !isNonNegativeMinor(input.budget?.[f]));
  if (budgetFields.length > 0) {
    violate({
      code: "POLICY_INPUT_INVALID",
      severity: "BLOCK",
      message: "The budget snapshot is malformed; remaining budget cannot be verified.",
      evidence: { fields: budgetFields },
    });
  }
  if (input.request_budget_limit_minor !== null && !isMinor(input.request_budget_limit_minor)) {
    violate({
      code: "REQUEST_BUDGET_EXCEEDED",
      severity: "BLOCK",
      message: "The request budget is malformed; it cannot be verified.",
      evidence: { request_limit_minor: String(input.request_budget_limit_minor) },
    });
  }

  // --- Cart shape ---------------------------------------------------------------------
  const productLines = cart.lines.filter((l) => l.kind === "PRODUCT");
  if (productLines.length === 0) {
    violate({ code: "EMPTY_CART", severity: "BLOCK", message: "The cart contains no products." });
  }
  check("CART_NOT_EMPTY", productLines.length > 0, `${productLines.length} product line(s).`);

  const arithmetic = checkCartArithmetic(cart);
  if (arithmetic.length > 0) {
    violate({
      code: "CART_ARITHMETIC_INVALID",
      severity: "BLOCK",
      message: "Cart line totals or order totals do not add up.",
      evidence: { issues: arithmetic },
    });
  }
  check(
    "CART_ARITHMETIC",
    arithmetic.length === 0,
    arithmetic.length === 0 ? "All totals reconcile." : `${arithmetic.length} arithmetic issue(s).`,
  );

  if (cart.currency !== mandate.currency) {
    violate({
      code: "CURRENCY_MISMATCH",
      severity: "BLOCK",
      message: `Cart currency ${cart.currency} differs from mandate currency ${mandate.currency}.`,
    });
  }
  check("CURRENCY", cart.currency === mandate.currency, `Cart ${cart.currency}, mandate ${mandate.currency}.`);

  // --- Supplier -----------------------------------------------------------------------
  const supplierApproved = mandate.approved_supplier_ids.includes(cart.supplier_id);
  if (!supplierApproved) {
    violate({
      code: "SUPPLIER_NOT_APPROVED",
      severity: "BLOCK",
      message: "Supplier is not on the mandate's approved list.",
      evidence: { supplier_id: cart.supplier_id },
    });
  }
  check("SUPPLIER_APPROVED", supplierApproved, supplierApproved ? "Supplier is approved." : "Supplier is not approved.");

  if (!supplier || !supplier.active) {
    violate({ code: "SUPPLIER_INACTIVE", severity: "BLOCK", message: "Supplier is unknown or inactive." });
  } else if (supplier.id !== cart.supplier_id) {
    // Terms from one supplier must never authorise another supplier's cart.
    violate({
      code: "SUPPLIER_INACTIVE",
      severity: "BLOCK",
      message: "Supplier terms provided do not belong to the cart's supplier.",
      evidence: { cart_supplier_id: cart.supplier_id, terms_supplier_id: supplier.id },
    });
  } else if (!isValidBps(supplier.tax_rate_bps)) {
    violate({
      code: "SUPPLIER_INACTIVE",
      severity: "BLOCK",
      message: "Supplier's published tax rate is malformed.",
      evidence: { tax_rate_bps: String(supplier.tax_rate_bps) },
    });
  }

  // --- Line items vs. catalog and published terms -------------------------------------
  const catalogBySku = new Map(input.catalog.filter((c) => c.supplier_id === cart.supplier_id).map((c) => [c.sku, c]));
  let unauthorizedCount = 0;
  const seenChargeCodes = new Set<string>();
  const seenProductSkus = new Set<string>();
  let taxLines = 0;
  for (const line of cart.lines) {
    if (line.kind === "PRODUCT") {
      if (line.sku && seenProductSkus.has(line.sku)) {
        unauthorizedCount++;
        violate({
          code: "UNAUTHORIZED_LINE_ITEM",
          severity: "BLOCK",
          message: `Product ${line.sku} appears on more than one line.`,
          evidence: { sku: line.sku },
        });
      }
      if (line.sku) seenProductSkus.add(line.sku);
      const entry = line.sku ? catalogBySku.get(line.sku) : undefined;
      if (!entry) {
        unauthorizedCount++;
        violate({
          code: "UNAUTHORIZED_LINE_ITEM",
          severity: "BLOCK",
          message: `Product "${line.description}" is not in the supplier's verified catalog.`,
          evidence: { sku: line.sku },
        });
        continue;
      }
      if (entry.unit_price_minor !== line.unit_price_minor) {
        violate({
          code: "PRICE_MISMATCH",
          severity: "BLOCK",
          message: `Unit price for ${entry.sku} differs from the verified catalog price.`,
          evidence: { sku: entry.sku, catalog_minor: entry.unit_price_minor, cart_minor: line.unit_price_minor },
        });
      }
      const category = line.category ?? entry.category;
      if (category !== entry.category || !mandate.allowed_categories.includes(entry.category)) {
        violate({
          code: "CATEGORY_NOT_ALLOWED",
          severity: "BLOCK",
          message: `Category "${entry.category}" is not permitted by the mandate.`,
          evidence: { sku: entry.sku, category: entry.category },
        });
      }
      if ((entry.recurring || line.recurring === true) && !mandate.subscriptions_allowed) {
        violate({
          code: "SUBSCRIPTION_NOT_ALLOWED",
          severity: "BLOCK",
          message: `"${line.description}" is a recurring charge and subscriptions are not allowed.`,
          evidence: { sku: entry.sku },
        });
      }
      if (entry.quarantined) {
        violate({
          code: "QUARANTINED_SOURCE",
          severity: "BLOCK",
          message: `Listing ${entry.sku} was quarantined by threat detection.`,
          evidence: { sku: entry.sku },
        });
      }
    } else if (line.kind === "SHIPPING" || line.kind === "FEE") {
      // Each published charge may be applied at most once; repeating a legitimate code is a
      // classic way to smuggle an extra charge past per-line checks.
      const chargeKey = `${line.kind}:${line.sku ?? ""}`;
      if (seenChargeCodes.has(chargeKey)) {
        unauthorizedCount++;
        violate({
          code: "UNAUTHORIZED_LINE_ITEM",
          severity: "BLOCK",
          message: `Charge "${line.description}" is applied more than once.`,
          evidence: { code: line.sku, kind: line.kind },
        });
        continue;
      }
      seenChargeCodes.add(chargeKey);
      const term = supplier?.fee_terms.find((t) => t.code === line.sku && t.kind === line.kind);
      const waived = term && term.waived_over_minor !== null && cart.subtotal_minor >= term.waived_over_minor;
      const expectedAmount = term ? (waived ? 0 : term.amount_minor) : null;
      if (!term) {
        unauthorizedCount++;
        violate({
          code: "UNAUTHORIZED_LINE_ITEM",
          severity: "BLOCK",
          message: `Charge "${line.description}" is not part of the supplier's published terms.`,
          evidence: { code: line.sku, amount_minor: line.line_total_minor, kind: line.kind },
        });
      } else if (line.line_total_minor !== expectedAmount) {
        unauthorizedCount++;
        violate({
          code: "UNAUTHORIZED_LINE_ITEM",
          severity: "BLOCK",
          message: `Charge "${line.description}" does not match the published amount.`,
          evidence: { code: line.sku, expected_minor: expectedAmount, cart_minor: line.line_total_minor },
        });
      }
      if (line.recurring === true && !mandate.subscriptions_allowed) {
        violate({ code: "SUBSCRIPTION_NOT_ALLOWED", severity: "BLOCK", message: `"${line.description}" is recurring.` });
      }
    } else if (line.kind === "TAX") {
      taxLines++;
      if (taxLines > 1) {
        unauthorizedCount++;
        violate({ code: "UNAUTHORIZED_LINE_ITEM", severity: "BLOCK", message: "The cart contains more than one tax line." });
        continue;
      }
      const expectedTax = supplier ? expectedTaxMinor(cart.subtotal_minor, supplier.tax_rate_bps) : null;
      if (expectedTax === null || line.line_total_minor !== expectedTax) {
        unauthorizedCount++;
        violate({
          code: "UNAUTHORIZED_LINE_ITEM",
          severity: "BLOCK",
          message: "Tax line does not match the supplier's published tax rate.",
          evidence: { expected_minor: expectedTax, cart_minor: line.line_total_minor },
        });
      }
    }
  }
  check(
    "LINE_ITEMS_AUTHORIZED",
    unauthorizedCount === 0,
    unauthorizedCount === 0
      ? "Every line maps to verified catalog items or published terms."
      : `${unauthorizedCount} unauthorized line(s).`,
  );

  // --- Required charges -----------------------------------------------------------------
  // The inverse of the checks above: every charge the supplier's published terms make due must
  // be on the cart. A cart without its tax line or without non-waived shipping understates what
  // the supplier will actually charge, so the approved (and certified) amount would not be the
  // amount paid. Blocked, like any other cart that does not follow the published terms; reported
  // as CART_ARITHMETIC_INVALID (the totals are not what the terms yield) with the reason in the
  // evidence, so it is never mistaken for an injected fee.
  let missingCharges = 0;
  const termsApply = !!supplier && supplier.active && supplier.id === cart.supplier_id && isValidBps(supplier.tax_rate_bps);
  if (termsApply) {
    const expectedTax = expectedTaxMinor(cart.subtotal_minor, supplier.tax_rate_bps);
    if (taxLines === 0 && expectedTax !== null && expectedTax > 0) {
      missingCharges++;
      violate({
        code: "CART_ARITHMETIC_INVALID",
        severity: "BLOCK",
        message: `The cart has no tax line, but the supplier's published ${(supplier.tax_rate_bps / 100).toFixed(2)}% rate makes ${expectedTax} due.`,
        evidence: { reason: "missing_tax_line", tax_rate_bps: supplier.tax_rate_bps, expected_minor: expectedTax },
      });
    }
    for (const term of Array.isArray(supplier.fee_terms) ? supplier.fee_terms : []) {
      const waived = term.waived_over_minor !== null && cart.subtotal_minor >= term.waived_over_minor;
      const due = waived ? 0 : term.amount_minor;
      if (!(due > 0) || cart.lines.some((l) => l.kind === term.kind && l.sku === term.code)) continue;
      missingCharges++;
      violate({
        code: "CART_ARITHMETIC_INVALID",
        severity: "BLOCK",
        message: `Published ${term.kind === "SHIPPING" ? "shipping" : "fee"} "${term.code}" (${due}) is due but missing from the cart.`,
        evidence: { reason: "missing_required_charge", code: term.code, kind: term.kind, expected_minor: due },
      });
    }
  }
  check(
    "REQUIRED_CHARGES_PRESENT",
    missingCharges === 0,
    missingCharges === 0 ? "Every charge due under the published terms is on the cart." : `${missingCharges} required charge(s) missing.`,
  );

  // --- Quarantine (prompt injection) ---------------------------------------------------
  const quarantined = new Set(input.quarantined_source_ids);
  if (quarantined.has(cart.supplier_id)) {
    violate({
      code: "QUARANTINED_SOURCE",
      severity: "BLOCK",
      message: "Supplier content was quarantined after suspicious instructions were detected.",
      evidence: { supplier_id: cart.supplier_id },
    });
  }
  for (const line of productLines) {
    if (line.sku && quarantined.has(line.sku) && !catalogBySku.get(line.sku)?.quarantined) {
      violate({
        code: "QUARANTINED_SOURCE",
        severity: "BLOCK",
        message: `Listing ${line.sku} was quarantined by threat detection.`,
        evidence: { sku: line.sku },
      });
    }
  }
  check("NO_QUARANTINED_SOURCES", !violations.some((v) => v.code === "QUARANTINED_SOURCE"), "Quarantine status checked.");

  // --- Spending limits ----------------------------------------------------------------
  const total = cart.total_minor;
  const perOrderOk = total <= mandate.per_order_limit_minor;
  if (!perOrderOk) {
    violate({
      code: "PER_ORDER_LIMIT_EXCEEDED",
      severity: "BLOCK",
      message: "Order total exceeds the per-order limit.",
      evidence: { total_minor: total, limit_minor: mandate.per_order_limit_minor },
    });
  }
  check("PER_ORDER_LIMIT", perOrderOk, `${total} of ${mandate.per_order_limit_minor}.`);

  const effectiveLimit = Math.min(input.budget.limit_minor, mandate.weekly_budget_minor);
  const remaining = effectiveLimit - input.budget.spent_minor - input.budget.reserved_minor;
  const weeklyOk = total <= remaining;
  if (!weeklyOk) {
    violate({
      code: "WEEKLY_BUDGET_EXCEEDED",
      severity: "BLOCK",
      message: "Order total exceeds the remaining weekly budget.",
      evidence: { total_minor: total, remaining_minor: Math.max(0, remaining), ...input.budget },
    });
  }
  check("WEEKLY_BUDGET", weeklyOk, `${total} against ${Math.max(0, remaining)} remaining.`);

  if (input.request_budget_limit_minor !== null) {
    const ok = total <= input.request_budget_limit_minor;
    if (!ok) {
      violate({
        code: "REQUEST_BUDGET_EXCEEDED",
        severity: "BLOCK",
        message: "Order total exceeds the budget the owner set for this request.",
        evidence: { total_minor: total, request_limit_minor: input.request_budget_limit_minor },
      });
    }
    check("REQUEST_BUDGET", ok, `${total} of ${input.request_budget_limit_minor}.`);
  }

  // --- Quantity sanity ----------------------------------------------------------------
  for (const line of productLines) {
    if (!line.sku) continue;
    const need = ownValue(input.needed_units_by_sku, line.sku);
    const pack = packQuantity(input, line.sku);
    if (pack === null) {
      // A zero, negative, fractional or non-finite pack size would make every unit count
      // meaningless (0 × anything never exceeds the need), so a human must check it.
      violate({
        code: "QUANTITY_EXCEEDS_NEED",
        severity: "REVIEW",
        message: `Pack size for ${line.sku} is invalid; ordered units cannot be checked against need.`,
        evidence: { sku: line.sku, reason: "invalid_pack_quantity", pack_quantity: String(ownValue(input.pack_quantity_by_sku, line.sku)) },
      });
      continue;
    }
    if (need === undefined) {
      // Fail closed: without a forecast nothing bounds the quantity, so a human must judge it.
      violate({
        code: "QUANTITY_EXCEEDS_NEED",
        severity: "REVIEW",
        message: `No forecast need is known for ${line.sku}; ordered units cannot be checked against need.`,
        evidence: { sku: line.sku, reason: "no_forecast", units: line.quantity * pack },
      });
      continue;
    }
    if (typeof need !== "number" || !Number.isFinite(need) || need < 0) {
      violate({
        code: "QUANTITY_EXCEEDS_NEED",
        severity: "REVIEW",
        message: `Forecast need for ${line.sku} is invalid; ordered units cannot be checked against need.`,
        evidence: { sku: line.sku, reason: "invalid_need", need: String(need) },
      });
      continue;
    }
    const units = line.quantity * pack;
    // Allow rounding up to whole packs before applying the multiple.
    const allowed = Math.max(Math.ceil(need / pack) * pack, need * mandate.max_quantity_multiple_of_need);
    if (units > allowed) {
      violate({
        code: "QUANTITY_EXCEEDS_NEED",
        severity: "REVIEW",
        message: `Ordering ${units} units of ${line.sku} exceeds the forecast need of ${need}.`,
        evidence: { sku: line.sku, units, need, allowed },
      });
    }
  }

  // --- Market price -------------------------------------------------------------------
  const maxAgeMs = (input.market_reference_max_age_hours ?? DEFAULT_MARKET_MAX_AGE_HOURS) * 3_600_000;
  for (const line of productLines) {
    if (!line.sku) continue;
    const ref = input.market.find((m) => m.sku === line.sku);
    // Fresh means observed within the window *and* not in the future (beyond a small clock
    // skew): a future timestamp would otherwise stay "fresh" forever. NaN ages are never fresh.
    const age =
      ref?.observed_at !== null && ref?.observed_at !== undefined ? input.now.getTime() - Date.parse(ref.observed_at) : Number.NaN;
    const fresh = age >= -MARKET_CLOCK_SKEW_MS && age <= maxAgeMs;
    const refPrice = ref?.reference_unit_price_minor ?? null;
    const usableRef = refPrice !== null && Number.isFinite(refPrice) && refPrice > 0;
    if (!ref || !ref.comparable || !usableRef || !fresh) {
      violate({
        code: "MARKET_REFERENCE_UNAVAILABLE",
        severity: "REVIEW",
        message: `No recent, comparable market price is available for ${line.sku}; a human must judge the price.`,
        evidence: {
          sku: line.sku,
          reason: !ref
            ? "missing"
            : !ref.comparable
              ? "not_comparable"
              : !fresh
                ? age < -MARKET_CLOCK_SKEW_MS
                  ? "future_observation"
                  : "stale"
                : "invalid_price",
        },
      });
      continue;
    }
    // The candidate price is derived from the cart line being approved, never from a caller-
    // supplied figure, so the check always gates the price that will actually be charged.
    const pack = packQuantity(input, line.sku);
    if (pack === null) {
      violate({
        code: "MARKET_REFERENCE_UNAVAILABLE",
        severity: "REVIEW",
        message: `Pack size for ${line.sku} is invalid; the unit price cannot be compared with the market.`,
        evidence: { sku: line.sku, reason: "invalid_pack_quantity" },
      });
      continue;
    }
    const candidateUnit = line.unit_price_minor / pack;
    const premiumPct = ((candidateUnit - refPrice) / refPrice) * 100;
    if (!Number.isFinite(premiumPct)) {
      violate({
        code: "MARKET_REFERENCE_UNAVAILABLE",
        severity: "REVIEW",
        message: `Market comparison for ${line.sku} could not be computed.`,
        evidence: { sku: line.sku, reason: "non_finite" },
      });
      continue;
    }
    if (premiumPct > mandate.max_market_price_premium_pct) {
      violate({
        code: "MARKET_PRICE_PREMIUM_EXCEEDED",
        severity: mandate.market_price_action,
        message: `${line.sku} is ${premiumPct.toFixed(1)}% above the market reference (limit ${mandate.max_market_price_premium_pct}%).`,
        evidence: {
          sku: line.sku,
          premium_pct: Math.round(premiumPct * 10) / 10,
          reference_unit_price_minor: refPrice,
          candidate_unit_price_minor: candidateUnit,
        },
      });
    }
    check(`MARKET_PRICE:${line.sku}`, premiumPct <= mandate.max_market_price_premium_pct, `${premiumPct.toFixed(1)}% vs reference.`);
  }

  // --- Duplicate orders ---------------------------------------------------------------
  if (mandate.duplicate_window_hours > 0) {
    const windowStart = input.now.getTime() - mandate.duplicate_window_hours * 3_600_000;
    const skus = new Set(productLines.map((l) => l.sku).filter((s): s is string => !!s));
    const duplicates = input.prior_orders.filter(
      (o) =>
        isCommittedOrderStatus(o.status) &&
        o.supplier_id === cart.supplier_id &&
        // An unparseable timestamp fails closed: it counts as inside the window.
        !(Date.parse(o.created_at) < windowStart) &&
        o.skus.some((s) => skus.has(s)),
    );
    if (duplicates.length > 0) {
      violate({
        code: "DUPLICATE_ORDER",
        severity: mandate.duplicate_action,
        message: `A similar order from this supplier was placed in the last ${mandate.duplicate_window_hours}h.`,
        evidence: { purchase_order_ids: duplicates.map((d) => d.id) },
      });
    }
    check("DUPLICATE_ORDER", duplicates.length === 0, `${duplicates.length} overlapping order(s) in window.`);
  }

  return finalize(input, violations, checks, mandate);
}

/** Own-property lookup, so a SKU like "constructor" or "__proto__" never reads Object.prototype. */
function ownValue<T>(record: Record<string, T>, key: string): T | undefined {
  return Object.prototype.hasOwnProperty.call(record, key) ? record[key] : undefined;
}

/**
 * Pack size for a SKU: absent means 1 (sold individually); present must be a positive safe
 * integer. Anything else is invalid (null), and both the quantity and market checks treat it
 * the same way: as a REVIEW violation, never as a silently corrected value.
 */
function packQuantity(input: PolicyInput, sku: string): number | null {
  const raw = ownValue(input.pack_quantity_by_sku, sku);
  if (raw === undefined) return 1;
  return Number.isSafeInteger(raw) && raw > 0 ? raw : null;
}

/**
 * Tax the supplier's published rate yields on `subtotal`, using the same rounding rule as quote
 * building (`applyBps`). Null when the rate or subtotal is malformed, so the tax line cannot match.
 */
function expectedTaxMinor(subtotal: number, bps: number): number | null {
  if (!isValidBps(bps) || !Number.isSafeInteger(subtotal) || subtotal < 0) return null;
  try {
    return applyBps(subtotal, bps);
  } catch {
    return null;
  }
}

function finalize(input: PolicyInput, violations: Violation[], checks: PolicyCheck[], mandate: SpendMandate | null): PolicyResult {
  const decision: PolicyDecisionKind = violations.some((v) => v.severity === "BLOCK")
    ? "BLOCK"
    : violations.length > 0
      ? "REVIEW_REQUIRED"
      : "ALLOW";
  // Written as "not provably within the limit" so NaN can never skip human approval.
  const human_approval_required =
    decision !== "ALLOW" ||
    !mandate ||
    mandate.human_approval_required !== false ||
    !(input.cart.total_minor <= mandate.auto_approval_limit_minor);

  return {
    decision,
    violations,
    checks,
    human_approval_required,
    mandate_version: safeVersion(mandate),
    policy_version: POLICY_VERSION,
    input_digest: inputDigest(input),
    evaluated_at: validNow(input.now) ? input.now.toISOString() : INVALID_TIME,
  };
}

/** `evaluated_at` reported when the caller passed an invalid clock. */
export const INVALID_TIME = "invalid-time";

const safeVersion = (m: unknown): number => {
  const v = (m as { version?: unknown } | null | undefined)?.version;
  return typeof v === "number" && Number.isSafeInteger(v) ? v : 0;
};

function failClosed(input: PolicyInput, err: unknown): PolicyResult {
  const mandate = (input as { mandate?: unknown } | null | undefined)?.mandate;
  return {
    decision: "BLOCK",
    violations: [
      {
        code: "POLICY_INPUT_INVALID",
        severity: "BLOCK",
        message: "Policy input is malformed; evaluation failed closed.",
        evidence: { reason: "evaluation_error", error: (err instanceof Error ? err.message : String(err)).slice(0, 200) },
      },
    ],
    checks: [],
    human_approval_required: true,
    mandate_version: safeVersion(mandate),
    policy_version: POLICY_VERSION,
    input_digest: inputDigest(input),
    evaluated_at: validNow((input as { now?: unknown } | null | undefined)?.now) ? input.now.toISOString() : INVALID_TIME,
  };
}

/**
 * Maps any value onto the canonical-encodable domain without throwing and without collapsing
 * distinct values: safe integers stay as they are; other numbers (fractions, NaN, ±Infinity,
 * -0 is already 0) become `{ $num: String(n) }` (ECMAScript's number-to-string is exact and
 * engine-independent); Dates become ISO strings; holes, cycles and unsupported types become
 * tagged markers.
 */
function digestable(value: unknown, ancestors: Set<object> = new Set()): unknown {
  if (value === null || typeof value === "string" || typeof value === "boolean") return value;
  if (typeof value === "number") return Number.isSafeInteger(value) ? value : { $num: String(value) };
  if (value === undefined) return { $undefined: true };
  if (typeof value !== "object") return { $unsupported: typeof value };
  if (value instanceof Date) return { $date: Number.isNaN(value.getTime()) ? "invalid" : value.toISOString() };
  if (ancestors.has(value)) return { $cycle: true };
  ancestors.add(value);
  try {
    if (Array.isArray(value))
      return Array.from({ length: value.length }, (_, i) => (i in value ? digestable(value[i], ancestors) : { $hole: true }));
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(value)) if (v !== undefined) out[k] = digestable(v, ancestors);
    return out;
  } finally {
    ancestors.delete(value);
  }
}

/** Digest of the decision inputs; never throws. */
function inputDigest(input: PolicyInput): string {
  try {
    return digest(digestable(policyInputFingerprint(input)));
  } catch (err) {
    // Only reachable when the input object itself cannot be read (e.g. a throwing getter).
    return digest({ policy_version: POLICY_VERSION, unreadable_input: err instanceof Error ? err.message.slice(0, 200) : String(err) });
  }
}

const byCodeUnit = (a: string, b: string) => (a < b ? -1 : a > b ? 1 : 0);
/** Stable sort by key: entries sharing a key keep their relative order, which can be decisive. */
const sortedBy = <T>(items: readonly T[], key: (t: T) => string): T[] => [...items].sort((a, b) => byCodeUnit(key(a), key(b)));
const sortedEntries = (record: Record<string, unknown>) => Object.entries(record).sort(([a], [b]) => byCodeUnit(a, b));
/** Fractional unit prices in micro-minor units, so the digest stays integer for finite values. */
const micro = (v: number | null) =>
  v !== null && Number.isFinite(v) && Number.isSafeInteger(Math.round(v * 1_000_000)) ? Math.round(v * 1_000_000) : v;

/**
 * Every fact the decision depends on, so the digest proves exactly which inputs produced it.
 * Set-like collections are sorted (code-unit order); collections where order is decisive
 * (catalog: last entry per SKU wins; market: first entry per SKU wins) are sorted stably by key
 * so that order is preserved where it matters.
 */
function policyInputFingerprint(input: PolicyInput) {
  return {
    policy_version: POLICY_VERSION,
    now: input.now,
    mandate: input.mandate,
    cart: input.cart,
    supplier: input.supplier
      ? {
          id: input.supplier.id,
          active: input.supplier.active,
          tax_rate_bps: input.supplier.tax_rate_bps,
          fee_terms: sortedBy(input.supplier.fee_terms, (t) => `${t.kind}\u0000${t.code}`),
        }
      : null,
    catalog: sortedBy(input.catalog, (c) => `${c.supplier_id}\u0000${c.sku}`),
    budget: input.budget,
    request_budget_limit_minor: input.request_budget_limit_minor,
    needed_units_by_sku: sortedEntries(input.needed_units_by_sku),
    pack_quantity_by_sku: sortedEntries(input.pack_quantity_by_sku),
    quarantined_source_ids: [...input.quarantined_source_ids].sort(byCodeUnit),
    market: sortedBy(input.market, (m) => m.sku).map((m) => ({
      sku: m.sku,
      comparable: m.comparable,
      observed_at: m.observed_at,
      reference_micro: micro(m.reference_unit_price_minor),
      candidate_micro: micro(m.candidate_unit_price_minor),
    })),
    prior_orders: sortedBy(input.prior_orders, (o) => o.id).map((o) => ({ ...o, skus: [...o.skus].sort(byCodeUnit) })),
    market_reference_max_age_hours: input.market_reference_max_age_hours ?? DEFAULT_MARKET_MAX_AGE_HOURS,
  };
}

/** Review codes that must be explicitly acknowledged before approval. */
export function reviewCodes(result: Pick<PolicyResult, "violations">): string[] {
  return [...new Set(result.violations.filter((v) => v.severity === "REVIEW").map((v) => v.code))];
}
