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

/** Fields whose change must invalidate outstanding approvals issued under an older version. */
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
] as const satisfies readonly (keyof SpendMandate)[];

export function mandateTightened(prev: SpendMandate, next: SpendMandate): boolean {
  if (next.weekly_budget_minor < prev.weekly_budget_minor) return true;
  if (next.per_order_limit_minor < prev.per_order_limit_minor) return true;
  if (prev.approved_supplier_ids.some((s) => !next.approved_supplier_ids.includes(s))) return true;
  if (prev.allowed_categories.some((c) => !next.allowed_categories.includes(c))) return true;
  if (next.max_market_price_premium_pct < prev.max_market_price_premium_pct) return true;
  if (prev.market_price_action === "REVIEW" && next.market_price_action === "BLOCK") return true;
  if (prev.duplicate_action === "REVIEW" && next.duplicate_action === "BLOCK") return true;
  if (next.duplicate_window_hours > prev.duplicate_window_hours) return true;
  if (prev.subscriptions_allowed && !next.subscriptions_allowed) return true;
  if (next.max_quantity_multiple_of_need < prev.max_quantity_multiple_of_need) return true;
  if (prev.currency !== next.currency) return true;
  return false;
}
