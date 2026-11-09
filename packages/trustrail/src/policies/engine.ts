import type { PolicyDecisionKind, ProductCategory, ViolationCode } from "@qm/contracts";
import { type Cart, checkCartArithmetic } from "../cart";
import { digest } from "../canonical";
import type { SpendMandate } from "../mandates/types";

export const POLICY_VERSION = "trustrail-policy/1.2.0";

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
  status: string;
  created_at: string;
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

const DUPLICATE_STATUSES = new Set(["APPROVED", "PAYMENT_PENDING", "PAID", "FULFILLED"]);

/**
 * Deterministic TrustRail policy evaluation. Pure function: identical input produces an
 * identical decision. Nothing produced by a language model can change the result except by
 * changing the cart itself, which is then evaluated on its own merits.
 */
export function evaluatePolicy(input: PolicyInput): PolicyResult {
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
  check("MANDATE_ACTIVE", true, `Mandate v${mandate.version} is active.`);

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
  check("CART_ARITHMETIC", arithmetic.length === 0, arithmetic.length === 0 ? "All totals reconcile." : `${arithmetic.length} arithmetic issue(s).`);

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
  }

  // --- Line items vs. catalog and published terms -------------------------------------
  const catalogBySku = new Map(input.catalog.filter((c) => c.supplier_id === cart.supplier_id).map((c) => [c.sku, c]));
  let unauthorizedCount = 0;
  for (const line of cart.lines) {
    if (line.kind === "PRODUCT") {
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
      if ((entry.recurring || line.recurring) && !mandate.subscriptions_allowed) {
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
      if (line.recurring && !mandate.subscriptions_allowed) {
        violate({ code: "SUBSCRIPTION_NOT_ALLOWED", severity: "BLOCK", message: `"${line.description}" is recurring.` });
      }
    } else if (line.kind === "TAX") {
      const expectedTax = supplier ? Math.round((cart.subtotal_minor * supplier.tax_rate_bps) / 10_000) : null;
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
  check("LINE_ITEMS_AUTHORIZED", unauthorizedCount === 0, unauthorizedCount === 0 ? "Every line maps to verified catalog items or published terms." : `${unauthorizedCount} unauthorized line(s).`);

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
    const need = input.needed_units_by_sku[line.sku];
    const pack = input.pack_quantity_by_sku[line.sku] ?? 1;
    if (need === undefined) continue;
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
  const maxAgeMs = (input.market_reference_max_age_hours ?? 72) * 3_600_000;
  for (const line of productLines) {
    if (!line.sku) continue;
    const ref = input.market.find((m) => m.sku === line.sku);
    const fresh =
      ref?.observed_at !== null && ref?.observed_at !== undefined && input.now.getTime() - Date.parse(ref.observed_at) <= maxAgeMs;
    if (!ref || !ref.comparable || ref.reference_unit_price_minor === null || !fresh) {
      violate({
        code: "MARKET_REFERENCE_UNAVAILABLE",
        severity: "REVIEW",
        message: `No recent, comparable market price is available for ${line.sku}; a human must judge the price.`,
        evidence: { sku: line.sku, reason: !ref ? "missing" : !ref.comparable ? "not_comparable" : !fresh ? "stale" : "no_price" },
      });
      continue;
    }
    const premiumPct = ((ref.candidate_unit_price_minor - ref.reference_unit_price_minor) / ref.reference_unit_price_minor) * 100;
    if (premiumPct > mandate.max_market_price_premium_pct) {
      violate({
        code: "MARKET_PRICE_PREMIUM_EXCEEDED",
        severity: mandate.market_price_action,
        message: `${line.sku} is ${premiumPct.toFixed(1)}% above the market reference (limit ${mandate.max_market_price_premium_pct}%).`,
        evidence: {
          sku: line.sku,
          premium_pct: Math.round(premiumPct * 10) / 10,
          reference_unit_price_minor: ref.reference_unit_price_minor,
          candidate_unit_price_minor: ref.candidate_unit_price_minor,
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
        DUPLICATE_STATUSES.has(o.status) &&
        o.supplier_id === cart.supplier_id &&
        Date.parse(o.created_at) >= windowStart &&
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

function finalize(input: PolicyInput, violations: Violation[], checks: PolicyCheck[], mandate: SpendMandate | null): PolicyResult {
  const decision: PolicyDecisionKind = violations.some((v) => v.severity === "BLOCK")
    ? "BLOCK"
    : violations.length > 0
      ? "REVIEW_REQUIRED"
      : "ALLOW";
  const human_approval_required =
    decision !== "ALLOW" || !mandate || mandate.human_approval_required || input.cart.total_minor > mandate.auto_approval_limit_minor;

  return {
    decision,
    violations,
    checks,
    human_approval_required,
    mandate_version: mandate?.version ?? 0,
    policy_version: POLICY_VERSION,
    input_digest: digest(policyInputFingerprint(input)),
    evaluated_at: input.now.toISOString(),
  };
}

/** Stable subset of the input used to prove which facts a decision was made on. */
function policyInputFingerprint(input: PolicyInput) {
  return {
    policy_version: POLICY_VERSION,
    mandate_id: input.mandate?.id ?? null,
    mandate_version: input.mandate?.version ?? null,
    cart: input.cart,
    supplier_id: input.supplier?.id ?? null,
    budget: input.budget,
    request_budget_limit_minor: input.request_budget_limit_minor,
    quarantined_source_ids: [...input.quarantined_source_ids].sort(),
    market: input.market.map((m) => ({
      sku: m.sku,
      comparable: m.comparable,
      observed_at: m.observed_at,
      // fractional unit prices are encoded in micro-minor units to stay integer
      reference_micro: m.reference_unit_price_minor === null ? null : Math.round(m.reference_unit_price_minor * 1_000_000),
      candidate_micro: Math.round(m.candidate_unit_price_minor * 1_000_000),
    })),
  };
}

/** Review codes that must be explicitly acknowledged before approval. */
export function reviewCodes(result: Pick<PolicyResult, "violations">): string[] {
  return [...new Set(result.violations.filter((v) => v.severity === "REVIEW").map((v) => v.code))];
}
