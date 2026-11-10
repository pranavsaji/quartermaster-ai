import {
  minorToDecimalString,
  type CandidateDto,
  type InventoryItemDto,
  type MandateResponse,
  type ProcurementRequestDto,
  type PurchaseOrderDto,
  type SecurityFindingDto,
  type SupplierDto,
} from "@qm/contracts";
import { cleanUntrustedText, fenceUntrusted } from "@qm/trustrail";

/**
 * Concise, model-facing summaries of API responses. Free text that suppliers, listings, market
 * data or a model could have written is fenced with TrustRail's `fenceUntrusted`, so the calling
 * agent sees it as quoted data rather than instructions. Codes, ids, statuses and amounts are
 * system-generated and returned as plain values.
 */

export const OWNER_ONLY =
  "This agent can only propose. The workspace owner reviews and approves the exact cart in the Quartermaster app, " +
  "and pays there with PayPal; there is no approve, pay, capture or refund tool.";

/** Fences untrusted free text, or null when there is none. */
export function untrusted(label: string, text: string | null | undefined, max = 400): string | null {
  return text && text.trim() ? fenceUntrusted(label, text, max) : null;
}

/** A short label (e.g. a supplier name): cleaned of invisible characters and capped, not fenced. */
export function label(text: string | null | undefined, max = 120): string {
  return [...cleanUntrustedText(text ?? "")].slice(0, max).join("");
}

export function money(minor: number | null | undefined, currency: string): string | null {
  if (minor === null || minor === undefined) return null;
  try {
    return `${minorToDecimalString(minor, currency)} ${currency}`;
  } catch {
    return `${minor} minor units (${label(currency, 8)})`;
  }
}

export function appLink(appUrl: string | null, path: string): string {
  return appUrl ? `${appUrl}${path}` : path;
}

export function summarizeInventory(items: InventoryItemDto[], needsReorderOnly: boolean) {
  const rows = needsReorderOnly ? items.filter((i) => i.status !== "OK") : items;
  return {
    items: rows.map((i) => ({
      id: i.id,
      sku: i.sku,
      name: label(i.name),
      category: i.category,
      unit: label(i.unit, 24),
      on_hand: i.on_hand,
      available: i.available,
      inbound_confirmed: i.inbound_confirmed,
      reorder_point: i.reorder_point,
      days_of_cover: i.days_of_cover,
      status: i.status,
    })),
    total: rows.length,
  };
}

export function summarizeMandate(res: MandateResponse, appUrl: string | null) {
  const { mandate: m, budget: b } = res;
  return {
    mandate: {
      id: m.id,
      version: m.version,
      currency: m.currency,
      weekly_budget: money(m.weekly_budget_minor, m.currency),
      per_order_limit: money(m.per_order_limit_minor, m.currency),
      auto_approval_limit: money(m.auto_approval_limit_minor, m.currency),
      human_approval_required: m.human_approval_required,
      approved_supplier_ids: m.approved_supplier_ids,
      allowed_categories: m.allowed_categories,
      max_market_price_premium_pct: m.max_market_price_premium_pct,
      market_price_action: m.market_price_action,
      duplicate_window_hours: m.duplicate_window_hours,
      duplicate_action: m.duplicate_action,
      subscriptions_allowed: m.subscriptions_allowed,
      max_quantity_multiple_of_need: m.max_quantity_multiple_of_need,
    },
    budget: {
      period_start: b.period_start,
      period_end: b.period_end,
      limit: money(b.limit_minor, b.currency),
      reserved: money(b.reserved_minor, b.currency),
      spent: money(b.spent_minor, b.currency),
      remaining: money(b.remaining_minor, b.currency),
      remaining_minor: b.remaining_minor,
    },
    note:
      "Read-only. TrustRail enforces this mandate from the database, never from agent input; only the owner can change it " +
      `(${appLink(appUrl, "/mandate")}).`,
  };
}

export function summarizeSuppliers(items: SupplierDto[]) {
  return {
    suppliers: items.map((s) => ({
      id: s.id,
      name: label(s.name),
      approved_in_mandate: s.approved,
      active: s.active,
      checkout_eligible: s.checkout_eligible,
      quarantined: s.quarantined,
      lead_time_days: s.lead_time_days,
      catalog_items: s.catalog_items,
      description: untrusted(`supplier:${s.id}`, s.description, 300),
    })),
    note: "Only suppliers approved in the owner's Spend Mandate can be bought from; supplier approval happens in the Quartermaster app.",
  };
}

const openProposals = (r: ProcurementRequestDto) => r.proposals.filter((p) => p.status !== "SUPERSEDED");

function summarizeProposal(p: PurchaseOrderDto) {
  const decision = p.policy_decision;
  return {
    purchase_order_id: p.id,
    number: p.number,
    supplier: label(p.supplier_name),
    supplier_id: p.supplier_id,
    status: p.status,
    trustrail_decision: decision?.decision ?? null,
    allowed: p.status === "PROPOSED" && !!decision && decision.decision !== "BLOCK",
    owner_must_acknowledge: (decision?.violations ?? []).filter((v) => v.severity === "REVIEW").map((v) => v.code),
    total: money(p.total_minor, p.currency),
    total_minor: p.total_minor,
    cart_hash: p.cart_hash,
    reasons: (decision?.violations ?? []).map((v) => ({
      code: v.code,
      severity: v.severity,
      // Violation text can quote listing descriptions, so it is fenced like any supplier text.
      detail: untrusted(`trustrail:${v.code}`, v.message, 300),
    })),
    lines: p.items.map((i) => ({
      kind: i.kind,
      sku: i.sku === null ? null : label(i.sku, 64),
      quantity: i.quantity,
      line_total: money(i.line_total_minor, p.currency),
      description: untrusted(`line:${i.id}`, i.description, 200),
    })),
  };
}

function quarantinedSources(r: ProcurementRequestDto) {
  const fromCandidates = r.candidates
    .filter((c: CandidateDto) => c.quarantined)
    .map((c) => ({
      kind: "CATALOG_LISTING",
      supplier: label(c.supplier_name),
      supplier_id: c.supplier_id,
      catalog_item_id: c.catalog_item_id,
      sku: label(c.sku, 64),
      title: untrusted(`listing:${c.catalog_item_id}`, c.title, 200),
    }));
  const seen = new Set(fromCandidates.map((c) => c.catalog_item_id));
  const fromProposals = openProposals(r)
    .filter((p) => (p.policy_decision?.violations ?? []).some((v) => v.code === "QUARANTINED_SOURCE"))
    .filter((p) => !fromCandidates.some((c) => c.supplier_id === p.supplier_id))
    .map((p) => ({ kind: "SUPPLIER_CONTENT", supplier: label(p.supplier_name), supplier_id: p.supplier_id, purchase_order_id: p.id }));
  const fromFindings = r.security_findings
    .filter((f) => f.type === "PROMPT_INJECTION" && !(f.source_id && seen.has(f.source_id)))
    .map((f) => ({ kind: label(f.source_kind, 40), source_id: f.source_id, finding: untrusted(`finding:${f.id}`, f.title, 160) }));
  return [...fromCandidates, ...fromProposals, ...fromFindings];
}

/** TrustRail's overall verdict on a request, in one word plus the next step. */
function verdict(r: ProcurementRequestDto) {
  const proposals = openProposals(r);
  const allowed = proposals.filter((p) => p.status === "PROPOSED" && p.policy_decision && p.policy_decision.decision !== "BLOCK");
  const blocked = proposals.filter((p) => p.status === "BLOCKED" || p.policy_decision?.decision === "BLOCK");
  let outcome: string;
  let next: string;
  switch (r.status) {
    case "DRAFT":
    case "FAILED":
      outcome = r.status === "DRAFT" ? "NOT_RESEARCHED" : "RESEARCH_FAILED";
      next = "Call research_request to forecast need, compare suppliers and have TrustRail evaluate the carts.";
      break;
    case "RESEARCHING":
      outcome = "RESEARCHING";
      next = "Research is still running; call get_request again shortly.";
      break;
    case "READY_FOR_REVIEW":
    case "BLOCKED":
      if (allowed.length > 0) {
        outcome = "ALLOWED_PENDING_OWNER_APPROVAL";
        next = "Tell the user the owner must review and approve one of the allowed proposals in the Quartermaster app.";
      } else {
        outcome = "BLOCKED";
        next = "TrustRail allowed no cart. Report the reasons; do not try to work around them.";
      }
      break;
    case "APPROVED":
    case "PAYMENT_PENDING":
    case "PAID":
    case "FULFILLED":
    case "REJECTED":
    case "CANCELLED":
      outcome = r.status;
      next = "The owner has already acted on this request in the Quartermaster app.";
      break;
  }
  return { outcome, allowed_proposals: allowed.length, blocked_proposals: blocked.length, next_step: next };
}

export function summarizeRequest(r: ProcurementRequestDto, appUrl: string | null) {
  return {
    request_id: r.id,
    status: r.status,
    instruction: untrusted("instruction", r.instruction, 500),
    budget_limit: money(r.budget_limit_minor, r.currency),
    trustrail: verdict(r),
    proposals: openProposals(r).map(summarizeProposal),
    quarantined_sources: quarantinedSources(r),
    security_findings: r.security_findings.map((f) => ({
      type: f.type,
      severity: f.severity,
      title: untrusted(`finding:${f.id}`, f.title, 160),
      source_kind: label(f.source_kind, 40),
    })),
    recommendation: untrusted("recommendation", r.recommendation?.summary, 600),
    owner_action: { approve_in_app: appLink(appUrl, `/procurement/${r.id}`), note: OWNER_ONLY },
  };
}

export function summarizeFindings(page: { items: SecurityFindingDto[]; next_cursor: string | null }) {
  return {
    events: page.items.map((f) => ({
      id: f.id,
      type: f.type,
      severity: f.severity,
      title: untrusted(`finding:${f.id}`, f.title, 160),
      description: untrusted(`finding:${f.id}`, f.description, 400),
      source_kind: label(f.source_kind, 40),
      source_id: f.source_id,
      related_request_id: f.related_request_id,
      related_purchase_order_id: f.related_purchase_order_id,
      created_at: f.created_at,
    })),
    next_cursor: page.next_cursor,
  };
}
