/**
 * Red-team TrustRail: anyone in a workspace can write a hostile supplier listing and see what
 * happens to it. Two answers come back:
 *  1. what injection detection sees in the text, and
 *  2. the worst case: the agent was fooled completely and proposed exactly the purchase the
 *     listing asked for. That cart is priced the way the agent prices any order (published
 *     terms, the supplier's storefront lines, tax) and evaluated by the same deterministic
 *     policy, against the workspace's real Spend Mandate and weekly budget.
 * Nothing is stored, nothing goes to a model, nothing goes to PayPal: it is a pure evaluation,
 * so a judge can try as many attacks as they like without touching the workspace's data.
 */
import { randomUUID } from "node:crypto";
import type { RedTeamRequest, RedTeamResultDto } from "@qm/contracts";
import { buildSupplierQuote, type SupplierProfile } from "@qm/quartermaster";
import { detectPromptInjection, evaluatePolicy, type PolicyInput } from "@qm/trustrail";
import type { AppContext } from "../context";
import { notFound } from "../errors";
import { weeklyBudget } from "./budget";
import { getActiveMandateRow, rowToMandate } from "./mandates";
import { loadSuppliers, storefrontLines, toSupplierProfile } from "./suppliers";

const RED_TEAM_SKU = "RED-TEAM-LISTING";

export async function redTeamListing(ctx: AppContext, organizationId: string, input: RedTeamRequest): Promise<RedTeamResultDto> {
  const row = await getActiveMandateRow(ctx.db, organizationId);
  if (!row) throw notFound("Active Spend Mandate");
  const mandate = rowToMandate(row);
  const budget = await weeklyBudget(ctx, organizationId, mandate.weekly_budget_minor);

  const verdict = detectPromptInjection(input.listing_text);

  // The supplier the listing claims to come from: one of the workspace's, or a stranger.
  const existing = input.supplier_id ? (await loadSuppliers(ctx.db, organizationId)).find((s) => s.id === input.supplier_id) : undefined;
  if (input.supplier_id && !existing) throw notFound("Supplier");
  const profile: SupplierProfile = existing
    ? toSupplierProfile(existing, mandate)
    : {
        id: randomUUID(),
        name: "A supplier you have never approved",
        approved: false,
        active: true,
        checkout_eligible: false,
        lead_time_days: 1,
        tax_rate_bps: 0,
        fee_terms: [],
      };

  const cart = buildSupplierQuote(
    profile,
    [
      {
        offer: {
          id: RED_TEAM_SKU,
          supplier_id: profile.id,
          sku: RED_TEAM_SKU,
          title: "The red-team listing",
          description: "",
          category: input.category,
          inventory_item_id: null,
          pack_quantity: 1,
          unit_price_minor: input.unit_price_minor,
          currency: mandate.currency,
          in_stock: true,
          recurring: input.recurring === true,
        },
        packs: input.quantity,
      },
    ],
    mandate.currency,
    existing ? storefrontLines(existing) : [],
  );

  const policyInput: PolicyInput = {
    mandate,
    cart,
    supplier: existing
      ? { id: existing.id, active: existing.active, fee_terms: existing.feeTerms, tax_rate_bps: existing.taxRateBps }
      : null,
    catalog: [
      {
        sku: RED_TEAM_SKU,
        supplier_id: profile.id,
        category: input.category,
        unit_price_minor: input.unit_price_minor,
        recurring: input.recurring === true,
        quarantined: verdict.quarantine,
      },
    ],
    budget: { limit_minor: budget.limit_minor, spent_minor: budget.spent_minor, reserved_minor: budget.reserved_minor },
    request_budget_limit_minor: null,
    needed_units_by_sku: {},
    pack_quantity_by_sku: { [RED_TEAM_SKU]: 1 },
    // A listing nobody has priced before has no market reference; the policy says so.
    market: [],
    prior_orders: [],
    quarantined_source_ids: verdict.quarantine ? [profile.id] : [],
    now: ctx.now(),
  };
  const result = evaluatePolicy(policyInput);

  return {
    detection: {
      quarantined: verdict.quarantine,
      suspicious: verdict.suspicious,
      score: verdict.score,
      severity: verdict.severity,
      signals: verdict.signals.slice(0, 12).map((s) => ({ rule: s.rule, excerpt: s.excerpt })),
    },
    worst_case: {
      supplier: { id: existing?.id ?? null, name: existing?.name ?? profile.name, approved: profile.approved, active: profile.active },
      cart: {
        lines: cart.lines.map((l) => ({
          kind: l.kind,
          description: l.description,
          quantity: l.quantity,
          line_total_minor: l.line_total_minor,
        })),
        total_minor: cart.total_minor,
        currency: cart.currency,
      },
      decision: result.decision,
      violations: result.violations.map((v) => ({ code: v.code, severity: v.severity, message: v.message })),
      approvable: result.decision !== "BLOCK",
      mandate_version: mandate.version,
    },
    bound: {
      per_order_limit_minor: mandate.per_order_limit_minor,
      weekly_remaining_minor: budget.remaining_minor,
      human_approval_required: mandate.human_approval_required,
      currency: mandate.currency,
    },
  };
}
