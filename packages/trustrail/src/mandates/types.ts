import type { ProductCategory } from "@qm/contracts";

/** What the business permits the agent to do, across purchases. Immutable once versioned. */
export interface SpendMandate {
  id: string;
  organization_id: string;
  version: number;
  status: "ACTIVE" | "SUPERSEDED";
  currency: string;
  weekly_budget_minor: number;
  per_order_limit_minor: number;
  auto_approval_limit_minor: number;
  human_approval_required: boolean;
  approved_supplier_ids: string[];
  allowed_categories: ProductCategory[];
  max_market_price_premium_pct: number;
  market_price_action: "REVIEW" | "BLOCK";
  duplicate_window_hours: number;
  duplicate_action: "REVIEW" | "BLOCK";
  subscriptions_allowed: boolean;
  certificate_ttl_minutes: number;
  max_quantity_multiple_of_need: number;
}

/** Identity and lifecycle fields: they carry no permission, so changing them tightens nothing. */
export const MANDATE_IDENTITY_FIELDS = ["id", "organization_id", "version", "status"] as const satisfies readonly (keyof SpendMandate)[];

/**
 * Every permission-bearing field of a Spend Mandate. When a new mandate version tightens any of
 * them, certificates issued under the previous version are revoked (`mandateTightened`); a
 * loosening leaves them valid, since they were approved under stricter terms.
 *
 * Together with MANDATE_IDENTITY_FIELDS this lists every key of SpendMandate (checked at compile
 * time below), and MANDATE_TIGHTENING must define a rule for each entry, so adding a mandate
 * field without deciding how its tightening is detected does not compile.
 */
export const MANDATE_SECURITY_FIELDS = [
  "currency",
  "weekly_budget_minor",
  "per_order_limit_minor",
  "approved_supplier_ids",
  "allowed_categories",
  "max_market_price_premium_pct",
  "market_price_action",
  "duplicate_window_hours",
  "duplicate_action",
  "subscriptions_allowed",
  "max_quantity_multiple_of_need",
  "auto_approval_limit_minor",
  "human_approval_required",
  "certificate_ttl_minutes",
] as const satisfies readonly (keyof SpendMandate)[];

export type MandateSecurityField = (typeof MANDATE_SECURITY_FIELDS)[number];

/** Compile-time proof that identity + security fields cover every key of SpendMandate. */
type Uncovered = Exclude<keyof SpendMandate, MandateSecurityField | (typeof MANDATE_IDENTITY_FIELDS)[number]>;
const everyFieldClassified: [Uncovered] extends [never] ? true : Uncovered = true;
void everyFieldClassified;

const lower =
  (f: "weekly_budget_minor" | "per_order_limit_minor" | "auto_approval_limit_minor" | "max_market_price_premium_pct") =>
  (prev: SpendMandate, next: SpendMandate) =>
    next[f] < prev[f];
const escalated = (f: "market_price_action" | "duplicate_action") => (prev: SpendMandate, next: SpendMandate) =>
  prev[f] === "REVIEW" && next[f] === "BLOCK";
const removed = (f: "approved_supplier_ids" | "allowed_categories") => (prev: SpendMandate, next: SpendMandate) =>
  (prev[f] as readonly string[]).some((x) => !(next[f] as readonly string[]).includes(x));

/** For each security field: does `next` make it stricter than `prev`? */
export const MANDATE_TIGHTENING: Record<MandateSecurityField, (prev: SpendMandate, next: SpendMandate) => boolean> = {
  // Any currency change invalidates amounts approved in the old currency.
  currency: (prev, next) => prev.currency !== next.currency,
  weekly_budget_minor: lower("weekly_budget_minor"),
  per_order_limit_minor: lower("per_order_limit_minor"),
  auto_approval_limit_minor: lower("auto_approval_limit_minor"),
  max_market_price_premium_pct: lower("max_market_price_premium_pct"),
  approved_supplier_ids: removed("approved_supplier_ids"),
  allowed_categories: removed("allowed_categories"),
  market_price_action: escalated("market_price_action"),
  duplicate_action: escalated("duplicate_action"),
  // A longer window catches more orders as duplicates.
  duplicate_window_hours: (prev, next) => next.duplicate_window_hours > prev.duplicate_window_hours,
  subscriptions_allowed: (prev, next) => prev.subscriptions_allowed && !next.subscriptions_allowed,
  max_quantity_multiple_of_need: (prev, next) => next.max_quantity_multiple_of_need < prev.max_quantity_multiple_of_need,
  human_approval_required: (prev, next) => !prev.human_approval_required && next.human_approval_required,
  certificate_ttl_minutes: (prev, next) => next.certificate_ttl_minutes < prev.certificate_ttl_minutes,
};

/** The security fields `next` tightens relative to `prev`, in MANDATE_SECURITY_FIELDS order. */
export function tightenedMandateFields(prev: SpendMandate, next: SpendMandate): MandateSecurityField[] {
  return MANDATE_SECURITY_FIELDS.filter((f) => MANDATE_TIGHTENING[f](prev, next));
}

export function mandateTightened(prev: SpendMandate, next: SpendMandate): boolean {
  return MANDATE_SECURITY_FIELDS.some((f) => MANDATE_TIGHTENING[f](prev, next));
}
