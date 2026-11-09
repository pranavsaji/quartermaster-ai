import type { IntentCertificatePayload, PaymentStatus } from "@qm/contracts";
import type { VerificationResult } from "../certificates/certificate";

/** The subset of a PayPal Orders v2 order that TrustRail inspects before capture. */
export interface ProviderOrderView {
  id: string;
  status: string;
  currency: string;
  amount_minor: number;
  reference_id: string | null;
  custom_id: string | null;
  invoice_id: string | null;
  payee_merchant_id: string | null;
}

export interface CaptureGuardInput {
  certificate: IntentCertificatePayload;
  verification: VerificationResult;
  authenticated_user_id: string;
  authenticated_org_id: string;
  payment: { id: string; status: PaymentStatus; paypal_order_id: string | null; amount_minor: number; currency: string };
  requested_paypal_order_id: string;
  provider_order: ProviderOrderView;
  reservation: { status: "ACTIVE" | "CONSUMED" | "RELEASED"; amount_minor: number } | null;
  expected_payee_merchant_id: string | null;
  /** Result of re-running the policy at capture time (with this order's own reservation excluded). */
  policy_still_allows: boolean;
}

export interface CaptureGuardResult {
  allowed: boolean;
  failures: { code: string; detail: string }[];
}

const CAPTURABLE_PAYMENT_STATUSES: PaymentStatus[] = ["ORDER_CREATED", "PAYER_APPROVED", "CAPTURE_PENDING"];

/**
 * Final gate in front of the payment-capture call. Every condition must hold. This function
 * is deliberately the only path to `captureOrder`, and it is not exposed to any agent tool.
 */
export function guardCapture(input: CaptureGuardInput): CaptureGuardResult {
  const failures: CaptureGuardResult["failures"] = [];
  const fail = (code: string, detail: string) => failures.push({ code, detail });
  const { certificate: c, provider_order: o, payment: p } = input;

  if (!input.verification.valid) fail("CERTIFICATE_INVALID", `Certificate verification failed: ${input.verification.status}.`);
  if (c.buyer_id !== input.authenticated_user_id) fail("BUYER_MISMATCH", "Only the approving owner may complete this payment.");
  if (c.organization_id !== input.authenticated_org_id) fail("ORG_MISMATCH", "Certificate belongs to another organization.");

  if (!CAPTURABLE_PAYMENT_STATUSES.includes(p.status)) fail("PAYMENT_STATE", `Payment is ${p.status}; capture is not permitted.`);
  if (!p.paypal_order_id || p.paypal_order_id !== input.requested_paypal_order_id || o.id !== p.paypal_order_id) {
    fail("ORDER_ID_MISMATCH", "PayPal order does not belong to this payment.");
  }
  if (o.status !== "APPROVED") fail("PROVIDER_STATUS", `PayPal order status is ${o.status}; buyer approval is required.`);

  if (o.currency !== c.currency || p.currency !== c.currency) fail("CURRENCY_MISMATCH", "Currency differs from the approved intent.");
  if (o.amount_minor !== c.approved_amount_minor || p.amount_minor !== c.approved_amount_minor) {
    fail("AMOUNT_MISMATCH", `PayPal amount ${o.amount_minor} differs from approved ${c.approved_amount_minor}.`);
  }
  if (o.custom_id !== c.intent_id) fail("INTENT_BINDING", "PayPal order is not bound to this intent.");
  if (o.reference_id !== c.purchase_order_id) fail("PO_BINDING", "PayPal order is not bound to this purchase order.");
  // When a payee is configured it must be positively confirmed: an order that does not report
  // its payee is not evidence that the funds go to the right merchant.
  if (input.expected_payee_merchant_id && o.payee_merchant_id !== input.expected_payee_merchant_id) {
    fail("PAYEE_MISMATCH", o.payee_merchant_id ? "Funds would go to an unexpected merchant account." : "PayPal order does not identify its payee; the expected merchant cannot be confirmed.");
  }

  if (!input.reservation || input.reservation.status !== "ACTIVE") fail("NO_RESERVATION", "No active budget reservation backs this payment.");
  else if (input.reservation.amount_minor !== c.approved_amount_minor) fail("RESERVATION_AMOUNT", "Reserved amount differs from the approved amount.");

  if (!input.policy_still_allows) fail("POLICY_CHANGED", "The purchase is no longer permitted under the current Spend Mandate.");

  return { allowed: failures.length === 0, failures };
}

/** Status ordering used to reject regressions from out-of-order or duplicate events. */
const RANK: Record<PaymentStatus, number> = {
  CREATED: 0,
  ORDER_CREATED: 1,
  PAYER_APPROVED: 2,
  CAPTURE_PENDING: 3,
  FAILED: 4,
  VOIDED: 4,
  COMPLETED: 5,
  PARTIALLY_REFUNDED: 6,
  REFUNDED: 7,
};

/**
 * Returns true if moving from `from` to `to` is a legal forward transition.
 * COMPLETED can only move to refund states; terminal failures can be superseded only by
 * COMPLETED (a capture that the provider later reports as successful).
 */
export function canTransition(from: PaymentStatus, to: PaymentStatus): boolean {
  if (from === to) return false;
  // Refunds only exist for money that was captured and recorded as such.
  if ((to === "REFUNDED" || to === "PARTIALLY_REFUNDED") && from !== "COMPLETED" && from !== "PARTIALLY_REFUNDED") return false;
  if (from === "COMPLETED") return to === "PARTIALLY_REFUNDED" || to === "REFUNDED";
  if (from === "PARTIALLY_REFUNDED") return to === "REFUNDED";
  if (from === "REFUNDED") return false;
  if (from === "FAILED" || from === "VOIDED") return to === "COMPLETED";
  return RANK[to] > RANK[from];
}
