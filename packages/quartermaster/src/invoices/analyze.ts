import type { InvoiceStatus, Severity } from "@qm/contracts";
import { digest, detectPromptInjection, type InjectionVerdict } from "@qm/trustrail";

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
  const core = n.normalize("NFKC").toUpperCase().replace(/[^A-Z0-9]/g, "");
  return core.replace(/^(INVOICE|INV)(?=[A-Z0-9])/, "").replace(/^0+(?=\d)/, "");
}

/** Content fingerprint independent of the invoice number, to catch re-numbered resubmissions. */
export function invoiceContentHash(inv: Pick<InvoiceInput, "supplier_id" | "currency" | "lines" | "total_minor" | "purchase_order_id">): string {
  return digest({
    supplier_id: inv.supplier_id,
    purchase_order_id: inv.purchase_order_id,
    currency: inv.currency,
    total_minor: inv.total_minor,
    lines: inv.lines
      .map((l) => ({ sku: l.sku ?? null, quantity: l.quantity, unit_price_minor: l.unit_price_minor, line_total_minor: l.line_total_minor }))
      .sort((a, b) => `${a.sku}:${a.line_total_minor}`.localeCompare(`${b.sku}:${b.line_total_minor}`)),
  });
}

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
  add("DUPLICATE_INVOICE_NUMBER", numberDupes.length === 0, "HIGH", numberDupes.length === 0 ? "Invoice number not seen before." : `Invoice number already recorded (${numberDupes.length}).`);

  const contentDupes = sameSupplier.filter((e) => e.content_hash === content_hash && !numberDupes.includes(e));
  add("DUPLICATE_CONTENT", contentDupes.length === 0, "HIGH", contentDupes.length === 0 ? "No invoice with identical content." : "An invoice with identical lines and total exists under a different number.");

  const poDupes = inv.purchase_order_id
    ? sameSupplier.filter((e) => e.purchase_order_id === inv.purchase_order_id && e.status === "MATCHED" && !numberDupes.includes(e))
    : [];
  add("PO_ALREADY_INVOICED", poDupes.length === 0, "HIGH", poDupes.length === 0 ? "Purchase order not yet settled by another invoice." : "Purchase order was already settled by another invoice.");

  // Arithmetic
  const lineIssues = inv.lines.filter((l) => l.quantity * l.unit_price_minor !== l.line_total_minor);
  const sum = inv.lines.reduce((a, l) => a + l.line_total_minor, 0);
  add("ARITHMETIC", lineIssues.length === 0 && sum === inv.total_minor, "MEDIUM", lineIssues.length === 0 && sum === inv.total_minor ? "Lines and total reconcile." : `Lines sum to ${sum}, invoice states ${inv.total_minor}.`);

  if (!po) {
    add("PO_EXISTS", false, "MEDIUM", inv.purchase_order_id ? "Referenced purchase order not found." : "No purchase order referenced.");
  } else {
    add("PO_EXISTS", true, "MEDIUM", `Matched to purchase order ${po.id}.`);
    add("SUPPLIER_MATCH", po.supplier_id === inv.supplier_id, "HIGH", po.supplier_id === inv.supplier_id ? "Supplier matches the order." : "Invoice supplier differs from the order's supplier.");
    add("CURRENCY_MATCH", po.currency === inv.currency, "HIGH", `Invoice ${inv.currency}, order ${po.currency}.`);
    add("PAYMENT_VERIFIED", po.payment_completed, "MEDIUM", po.payment_completed ? "A verified PayPal capture exists for this order." : "No verified payment for this order yet.");
    add("TOTAL_WITHIN_APPROVED", inv.total_minor <= po.total_minor, "HIGH", inv.total_minor <= po.total_minor ? "Invoice total is within the approved amount." : `Invoice exceeds approved order total by ${inv.total_minor - po.total_minor}.`);

    const poBySku = new Map(po.items.filter((i) => i.sku).map((i) => [i.sku!, i]));
    const unknown: string[] = [];
    const overQty: string[] = [];
    const priceDiff: string[] = [];
    // Charges without a SKU (tax, shipping) may match a non-product order line of the same
    // amount; each order line can be matched at most once.
    const chargeLines = po.items.filter((i) => i.kind !== "PRODUCT").map((i) => ({ ...i, used: false }));
    for (const l of inv.lines) {
      const match = l.sku ? poBySku.get(l.sku) : undefined;
      if (!match) {
        const charge = !l.sku ? chargeLines.find((c) => !c.used && c.line_total_minor === l.line_total_minor && l.quantity === 1) : undefined;
        if (charge) {
          charge.used = true;
          continue;
        }
        unknown.push(l.description);
        continue;
      }
      if (l.quantity > match.quantity) overQty.push(l.sku!);
      if (l.unit_price_minor !== match.unit_price_minor) priceDiff.push(l.sku!);
    }
    add("LINES_ON_ORDER", unknown.length === 0, "HIGH", unknown.length === 0 ? "Every invoice line is on the order." : `Lines not on the approved order: ${unknown.join("; ")}.`);
    add("QUANTITIES_WITHIN_ORDER", overQty.length === 0, "MEDIUM", overQty.length === 0 ? "Quantities within ordered amounts." : `Over-billed quantities: ${overQty.join(", ")}.`);
    add("PRICES_MATCH_ORDER", priceDiff.length === 0, "MEDIUM", priceDiff.length === 0 ? "Unit prices match the order." : `Price differences: ${priceDiff.join(", ")}.`);
  }

  let injection: InjectionVerdict | null = null;
  const text = [inv.notes ?? "", ...inv.lines.map((l) => l.description)].join("\n");
  if (text.trim()) {
    injection = detectPromptInjection(text);
    add("NO_EMBEDDED_INSTRUCTIONS", !injection.suspicious, injection.severity, injection.suspicious ? `Suspicious instructions in invoice text (${injection.signals.map((s) => s.rule).join(", ")}).` : "No embedded instructions found.");
  }

  const duplicate = numberDupes.length > 0 || contentDupes.length > 0 || poDupes.length > 0;
  const failed = checks.filter((c) => !c.passed);
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
