import type { LineKind, ProductCategory } from "@qm/contracts";
import { digest } from "./canonical";

export interface CartLine {
  kind: LineKind;
  /** Supplier SKU for PRODUCT lines; fee/term code for SHIPPING and FEE lines; null for TAX. */
  sku: string | null;
  description: string;
  category: ProductCategory | null;
  quantity: number;
  unit_price_minor: number;
  line_total_minor: number;
  /** Supplier-declared recurring charge (subscription / auto-renew). */
  recurring?: boolean;
}

export interface Cart {
  supplier_id: string;
  currency: string;
  lines: CartLine[];
  subtotal_minor: number;
  shipping_minor: number;
  tax_minor: number;
  fees_minor: number;
  total_minor: number;
}

export interface CartTotals {
  subtotal_minor: number;
  shipping_minor: number;
  tax_minor: number;
  fees_minor: number;
  total_minor: number;
}

export function sumLines(lines: CartLine[]): CartTotals {
  const by = (kind: LineKind) => lines.filter((l) => l.kind === kind).reduce((acc, l) => acc + l.line_total_minor, 0);
  const subtotal_minor = by("PRODUCT");
  const shipping_minor = by("SHIPPING");
  const tax_minor = by("TAX");
  const fees_minor = by("FEE");
  return {
    subtotal_minor,
    shipping_minor,
    tax_minor,
    fees_minor,
    total_minor: subtotal_minor + shipping_minor + tax_minor + fees_minor,
  };
}

export function buildCart(supplier_id: string, currency: string, lines: CartLine[]): Cart {
  return { supplier_id, currency, lines, ...sumLines(lines) };
}

export interface ArithmeticIssue {
  path: string;
  expected: number;
  actual: number;
}

/** Verifies every line multiplies out and every stated total matches the lines. */
export function checkCartArithmetic(cart: Cart): ArithmeticIssue[] {
  const issues: ArithmeticIssue[] = [];
  cart.lines.forEach((l, i) => {
    for (const [field, v] of [
      ["quantity", l.quantity],
      ["unit_price_minor", l.unit_price_minor],
      ["line_total_minor", l.line_total_minor],
    ] as const) {
      if (!Number.isSafeInteger(v) || v < 0) issues.push({ path: `lines[${i}].${field}`, expected: Math.max(0, Math.trunc(v) || 0), actual: v });
    }
    if (l.kind === "PRODUCT" && l.quantity <= 0) {
      issues.push({ path: `lines[${i}].quantity`, expected: 1, actual: l.quantity });
    }
    const expected = l.quantity * l.unit_price_minor;
    if (l.kind !== "TAX" && expected !== l.line_total_minor) {
      issues.push({ path: `lines[${i}].line_total_minor`, expected, actual: l.line_total_minor });
    }
  });
  const totals = sumLines(cart.lines);
  for (const key of Object.keys(totals) as (keyof CartTotals)[]) {
    if (totals[key] !== cart[key]) issues.push({ path: key, expected: totals[key], actual: cart[key] });
  }
  return issues;
}

/**
 * The cart hash binds an approval to the exact commercial content of a cart: supplier,
 * currency, every line (in order) and every total. Free-text descriptions are included so a
 * supplier cannot silently rename a line after approval.
 */
export function computeCartHash(cart: Cart): string {
  return digest({
    v: 1,
    supplier_id: cart.supplier_id,
    currency: cart.currency,
    lines: cart.lines.map((l) => ({
      kind: l.kind,
      sku: l.sku,
      description: l.description,
      category: l.category,
      quantity: l.quantity,
      unit_price_minor: l.unit_price_minor,
      line_total_minor: l.line_total_minor,
      recurring: l.recurring === true,
    })),
    subtotal_minor: cart.subtotal_minor,
    shipping_minor: cart.shipping_minor,
    tax_minor: cart.tax_minor,
    fees_minor: cart.fees_minor,
    total_minor: cart.total_minor,
  });
}
