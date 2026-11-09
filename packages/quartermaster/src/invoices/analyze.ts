import type { InvoiceStatus, Severity } from "@qm/contracts";
import { canonicalize, digest, detectPromptInjection, type InjectionVerdict } from "@qm/trustrail";

export interface InvoiceLine {
  sku?: string | null;
  description: string;
  quantity: number;
  unit_price_minor: number;
  line_total_minor: number;
}

export interface InvoiceInput {
  supplier_id: string;
  purchase_order_id: string | null;
  invoice_number: string;
  currency: string;
  lines: InvoiceLine[];
  total_minor: number;
  notes?: string;
}

export interface PurchaseOrderView {
  id: string;
  supplier_id: string;
  currency: string;
  total_minor: number;
  status: string;
  payment_completed: boolean;
  items: { kind: string; sku: string | null; quantity: number; unit_price_minor: number; line_total_minor: number }[];
}

export interface ExistingInvoiceView {
  id: string;
  supplier_id: string;
  invoice_number: string;
  purchase_order_id: string | null;
  total_minor: number;
  content_hash: string;
  status: InvoiceStatus;
}

export interface InvoiceCheck {
  check: string;
  passed: boolean;
  severity: Severity | null;
  detail: string;
}

export interface InvoiceAnalysis {
  status: InvoiceStatus;
  settlement_allowed: boolean;
  checks: InvoiceCheck[];
  content_hash: string;
  duplicate_of: string[];
  injection: InjectionVerdict | null;
}

/**
 * Canonical alphanumeric core of an invoice number, so "INV-0042", "Invoice #42" and "inv42"
 * compare equal. NFKC folds full-width and compatibility characters before stripping.
 */
export function normalizeInvoiceNumber(n: string): string {
  let core = String(n ?? "")
    .normalize("NFKC")
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, "");
  // Strip to a fixed point so the function is idempotent: "INVINVOICE7" → "INVOICE7" → "7"
  // in one call, never "7" only on a second call. Each pass shortens the string or stops.
  for (;;) {
    const next = core.replace(/^(INVOICE|INV)(?=[A-Z0-9])/, "").replace(/^0+(?=\d)/, "");
    if (next === core) return core;
    core = next;
  }
}

type HashableInvoice = Pick<InvoiceInput, "supplier_id" | "currency" | "lines" | "total_minor" | "purchase_order_id">;

/** Version of `invoiceContentHash`; its output is prefixed `v2:` so stored hashes are self-describing. */
export const INVOICE_HASH_VERSION = 2;
export const INVOICE_HASH_PREFIX = `v${INVOICE_HASH_VERSION}:`;

const hashLine = (l: InvoiceLine) => ({
  sku: l.sku ?? null,
  quantity: l.quantity,
  unit_price_minor: l.unit_price_minor,
  line_total_minor: l.line_total_minor,
});

/**
 * Content fingerprint independent of the invoice number, to catch re-numbered resubmissions.
 * Output: `v2:sha256:<hex>`.
 *
 * Lines are ordered by their full canonical encoding compared by UTF-16 code unit, so the hash
 * is independent of line order (no sort-key ties) and of the runtime's locale/ICU data, which
 * `localeCompare` is not.
 */
export function invoiceContentHash(inv: HashableInvoice): string {
  const lines = inv.lines
    .map(hashLine)
    .map((line) => ({ line, key: canonicalize(line) }))
    .sort((a, b) => (a.key < b.key ? -1 : a.key > b.key ? 1 : 0))
    .map((x) => x.line);
  return (
    INVOICE_HASH_PREFIX +
    digest({
      supplier_id: inv.supplier_id,
      purchase_order_id: inv.purchase_order_id,
      currency: inv.currency,
      total_minor: inv.total_minor,
      lines,
    })
  );
}

/**
 * The v1 content hash (unprefixed `sha256:<hex>`), byte-for-byte the previous algorithm, kept
 * so invoices stored before v2 still catch re-numbered resubmissions. Do not use it for new
 * rows: it depends on line order when SKU and line total tie, and on locale collation.
 */
export function legacyInvoiceContentHash(inv: HashableInvoice): string {
  return digest({
    supplier_id: inv.supplier_id,
    purchase_order_id: inv.purchase_order_id,
    currency: inv.currency,
    total_minor: inv.total_minor,
    lines: inv.lines.map(hashLine).sort((a, b) => `${a.sku}:${a.line_total_minor}`.localeCompare(`${b.sku}:${b.line_total_minor}`)),
  });
}

/**
 * Checks reported for visibility that do not by themselves turn a match into a discrepancy.
 *
 * ORDER_FULLY_INVOICED: an invoice that bills *less* than was ordered (a split invoice, a
 * back-order, a short shipment) never over-charges the buyer, so it may still reconcile; the
 * failed LOW check tells the owner to expect a follow-up invoice or a credit. Billing *more*
 * than was ordered is QUANTITIES_WITHIN_ORDER and does block settlement.
 */
const ADVISORY_CHECKS = new Set(["ORDER_FULLY_INVOICED"]);

/**
 * Three-way match of an invoice against the purchase order and payment, plus duplicate detection.
 * The result never triggers a payment: payment already happened through the authorised PayPal
 * flow. `settlement_allowed` only marks the invoice as reconciled for bookkeeping.
 */
export function analyzeInvoice(inv: InvoiceInput, po: PurchaseOrderView | null, existing: ExistingInvoiceView[]): InvoiceAnalysis {
  const checks: InvoiceCheck[] = [];
  const add = (check: string, passed: boolean, severity: Severity, detail: string) =>
    checks.push({ check, passed, severity: passed ? null : severity, detail });

  const content_hash = invoiceContentHash(inv);
  const normalized = normalizeInvoiceNumber(inv.invoice_number);
  const sameSupplier = existing.filter((e) => e.supplier_id === inv.supplier_id);

  const numberDupes = sameSupplier.filter((e) => normalizeInvoiceNumber(e.invoice_number) === normalized);
  add(
    "DUPLICATE_INVOICE_NUMBER",
    numberDupes.length === 0,
    "HIGH",
    numberDupes.length === 0 ? "Invoice number not seen before." : `Invoice number already recorded (${numberDupes.length}).`,
  );

  // Rows stored before v2 carry an unprefixed legacy hash; compare those against the legacy
  // fingerprint of this invoice so the algorithm change does not open a resubmission window.
  const legacy_hash = sameSupplier.some((e) => !e.content_hash.startsWith(INVOICE_HASH_PREFIX)) ? legacyInvoiceContentHash(inv) : null;
  const contentDupes = sameSupplier.filter(
    (e) => (e.content_hash === content_hash || (legacy_hash !== null && e.content_hash === legacy_hash)) && !numberDupes.includes(e),
  );
  add(
    "DUPLICATE_CONTENT",
    contentDupes.length === 0,
    "HIGH",
    contentDupes.length === 0
      ? "No invoice with identical content."
      : "An invoice with identical lines and total exists under a different number.",
  );

  const poDupes = inv.purchase_order_id
    ? sameSupplier.filter((e) => e.purchase_order_id === inv.purchase_order_id && e.status === "MATCHED" && !numberDupes.includes(e))
    : [];
  add(
    "PO_ALREADY_INVOICED",
    poDupes.length === 0,
    "HIGH",
    poDupes.length === 0 ? "Purchase order not yet settled by another invoice." : "Purchase order was already settled by another invoice.",
  );

  // Arithmetic
  const lineIssues = inv.lines.filter((l) => l.quantity * l.unit_price_minor !== l.line_total_minor);
  const sum = inv.lines.reduce((a, l) => a + l.line_total_minor, 0);
  add(
    "ARITHMETIC",
    lineIssues.length === 0 && sum === inv.total_minor,
    "MEDIUM",
    lineIssues.length === 0 && sum === inv.total_minor
      ? "Lines and total reconcile."
      : `Lines sum to ${sum}, invoice states ${inv.total_minor}.`,
  );

  if (!po) {
    add("PO_EXISTS", false, "MEDIUM", inv.purchase_order_id ? "Referenced purchase order not found." : "No purchase order referenced.");
  } else {
    add("PO_EXISTS", true, "MEDIUM", `Matched to purchase order ${po.id}.`);
    add(
      "SUPPLIER_MATCH",
      po.supplier_id === inv.supplier_id,
      "HIGH",
      po.supplier_id === inv.supplier_id ? "Supplier matches the order." : "Invoice supplier differs from the order's supplier.",
    );
    add("CURRENCY_MATCH", po.currency === inv.currency, "HIGH", `Invoice ${inv.currency}, order ${po.currency}.`);
    add(
      "PAYMENT_VERIFIED",
      po.payment_completed,
      "MEDIUM",
      po.payment_completed ? "A verified PayPal capture exists for this order." : "No verified payment for this order yet.",
    );
    add(
      "TOTAL_WITHIN_APPROVED",
      inv.total_minor <= po.total_minor,
      "HIGH",
      inv.total_minor <= po.total_minor
        ? "Invoice total is within the approved amount."
        : `Invoice exceeds approved order total by ${inv.total_minor - po.total_minor}.`,
    );

    // Ordered quantity per SKU and per (SKU, unit price). Quantities are summed on both sides so
    // splitting one SKU across several invoice lines cannot bill more than was ordered, and
    // prices are matched together with quantities: a SKU ordered as 5 @ $10 + 5 @ $12 may not
    // be billed as 10 @ $12.
    const ordered = new Map<string, { kind: string; quantity: number; byPrice: Map<number, number> }>();
    for (const i of po.items) {
      if (!i.sku) continue;
      const o = ordered.get(i.sku) ?? { kind: i.kind, quantity: 0, byPrice: new Map<number, number>() };
      o.quantity += i.quantity;
      o.byPrice.set(i.unit_price_minor, (o.byPrice.get(i.unit_price_minor) ?? 0) + i.quantity);
      ordered.set(i.sku, o);
    }
    const invoiced = new Map<string, number>();
    const invoicedByPrice = new Map<string, Map<number, number>>();
    const unknown: string[] = [];
    // Charges without a SKU (tax, shipping) may match a non-product order line of the same
    // amount; each order line can be matched at most once.
    const chargeLines = po.items.filter((i) => i.kind !== "PRODUCT").map((i) => ({ ...i, used: false }));
    for (const l of inv.lines) {
      const match = l.sku ? ordered.get(l.sku) : undefined;
      if (!match) {
        const charge = !l.sku
          ? chargeLines.find((c) => !c.used && c.line_total_minor === l.line_total_minor && l.quantity === 1)
          : undefined;
        if (charge) {
          charge.used = true;
          continue;
        }
        unknown.push(l.description);
        continue;
      }
      invoiced.set(l.sku!, (invoiced.get(l.sku!) ?? 0) + l.quantity);
      const byPrice = invoicedByPrice.get(l.sku!) ?? new Map<number, number>();
      byPrice.set(l.unit_price_minor, (byPrice.get(l.unit_price_minor) ?? 0) + l.quantity);
      invoicedByPrice.set(l.sku!, byPrice);
    }
    const overSkus = new Set([...invoiced].filter(([sku, qty]) => qty > ordered.get(sku)!.quantity).map(([sku]) => sku));
    const overQty = [...overSkus].map((sku) => `${sku} (${invoiced.get(sku)} of ${ordered.get(sku)!.quantity})`);
    // A price discrepancy is any unit billed at a price it was not ordered at: a price that is
    // not on the order at all, or more units at price P than were ordered at P. (For an
    // over-billed SKU the excess units are already a quantity discrepancy, so only unknown
    // prices are reported there.)
    const priceDiff = [...invoicedByPrice]
      .filter(([sku, byPrice]) =>
        [...byPrice].some(([price, qty]) => {
          const orderedAtPrice = ordered.get(sku)!.byPrice.get(price) ?? 0;
          return orderedAtPrice === 0 || (!overSkus.has(sku) && qty > orderedAtPrice);
        }),
      )
      .map(([sku]) => sku);
    const uninvoiced = [...ordered]
      .filter(([sku, o]) => o.kind === "PRODUCT" && (invoiced.get(sku) ?? 0) < o.quantity)
      .map(([sku, o]) => `${sku} (${invoiced.get(sku) ?? 0} of ${o.quantity})`);
    add(
      "LINES_ON_ORDER",
      unknown.length === 0,
      "HIGH",
      unknown.length === 0 ? "Every invoice line is on the order." : `Lines not on the approved order: ${unknown.join("; ")}.`,
    );
    add(
      "QUANTITIES_WITHIN_ORDER",
      overQty.length === 0,
      "MEDIUM",
      overQty.length === 0 ? "Quantities within ordered amounts." : `Over-billed quantities: ${overQty.join(", ")}.`,
    );
    add(
      "PRICES_MATCH_ORDER",
      priceDiff.length === 0,
      "MEDIUM",
      priceDiff.length === 0 ? "Unit prices match the order." : `Price differences: ${priceDiff.join(", ")}.`,
    );
    add(
      "ORDER_FULLY_INVOICED",
      uninvoiced.length === 0,
      "LOW",
      uninvoiced.length === 0
        ? "Every ordered product is invoiced."
        : `Ordered products not (fully) invoiced: ${uninvoiced.join(", ")}. Expect a follow-up invoice or a credit for any short shipment.`,
    );
  }

  let injection: InjectionVerdict | null = null;
  const text = [inv.notes ?? "", ...inv.lines.map((l) => l.description)].join("\n");
  if (text.trim()) {
    injection = detectPromptInjection(text);
    add(
      "NO_EMBEDDED_INSTRUCTIONS",
      !injection.suspicious,
      injection.severity,
      injection.suspicious
        ? `Suspicious instructions in invoice text (${injection.signals.map((s) => s.rule).join(", ")}).`
        : "No embedded instructions found.",
    );
  }

  const duplicate = numberDupes.length > 0 || contentDupes.length > 0 || poDupes.length > 0;
  const failed = checks.filter((c) => !c.passed && !ADVISORY_CHECKS.has(c.check));
  const status: InvoiceStatus = duplicate ? "DUPLICATE" : !po ? "UNMATCHED" : failed.length > 0 ? "DISCREPANCY" : "MATCHED";

  return {
    status,
    settlement_allowed: status === "MATCHED",
    checks,
    content_hash,
    duplicate_of: [...new Set([...numberDupes, ...contentDupes, ...poDupes].map((e) => e.id))],
    injection,
  };
}
