/**
 * Owner-language copy for the codes TrustRail and the agent produce. The codes themselves stay
 * visible, but behind "Technical details": the first thing an owner reads is a short title and
 * one plain sentence. Lookups are total — a code the console doesn't know yet degrades to a
 * readable version of the code, never to a crash or a blank.
 */
import type { ViolationCode } from "@qm/contracts";
import { humanize } from "./format";
import { lookup } from "./labels";

export interface PlainCopy {
  title: string;
  sentence: string;
}

export const VIOLATION_COPY: Record<ViolationCode, PlainCopy> = {
  MANDATE_INACTIVE: {
    title: "Spend mandate is paused",
    sentence: "Your spend mandate isn't active, so nothing can be bought until it is switched back on.",
  },
  EMPTY_CART: { title: "Nothing to buy", sentence: "The cart has no products in it." },
  CURRENCY_MISMATCH: { title: "Different currency", sentence: "The cart is priced in a different currency from your spend mandate." },
  SUPPLIER_NOT_APPROVED: { title: "Supplier not approved", sentence: "You haven't approved this supplier for purchases yet." },
  SUPPLIER_INACTIVE: { title: "Supplier switched off", sentence: "This supplier is deactivated in your workspace." },
  CATEGORY_NOT_ALLOWED: { title: "Category not allowed", sentence: "Your spend mandate doesn't allow buying this kind of product." },
  UNAUTHORIZED_LINE_ITEM: {
    title: "Charge not in the supplier's terms",
    sentence: "The cart includes a fee or item that isn't part of what the supplier publishes.",
  },
  PRICE_MISMATCH: { title: "Price differs from the catalog", sentence: "A price in the cart doesn't match the supplier's catalog." },
  CART_ARITHMETIC_INVALID: { title: "Totals don't add up", sentence: "The cart's line totals or order total don't add up." },
  PER_ORDER_LIMIT_EXCEEDED: {
    title: "Over the per-order limit",
    sentence: "This cart costs more than your spend mandate allows for a single order.",
  },
  WEEKLY_BUDGET_EXCEEDED: { title: "Over the weekly budget", sentence: "Buying this would take you past this week's budget." },
  REQUEST_BUDGET_EXCEEDED: { title: "Over this request's budget", sentence: "This cart costs more than the cap you set in the request." },
  MARKET_PRICE_PREMIUM_EXCEEDED: {
    title: "Priced above the market",
    sentence: "The price is higher than comparable public listings by more than your spend mandate allows.",
  },
  MARKET_REFERENCE_UNAVAILABLE: {
    title: "No market price to compare",
    sentence: "No comparable public listing was found, so you need to judge the price yourself.",
  },
  DUPLICATE_ORDER: { title: "Looks like a repeat order", sentence: "A similar order for the same items was placed recently." },
  SUBSCRIPTION_NOT_ALLOWED: {
    title: "Recurring charge",
    sentence: "The cart would set up a subscription or repeat charge, which your spend mandate doesn't allow.",
  },
  QUARANTINED_SOURCE: {
    title: "Supplier listing quarantined",
    sentence: "A listing in this cart hid instructions aimed at AI agents, so TrustRail quarantined it.",
  },
  QUANTITY_EXCEEDS_NEED: { title: "More than you need", sentence: "The cart orders more than the forecast says you need." },
  POLICY_INPUT_INVALID: {
    title: "Couldn't be checked",
    sentence: "TrustRail couldn't read this cart's details, so it refused the cart to stay safe.",
  },
};

/** Plain title and sentence for a violation code (unknown codes fall back to the server's own message). */
export function violationCopy(code: string, fallbackMessage?: string): PlainCopy {
  return lookup(VIOLATION_COPY, code, { title: humanize(code), sentence: fallbackMessage ?? "" });
}

/** TrustRail's individual checks, as a list an owner can scan. */
export const CHECK_LABELS: Record<string, string> = {
  MANDATE_ACTIVE: "Spend mandate is active",
  CART_NOT_EMPTY: "Cart has products",
  CART_ARITHMETIC: "Totals add up",
  CURRENCY: "Currency matches your mandate",
  SUPPLIER_APPROVED: "Supplier is approved",
  LINE_ITEMS_AUTHORIZED: "Only the supplier's published charges",
  REQUIRED_CHARGES_PRESENT: "Required charges included",
  NO_QUARANTINED_SOURCES: "No quarantined listings",
  PER_ORDER_LIMIT: "Within the per-order limit",
  WEEKLY_BUDGET: "Within this week's budget",
  REQUEST_BUDGET: "Within the request's budget",
  DUPLICATE_ORDER: "Not a repeat of a recent order",
};

/** "MARKET_PRICE:CF-CAN-18L" → "Market price for CF-CAN-18L"; other codes from CHECK_LABELS or humanised. */
export function checkLabel(code: string): string {
  const [base, subject] = code.split(":", 2);
  if (base === "MARKET_PRICE") return subject ? `Market price for ${subject}` : "Market price";
  const label = Object.hasOwn(CHECK_LABELS, code) ? CHECK_LABELS[code] : undefined;
  return label ?? humanize(base ?? code);
}

/** Checks whose detail is written in integer minor units ("10820 of 50000."). */
const MONEY_CHECKS = new Set(["PER_ORDER_LIMIT", "WEEKLY_BUDGET", "REQUEST_BUDGET"]);

/** A check's detail for display: budget checks' minor-unit figures become money ("$108.20 of $500.00."). */
export function checkDetail(code: string, detail: string, formatMinor: (minor: number) => string): string {
  if (!MONEY_CHECKS.has(code)) return detail;
  return detail.replace(/-?\d+/g, (n) => formatMinor(Number(n)));
}

/** Agent tools as steps an owner recognises. */
const STEP_LABELS: Record<string, string> = {
  "intent.interpret": "Understood the request",
  "inventory.read": "Read stock levels",
  "forecast.compute": "Forecast demand",
  "market.search": "Checked market prices",
  "security.scan": "Security scan",
  "suppliers.compare": "Compared suppliers",
  "suppliers.quote": "Asked for a quote",
  "planner.plan": "Planned carts",
  "trustrail.evaluate": "TrustRail check",
  "recommendation.explain": "Wrote the recommendation",
};

export function stepLabel(tool: string): string {
  return Object.hasOwn(STEP_LABELS, tool) ? (STEP_LABELS[tool] ?? tool) : humanize(tool.replace(/\./g, " "));
}

const DECISION_WORDS: Record<string, string> = { ALLOW: "allowed", REVIEW_REQUIRED: "needs review", BLOCK: "blocked" };

/** "PRE_ORDER" / "InStock" / "https://schema.org/InStock" → "Pre order" / "In stock". */
export function availabilityLabel(value: string | null | undefined): string {
  if (!value) return "";
  const last = value.split("/").pop() ?? value;
  const spaced = last.replace(/_/g, " ").replace(/([a-z])([A-Z])/g, "$1 $2");
  const lower = spaced.trim().toLowerCase();
  return lower.charAt(0).toUpperCase() + lower.slice(1);
}

/**
 * Cleans machine-flavoured text from the agent (step summaries, the model's recommendation) for
 * display: "2 item(s)" agrees with its number, enum codes such as REVIEW_REQUIRED or
 * MARKET_REFERENCE_UNAVAILABLE read as words, snake_case field names lose their underscores, and
 * money with more than two decimals ("$0.3464") is rounded to cents. Display only: the stored
 * text is unchanged.
 */
export function plainText(text: string): string {
  let out = text.replace(/(\w+)\(s\)/g, (_m, word: string, offset: number, whole: string) => {
    // The count is the nearest number earlier in the same clause.
    const clause =
      whole
        .slice(0, offset)
        .split(/[.;:]\s/)
        .pop() ?? "";
    // Standalone numbers only: the 3 in "Channel3" is not a count.
    const numbers = clause.match(/(?<![A-Za-z\d])\d+(?:\.\d+)?(?![A-Za-z\d])/g);
    const count = numbers ? Number(numbers[numbers.length - 1]) : 2;
    return count === 1 ? word : `${word}s`;
  });
  out = out.replace(/\b[A-Z][A-Z0-9]*(?:_[A-Z0-9]+)+\b|\b(?:ALLOW|BLOCK|AVAILABLE|UNAVAILABLE|STALE|DISABLED|ERROR)\b/g, (code) => {
    if (Object.hasOwn(DECISION_WORDS, code)) return DECISION_WORDS[code] ?? code;
    if (Object.hasOwn(VIOLATION_COPY, code)) return violationCopy(code).title.toLowerCase();
    return humanize(code).toLowerCase();
  });
  out = out.replace(/\b[a-z]+(?:_[a-z]+)+\b/g, (word) => word.replace(/_/g, " "));
  out = out.replace(/\$(\d[\d,]*)\.(\d{3,})\b/g, (_m, whole: string, frac: string) => {
    const value = Number(`${whole.replace(/,/g, "")}.${frac}`);
    return `$${value.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  });
  return out;
}

/** "REORDER_POINT_V1" → "Reorder-point model". */
export function forecastMethodLabel(method: string): string {
  if (/^REORDER_POINT/i.test(method)) return "Reorder-point model";
  return humanize(method.replace(/_V\d+$/i, ""));
}

/** Where a security finding came from, in words. */
const FINDING_SOURCE_LABELS: Record<string, string> = {
  purchase_order: "Supplier cart",
  supplier_catalog_item: "Supplier listing",
  market_quote: "Market listing",
  invoice: "Supplier invoice",
  paypal_webhook: "PayPal notification",
  payment_attempt: "Payment",
  intent_certificate: "Intent Certificate",
};

export function findingSourceLabel(kind: string): string {
  return Object.hasOwn(FINDING_SOURCE_LABELS, kind) ? (FINDING_SOURCE_LABELS[kind] ?? kind) : humanize(kind);
}

/** Title-case severity for display ("HIGH" → "High"). */
export function severityLabel(severity: string): string {
  return humanize(severity);
}
