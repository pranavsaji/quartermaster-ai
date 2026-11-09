import { buildSupplierQuote, type CatalogOffer, type StorefrontQuoteLine, type SupplierProfile } from "../suppliers/quote";
import type { CandidateEvaluation } from "../suppliers/compare";
import type { Cart } from "@qm/trustrail";

export interface PlannedCart {
  supplier: SupplierProfile;
  cart: Cart;
  lines: { offer: CatalogOffer; packs: number; units: number; inventory_item_id: string }[];
  candidate_ids: string[];
}

export interface PlanInput {
  /** Ranked candidate evaluations per inventory item id (output of compareOffers). */
  candidates_by_item: Map<string, (CandidateEvaluation & { id: string })[]>;
  currency: string;
  storefront_lines_by_supplier: Map<string, StorefrontQuoteLine[]>;
  /** Suppliers excluded after a TrustRail BLOCK (re-planning). */
  excluded_supplier_ids: Set<string>;
  excluded_candidate_ids: Set<string>;
}

/**
 * Builds one cart per supplier from the best eligible candidate for each item.
 *
 * Strategy: pick the top-ranked eligible candidate per item, then group by supplier so each
 * supplier receives a single order (one PayPal payment). Items whose best supplier was excluded
 * fall through to the next eligible candidate. Returns carts ordered by total ascending.
 */
export function planCarts(input: PlanInput): { carts: PlannedCart[]; unfilled_item_ids: string[] } {
  const chosen = new Map<string, { candidate: CandidateEvaluation & { id: string }; item: string }[]>();
  const unfilled: string[] = [];

  for (const [itemId, candidates] of input.candidates_by_item) {
    const pick = candidates.find(
      (c) => c.eligible && c.rank !== null && !input.excluded_supplier_ids.has(c.supplier.id) && !input.excluded_candidate_ids.has(c.id),
    );
    if (!pick) {
      unfilled.push(itemId);
      continue;
    }
    const list = chosen.get(pick.supplier.id) ?? [];
    list.push({ candidate: pick, item: itemId });
    chosen.set(pick.supplier.id, list);
  }

  const carts: PlannedCart[] = [];
  for (const picks of chosen.values()) {
    const supplier = picks[0]!.candidate.supplier;
    const lines = picks.map((p) => ({ offer: p.candidate.offer, packs: p.candidate.packs, units: p.candidate.units, inventory_item_id: p.item }));
    const cart = buildSupplierQuote(
      supplier,
      lines.map((l) => ({ offer: l.offer, packs: l.packs })),
      input.currency,
      input.storefront_lines_by_supplier.get(supplier.id) ?? [],
    );
    carts.push({ supplier, cart, lines, candidate_ids: picks.map((p) => p.candidate.id) });
  }
  carts.sort((a, b) => a.cart.total_minor - b.cart.total_minor);
  return { carts, unfilled_item_ids: unfilled };
}

/**
 * Trims a cart to fit a spending cap by dropping the lowest-priority lines (items with the most
 * remaining days of cover first). Never adds lines or changes quantities upward.
 */
export function fitToBudget(
  planned: PlannedCart,
  capMinor: number,
  priorityByItem: Map<string, number>,
  currency: string,
  storefrontLines: StorefrontQuoteLine[],
): PlannedCart | null {
  let lines = [...planned.lines].sort((a, b) => (priorityByItem.get(a.inventory_item_id) ?? 0) - (priorityByItem.get(b.inventory_item_id) ?? 0));
  while (lines.length > 0) {
    const cart = buildSupplierQuote(planned.supplier, lines.map((l) => ({ offer: l.offer, packs: l.packs })), currency, storefrontLines);
    if (cart.total_minor <= capMinor) {
      const keep = new Set(lines.map((l) => l.offer.sku));
      return {
        ...planned,
        cart,
        lines,
        candidate_ids: planned.candidate_ids.filter((_, i) => keep.has(planned.lines[i]!.offer.sku)),
      };
    }
    lines = lines.slice(0, -1);
  }
  return null;
}
