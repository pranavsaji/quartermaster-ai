import type { Cart } from "@qm/trustrail";
import { buildSupplierQuote, packsFor, type CatalogOffer, type StorefrontQuoteLine, type SupplierProfile } from "./quote";

export interface CandidateEvaluation {
  offer: CatalogOffer;
  supplier: SupplierProfile;
  packs: number;
  units: number;
  quote: Cart;
  delivered_unit_cost_minor: number;
  eligible: boolean;
  ineligible_reasons: string[];
  quarantined: boolean;
  rank: number | null;
}

export interface CompareInput {
  needed_units: number;
  currency: string;
  offers: { offer: CatalogOffer; supplier: SupplierProfile; storefront_lines: StorefrontQuoteLine[]; quarantined: boolean }[];
  required_by?: Date | null;
  now: Date;
}

/**
 * Delivered unit cost = (items + shipping + tax + fees) / usable units.
 * A larger pack at a higher sticker price can be cheaper per usable unit, and a cheap listing
 * with a high shipping charge can be more expensive; ranking on delivered cost captures both.
 */
export function deliveredUnitCost(quote: Cart, units: number): number {
  if (units <= 0) return Number.POSITIVE_INFINITY;
  return quote.total_minor / units;
}

export function compareOffers(input: CompareInput): CandidateEvaluation[] {
  const evaluations: CandidateEvaluation[] = input.offers.map(({ offer, supplier, storefront_lines, quarantined }) => {
    const packs = packsFor(input.needed_units, offer.pack_quantity);
    const units = packs * offer.pack_quantity;
    const quote = buildSupplierQuote(supplier, [{ offer, packs }], input.currency, storefront_lines);
    const reasons: string[] = [];
    if (!supplier.active) reasons.push("Supplier inactive");
    if (!supplier.approved) reasons.push("Supplier not on approved list — recommend for review only");
    if (!supplier.checkout_eligible) reasons.push("Supplier does not accept sandbox checkout");
    if (!offer.in_stock) reasons.push("Out of stock");
    if (offer.currency !== input.currency) reasons.push(`Priced in ${offer.currency}`);
    // Quarantine is intentionally NOT an eligibility rule here. The planner is the untrusted
    // side of the boundary; TrustRail enforces quarantine when it evaluates the cart.
    if (input.required_by) {
      const arrival = input.now.getTime() + supplier.lead_time_days * 86_400_000;
      if (arrival > input.required_by.getTime() + 86_400_000 - 1)
        reasons.push(`Arrives after required date (lead time ${supplier.lead_time_days}d)`);
    }
    return {
      offer,
      supplier,
      packs,
      units,
      quote,
      delivered_unit_cost_minor: deliveredUnitCost(quote, units),
      eligible: reasons.length === 0,
      ineligible_reasons: reasons,
      quarantined,
      rank: null,
    };
  });

  const ranked = evaluations
    .filter((e) => e.eligible)
    .sort(
      (a, b) =>
        a.delivered_unit_cost_minor - b.delivered_unit_cost_minor ||
        a.quote.total_minor - b.quote.total_minor ||
        a.supplier.lead_time_days - b.supplier.lead_time_days ||
        a.offer.sku.localeCompare(b.offer.sku),
    );
  ranked.forEach((e, i) => (e.rank = i + 1));
  return evaluations.sort((a, b) => (a.rank ?? 999) - (b.rank ?? 999) || a.delivered_unit_cost_minor - b.delivered_unit_cost_minor);
}
