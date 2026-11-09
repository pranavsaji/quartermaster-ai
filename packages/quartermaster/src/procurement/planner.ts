import { buildSupplierQuote, type CatalogOffer, type StorefrontQuoteLine, type SupplierProfile } from "../suppliers/quote";
import type { CandidateEvaluation } from "../suppliers/compare";
import type { Cart } from "@qm/trustrail";

export interface PlannedLine {
  offer: CatalogOffer;
  packs: number;
  units: number;
  /** The inventory item this line was planned for (the one needing the most packs, if merged). */
  inventory_item_id: string;
  /**
   * Every inventory item this line covers. More than one when several items share their best
   * offer: the cart then carries that product once (a SKU on two lines is an unauthorised line
   * to TrustRail), in the largest quantity any of them needs, never the sum.
   */
  inventory_item_ids: string[];
}

export interface PlannedCart {
  supplier: SupplierProfile;
  cart: Cart;
  lines: PlannedLine[];
  /** One candidate id per line, aligned with `lines`. */
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

type Pick = { candidate: CandidateEvaluation & { id: string }; item: string };

/** Identity of a product line on a supplier's cart. */
const offerKey = (offer: CatalogOffer) => `${offer.supplier_id}\u0000${offer.sku}`;

/**
 * Builds one cart per supplier from the best eligible candidate for each item.
 *
 * Strategy: pick the top-ranked eligible candidate per item, then group by supplier so each
 * supplier receives a single order (one PayPal payment). Items whose best supplier was excluded
 * fall through to the next eligible candidate. Items whose best candidate is the same offer share
 * one cart line (see `PlannedLine.inventory_item_ids`). Returns carts ordered by total ascending.
 */
export function planCarts(input: PlanInput): { carts: PlannedCart[]; unfilled_item_ids: string[] } {
  const chosen = new Map<string, Map<string, Pick[]>>();
  const unfilled: string[] = [];

  for (const [itemId, candidates] of input.candidates_by_item) {
    const pick = candidates.find(
      (c) => c.eligible && c.rank !== null && !input.excluded_supplier_ids.has(c.supplier.id) && !input.excluded_candidate_ids.has(c.id),
    );
    if (!pick) {
      unfilled.push(itemId);
      continue;
    }
    const bySupplier = chosen.get(pick.supplier.id) ?? new Map<string, Pick[]>();
    const sameOffer = bySupplier.get(offerKey(pick.offer)) ?? [];
    sameOffer.push({ candidate: pick, item: itemId });
    bySupplier.set(offerKey(pick.offer), sameOffer);
    chosen.set(pick.supplier.id, bySupplier);
  }

  const carts: PlannedCart[] = [];
  for (const byOffer of chosen.values()) {
    const groups = [...byOffer.values()];
    const supplier = groups[0]![0]!.candidate.supplier;
    // The pick needing the most packs leads its group; the first one wins a tie.
    const leads = groups.map((g) => g.reduce((best, p) => (p.candidate.packs > best.candidate.packs ? p : best)));
    const lines: PlannedLine[] = leads.map((lead, i) => ({
      offer: lead.candidate.offer,
      packs: lead.candidate.packs,
      units: lead.candidate.units,
      inventory_item_id: lead.item,
      inventory_item_ids: groups[i]!.map((p) => p.item),
    }));
    const cart = buildSupplierQuote(
      supplier,
      lines.map((l) => ({ offer: l.offer, packs: l.packs })),
      input.currency,
      input.storefront_lines_by_supplier.get(supplier.id) ?? [],
    );
    carts.push({ supplier, cart, lines, candidate_ids: leads.map((p) => p.candidate.id) });
  }
  carts.sort((a, b) => a.cart.total_minor - b.cart.total_minor);
  return { carts, unfilled_item_ids: unfilled };
}

/**
 * Trims a cart to fit a spending cap by dropping the lowest-priority lines (items with the most
 * remaining days of cover first). Never adds lines or changes quantities upward. The kept lines
 * stay in their planned order and `candidate_ids` stays aligned with them: lines are kept or
 * dropped by identity, never by SKU.
 */
export function fitToBudget(
  planned: PlannedCart,
  capMinor: number,
  priorityByItem: Map<string, number>,
  currency: string,
  storefrontLines: StorefrontQuoteLine[],
): PlannedCart | null {
  const quote = (lines: PlannedLine[]) =>
    buildSupplierQuote(
      planned.supplier,
      lines.map((l) => ({ offer: l.offer, packs: l.packs })),
      currency,
      storefrontLines,
    );
  let byPriority = [...planned.lines].sort(
    (a, b) => (priorityByItem.get(a.inventory_item_id) ?? 0) - (priorityByItem.get(b.inventory_item_id) ?? 0),
  );
  while (byPriority.length > 0) {
    const kept = new Set(byPriority);
    const lines = planned.lines.filter((l) => kept.has(l));
    const cart = quote(lines);
    if (cart.total_minor <= capMinor) {
      return { ...planned, cart, lines, candidate_ids: planned.candidate_ids.filter((_, i) => kept.has(planned.lines[i]!)) };
    }
    byPriority = byPriority.slice(0, -1);
  }
  return null;
}
