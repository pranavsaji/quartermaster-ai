import type { ProductCategory } from "@qm/contracts";
import { applyBps } from "@qm/contracts";
import { buildCart, type Cart, type CartLine } from "@qm/trustrail";

export interface SupplierProfile {
  id: string;
  name: string;
  approved: boolean;
  active: boolean;
  checkout_eligible: boolean;
  lead_time_days: number;
  tax_rate_bps: number;
  fee_terms: { code: string; label: string; kind: "SHIPPING" | "FEE"; amount_minor: number; waived_over_minor: number | null }[];
}

export interface CatalogOffer {
  id: string;
  supplier_id: string;
  sku: string;
  title: string;
  description: string;
  category: ProductCategory;
  inventory_item_id: string | null;
  pack_quantity: number;
  unit_price_minor: number;
  currency: string;
  in_stock: boolean;
  recurring: boolean;
}

/**
 * Extra lines a supplier storefront returned in its quote response. In this deployment the
 * storefront is a controlled sandbox supplier; adversarial storefronts are seeded fixtures used
 * to demonstrate TrustRail. Quote lines are untrusted: they are passed through verbatim so the
 * policy engine, not the planner, decides whether they are legitimate.
 */
export interface StorefrontQuoteLine {
  kind: "FEE" | "SHIPPING";
  code: string;
  description: string;
  amount_minor: number;
  recurring?: boolean;
}

export interface QuoteRequestLine {
  offer: CatalogOffer;
  packs: number;
}

/** Builds the cart a supplier would charge for the requested packs, from published terms. */
export function buildSupplierQuote(
  supplier: SupplierProfile,
  lines: QuoteRequestLine[],
  currency: string,
  storefrontLines: StorefrontQuoteLine[] = [],
): Cart {
  const cartLines: CartLine[] = lines.map(({ offer, packs }) => ({
    kind: "PRODUCT",
    sku: offer.sku,
    description: offer.title,
    category: offer.category,
    quantity: packs,
    unit_price_minor: offer.unit_price_minor,
    line_total_minor: packs * offer.unit_price_minor,
    recurring: offer.recurring,
  }));
  const subtotal = cartLines.reduce((a, l) => a + l.line_total_minor, 0);

  for (const term of supplier.fee_terms) {
    const waived = term.waived_over_minor !== null && subtotal >= term.waived_over_minor;
    const amount = waived ? 0 : term.amount_minor;
    cartLines.push({
      kind: term.kind,
      sku: term.code,
      description: waived ? `${term.label} (waived)` : term.label,
      category: null,
      quantity: 1,
      unit_price_minor: amount,
      line_total_minor: amount,
      recurring: false,
    });
  }
  for (const extra of storefrontLines) {
    cartLines.push({
      kind: extra.kind,
      sku: extra.code,
      description: extra.description,
      category: null,
      quantity: 1,
      unit_price_minor: extra.amount_minor,
      line_total_minor: extra.amount_minor,
      recurring: extra.recurring === true,
    });
  }
  if (supplier.tax_rate_bps > 0) {
    const tax = applyBps(subtotal, supplier.tax_rate_bps);
    cartLines.push({
      kind: "TAX",
      sku: null,
      description: `Sales tax (${(supplier.tax_rate_bps / 100).toFixed(2)}%)`,
      category: null,
      quantity: 1,
      unit_price_minor: tax,
      line_total_minor: tax,
      recurring: false,
    });
  }
  return buildCart(supplier.id, currency, cartLines);
}

/** Packs needed to cover at least `units`, never zero for a positive need. */
export function packsFor(units: number, packQuantity: number): number {
  if (units <= 0) return 0;
  return Math.ceil(units / Math.max(1, packQuantity));
}
