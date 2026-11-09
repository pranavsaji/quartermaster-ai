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
  /**
   * The invoice's lines, when the caller has them. Optional for backward compatibility; with
   * them, earlier partial invoices for the same order count towards the invoiced quantities, so
   * the follow-up for the remainder can be MATCHED (see "Partial invoices" below).
   */
  lines?: readonly InvoiceLine[];
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
 * Strips "INV"/"INVOICE" prefixes and leading zeros to a fixed point, so the result is idempotent.
 * With `numberWords` (v3) it also strips "NO", "NUMBER", "NUM", "NBR" and "NR" — but only right
 * before a digit, so "No. 42" and "Invoice Nr 42" become "42" while "NOVA-42" stays "NOVA42".
 */
function stripInvoicePrefix(joined: string, numberWords = false): string {
  // "INVINVOICE7" → "INVOICE7" → "7" in one call, never "7" only on a second call. Each pass
  // shortens the string or stops.
  let core = joined;
  for (;;) {
    let next = core.replace(/^(INVOICE|INV)(?=[A-Z0-9])/, "").replace(/^0+(?=\d)/, "");
    if (numberWords) next = next.replace(/^(?:NUMBER|NUM|NBR|NR|NO)(?=\d)/, "");
    if (next === core) return core;
    core = next;
  }
}

/** Every Unicode decimal digit (\p{Nd}: Arabic-Indic "٤٢", Devanagari "४२", …) as its ASCII digit. */
function asciiDigits(text: string): string {
  return text.replace(/\p{Nd}/gu, (d) => {
    const cp = d.codePointAt(0)!;
    if (cp >= 0x30 && cp <= 0x39) return d;
    // Decimal digits are encoded in runs of ten consecutive code points starting at zero, so the
    // value is the distance from the start of the run (runs of adjacent blocks stay aligned).
    let start = cp;
    while (start > 0 && /\p{Nd}/u.test(String.fromCodePoint(start - 1))) start--;
    return String((cp - start) % 10);
  });
}

/**
 * Version of `normalizeInvoiceNumber`. v2 maps non-Latin digits and keeps digit groups apart; v3
 * also strips "No."/"Number"/"Nr" before the digits, so "No. 42" equals "INV-42" and "#42";
 * `legacyNormalizeInvoiceNumber` is v1. `analyzeInvoice` re-normalises the raw numbers of
 * existing invoices on every call, so stored `invoice_number_normalized` values (v1 or v2) are
 * never compared with current output; they only feed a database index.
 */
export const INVOICE_NUMBER_NORMALIZATION_VERSION = 3;

/**
 * Canonical core of an invoice number, so "INV-0042", "Invoice #42" and "inv42" compare equal.
 *
 * - NFKC folds full-width and compatibility characters; "№" is a separator, not "NO".
 * - Every Unicode decimal digit becomes its ASCII digit: "№ ٤٢" → "42" and "№ ٥٠" → "50",
 *   where v1 dropped both to the same core.
 * - Separators between two digit groups are kept as a single "-": "2024-001" and "202-4001"
 *   stay distinct (v1 merged both into "2024001"). Separators next to a letter are dropped as
 *   before ("GLV-1001" → "GLV1001", "INV-0042" → "42").
 * - "INV"/"INVOICE" prefixes, "NO"/"NUMBER"/"NUM"/"NBR"/"NR" right before the digits (v3) and
 *   the leading zeros of the first group are stripped: "Invoice No. 0042" → "42".
 *
 * Output: [A-Z0-9] with "-" only between two digits. Idempotent. May be empty or digit-free
 * ("###", "DRAFT"); `isReadableInvoiceNumber` tells whether a core can identify an invoice.
 */
export function normalizeInvoiceNumber(n: string): string {
  const upper = asciiDigits(
    String(n ?? "")
      .replace(/№/g, " ")
      .normalize("NFKC"),
  ).toUpperCase();
  const groups = upper.split(/[^A-Z0-9]+/).filter(Boolean);
  let joined = "";
  for (const g of groups) joined += joined && /\d$/.test(joined) && /^\d/.test(g) ? `-${g}` : g;
  return stripInvoicePrefix(joined, true);
}

/** True when a normalised core can identify an invoice: it contains at least one digit. */
export function isReadableInvoiceNumber(core: string): boolean {
  return /\d/.test(core);
}

/**
 * The v1 normalisation, byte-for-byte: ASCII letters and digits only, every separator removed.
 * Kept for callers that compare against `invoice_number_normalized` values stored before v2.
 * Not used for new comparisons: it drops non-Latin digits ("№ ٤٢" and "№ ٥٠" both become
 * "NO") and merges digit groups ("2024-001" and "202-4001" both become "2024001").
 */
export function legacyNormalizeInvoiceNumber(n: string): string {
  return stripInvoicePrefix(
    String(n ?? "")
      .normalize("NFKC")
      .toUpperCase()
      .replace(/[^A-Z0-9]/g, ""),
  );
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
 * Partial invoices.
 *
 * An invoice that bills less than was ordered (a split invoice, a back-order, a short shipment)
 * is a DISCREPANCY: settlement is withheld. At most one invoice per purchase order can ever be
 * settled (the `invoices_po_settled_uq` index), so settling a partial invoice would make the
 * follow-up for the remainder unsettleable — and it was then reported as a DUPLICATE.
 *
 * Instead, the invoice that completes the order settles it. When the caller passes the lines of
 * existing invoices (`ExistingInvoiceView.lines`), earlier partial invoices for the same order
 * count towards the invoiced quantities and total: a follow-up that bills exactly the remainder
 * is MATCHED (and settles the order), while billing more than the remainder across invoices is
 * an over-billing discrepancy. Without prior lines every partial invoice — including the one
 * for the remainder — stays a DISCREPANCY for a human to reconcile; it is never a DUPLICATE
 * unless its number repeats an earlier invoice or its content repeats one beyond the order.
 *
 * Identical content needs no lines from the caller: an earlier invoice with the same content
 * hash has this invoice's lines. Two identical partial invoices that together stay within the
 * order (5 + 5 of 10) may be a split delivery or a re-numbered resubmission, so the repeat is a
 * DISCREPANCY (DUPLICATE_CONTENT at MEDIUM) for a human to check against receipts; a repeat that
 * would exceed the order is a DUPLICATE.
 *
 * A prior invoice counts as partial when it is for the same supplier and order, is a
 * DISCREPANCY (so it was never settled), and its own product lines bill no SKU above the
 * ordered quantity and the order not in full. A prior full invoice that was disputed (wrong
 * price, say) is not counted: its corrected replacement bills the order again.
 */
type ProductTotals = Map<string, number>;

function productQuantities(lines: readonly InvoiceLine[]): ProductTotals {
  const out: ProductTotals = new Map();
  for (const l of lines) if (l.sku) out.set(l.sku, (out.get(l.sku) ?? 0) + l.quantity);
  return out;
}

function orderedProductQuantities(po: PurchaseOrderView): ProductTotals {
  const out: ProductTotals = new Map();
  for (const i of po.items) if (i.kind === "PRODUCT" && i.sku) out.set(i.sku, (out.get(i.sku) ?? 0) + i.quantity);
  return out;
}

function isPartialInvoiceOf(lines: readonly InvoiceLine[], ordered: ProductTotals): boolean {
  const billed = productQuantities(lines);
  if (billed.size === 0) return false;
  for (const [sku, qty] of billed) if (!ordered.has(sku) || qty > ordered.get(sku)!) return false;
  return [...ordered].some(([sku, qty]) => (billed.get(sku) ?? 0) < qty);
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
  const readable = isReadableInvoiceNumber(normalized);
  const sameSupplier = existing.filter((e) => e.supplier_id === inv.supplier_id);

  // A number without digits ("###", "DRAFT") cannot identify an invoice: two of them must not be
  // called the same invoice, and the number itself needs a human to check it.
  if (!readable) {
    add("INVOICE_NUMBER_READABLE", false, "MEDIUM", "Invoice number has no digits and cannot identify the invoice.");
  }
  const numberDupes = readable ? sameSupplier.filter((e) => normalizeInvoiceNumber(e.invoice_number) === normalized) : [];
  add(
    "DUPLICATE_INVOICE_NUMBER",
    numberDupes.length === 0,
    "HIGH",
    numberDupes.length === 0 ? "Invoice number not seen before." : `Invoice number already recorded (${numberDupes.length}).`,
  );

  // Rows stored before v2 carry an unprefixed legacy hash; compare those against the legacy
  // fingerprint of this invoice so the algorithm change does not open a resubmission window.
  const legacy_hash = sameSupplier.some((e) => !e.content_hash.startsWith(INVOICE_HASH_PREFIX)) ? legacyInvoiceContentHash(inv) : null;
  const sameContent = sameSupplier.filter(
    (e) => (e.content_hash === content_hash || (legacy_hash !== null && e.content_hash === legacy_hash)) && !numberDupes.includes(e),
  );

  // Lines of an earlier invoice: as passed by the caller or, for an invoice with identical content
  // (same supplier, order, lines and total by hash), this invoice's own lines.
  const linesOf = (e: ExistingInvoiceView): readonly InvoiceLine[] | null =>
    Array.isArray(e.lines) ? e.lines : sameContent.includes(e) ? inv.lines : null;
  const ordered = po ? orderedProductQuantities(po) : new Map<string, number>();
  const priorPartials =
    po && inv.purchase_order_id === po.id
      ? sameSupplier.filter((e) => {
          const lines = linesOf(e);
          return (
            e.purchase_order_id === po.id &&
            e.status === "DISCREPANCY" &&
            lines !== null &&
            !numberDupes.includes(e) &&
            isPartialInvoiceOf(lines, ordered)
          );
        })
      : [];
  const priorLines = priorPartials.flatMap((e) => linesOf(e) ?? []);
  const cumulative = productQuantities([...priorLines, ...inv.lines]);
  const withinOrderCumulatively = [...cumulative].every(([sku, qty]) => !ordered.has(sku) || qty <= ordered.get(sku)!);

  // Two identical partial invoices can be a legitimate split (5 + 5 of 10) or a re-numbered
  // resubmission. Only while the two together stay within the order is that ambiguous; it is
  // then a discrepancy for a human to check against receipts, not a duplicate.
  const repeatedPartials = withinOrderCumulatively ? sameContent.filter((e) => priorPartials.includes(e)) : [];
  const contentDupes = sameContent.filter((e) => !repeatedPartials.includes(e));
  add(
    "DUPLICATE_CONTENT",
    sameContent.length === 0,
    contentDupes.length > 0 ? "HIGH" : "MEDIUM",
    sameContent.length === 0
      ? "No invoice with identical content."
      : contentDupes.length > 0
        ? "An invoice with identical lines and total exists under a different number."
        : "Repeats the lines and total of an earlier partial invoice for this order under a different number; together they stay within the order, so verify both deliveries were received.",
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
    const priorNote = priorPartials.length ? ` (with ${priorPartials.length} earlier partial invoice(s))` : "";
    add("PO_EXISTS", true, "MEDIUM", `Matched to purchase order ${po.id}.`);
    // The caller looks the order up by the invoice's reference; a different order passed in is a
    // caller bug, and must never let this invoice settle someone else's order.
    if (inv.purchase_order_id !== null) {
      const sameOrder = inv.purchase_order_id === po.id;
      add(
        "PO_REFERENCE_MATCH",
        sameOrder,
        "HIGH",
        sameOrder ? "Invoice references this purchase order." : `Invoice references ${inv.purchase_order_id}, not ${po.id}.`,
      );
    }
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
    const billedTotal = inv.total_minor + priorPartials.reduce((a, e) => a + e.total_minor, 0);
    add(
      "TOTAL_WITHIN_APPROVED",
      billedTotal <= po.total_minor,
      "HIGH",
      billedTotal <= po.total_minor
        ? `Invoice total${priorNote} is within the approved amount.`
        : `Invoice${priorNote} exceeds approved order total by ${billedTotal - po.total_minor}.`,
    );

    // Ordered quantity per SKU and per (SKU, unit price). Quantities are summed on both sides so
    // splitting one SKU across several invoice lines cannot bill more than was ordered, and
    // prices are matched together with quantities: a SKU ordered as 5 @ $10 + 5 @ $12 may not
    // be billed as 10 @ $12. Earlier partial invoices count towards the quantities; their prices
    // were checked when they were analysed.
    const orderedBySku = new Map<string, { kind: string; quantity: number; byPrice: Map<number, number> }>();
    for (const i of po.items) {
      if (!i.sku) continue;
      const o = orderedBySku.get(i.sku) ?? { kind: i.kind, quantity: 0, byPrice: new Map<number, number>() };
      o.quantity += i.quantity;
      o.byPrice.set(i.unit_price_minor, (o.byPrice.get(i.unit_price_minor) ?? 0) + i.quantity);
      orderedBySku.set(i.sku, o);
    }
    const invoiced = new Map<string, number>();
    for (const [sku, qty] of productQuantities(priorLines)) invoiced.set(sku, (invoiced.get(sku) ?? 0) + qty);
    const invoicedByPrice = new Map<string, Map<number, number>>();
    const unknown: string[] = [];
    // Charges without a SKU (tax, shipping) may match a non-product order line of the same
    // amount; each order line can be matched at most once.
    const chargeLines = po.items.filter((i) => i.kind !== "PRODUCT").map((i) => ({ ...i, used: false }));
    for (const l of inv.lines) {
      const match = l.sku ? orderedBySku.get(l.sku) : undefined;
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
    const overSkus = new Set([...invoiced].filter(([sku, qty]) => qty > orderedBySku.get(sku)!.quantity).map(([sku]) => sku));
    const overQty = [...overSkus].map((sku) => `${sku} (${invoiced.get(sku)} of ${orderedBySku.get(sku)!.quantity})`);
    // A price discrepancy is any unit billed at a price it was not ordered at: a price that is
    // not on the order at all, or more units at price P than were ordered at P. (For an
    // over-billed SKU the excess units are already a quantity discrepancy, so only unknown
    // prices are reported there.)
    const priceDiff = [...invoicedByPrice]
      .filter(([sku, byPrice]) =>
        [...byPrice].some(([price, qty]) => {
          const orderedAtPrice = orderedBySku.get(sku)!.byPrice.get(price) ?? 0;
          return orderedAtPrice === 0 || (!overSkus.has(sku) && qty > orderedAtPrice);
        }),
      )
      .map(([sku]) => sku);
    const uninvoiced = [...orderedBySku]
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
      overQty.length === 0
        ? `Quantities${priorNote} within ordered amounts.`
        : `Over-billed quantities${priorNote}: ${overQty.join(", ")}.`,
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
      "MEDIUM",
      uninvoiced.length === 0
        ? priorPartials.length
          ? `Completes the order together with ${priorPartials.length} earlier partial invoice(s).`
          : "Every ordered product is invoiced."
        : `Partial invoice${priorNote}: ordered products not (fully) invoiced: ${uninvoiced.join(", ")}. ` +
            "Only one invoice per order can be settled, so settlement waits for the invoice that completes the order; " +
            "expect a follow-up invoice, or record a credit for any short shipment.",
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
