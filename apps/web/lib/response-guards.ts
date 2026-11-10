/**
 * Lightweight runtime checks for the responses that move money or sign certificates.
 *
 * `request<T>` trusts the API's JSON to match `@qm/contracts` (both sides share the types). For
 * approvals, PayPal orders, captures, refunds and payment reads a wrong shape would make the
 * console show a payment state it doesn't actually know, so those are checked here: only the
 * fields the UI relies on, not a full schema. One-time invitation and reset links are checked too:
 * the API never shows them again, so an unreadable answer must not look like a link. A mismatch is reported like a gateway error
 * (ambiguous), so the outcome is re-read from the server rather than assumed.
 */
import {
  PAYMENT_STATUSES,
  type ApprovalResponse,
  type CaptureResponse,
  type InvitationCreatedResponse,
  type PaymentDto,
  type PayPalOrderResponse,
  type RefundResponse,
  type ResetLinkResponse,
} from "@qm/contracts";
import { ApiRequestError } from "./http";

const PAYMENT_STATUS_SET = new Set<string>(PAYMENT_STATUSES);

type Guard<T> = (value: unknown) => value is T;

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

export const isPayment: Guard<PaymentDto> = (v): v is PaymentDto =>
  isObject(v) &&
  typeof v.id === "string" &&
  typeof v.status === "string" &&
  PAYMENT_STATUS_SET.has(v.status) &&
  Number.isInteger(v.amount_minor) &&
  typeof v.currency === "string" &&
  typeof v.updated_at === "string";

function hasPurchaseOrder(v: Record<string, unknown>): boolean {
  const po = v.purchase_order;
  return isObject(po) && typeof po.id === "string" && typeof po.status === "string";
}

export const isPayPalOrderResponse: Guard<PayPalOrderResponse> = (v): v is PayPalOrderResponse =>
  isObject(v) && isPayment(v.payment) && typeof v.paypal_order_id === "string" && v.paypal_order_id.length > 0;

export const isCaptureResponse: Guard<CaptureResponse> = (v): v is CaptureResponse =>
  isObject(v) && isPayment(v.payment) && hasPurchaseOrder(v);

export const isRefundResponse: Guard<RefundResponse> = (v): v is RefundResponse => isObject(v) && isPayment(v.payment);

export const isApprovalResponse: Guard<ApprovalResponse> = (v): v is ApprovalResponse =>
  isObject(v) && hasPurchaseOrder(v) && (v.certificate === null || (isObject(v.certificate) && typeof v.certificate.id === "string"));

/** Returns `value` typed by `guard`, or throws an ambiguous UNEXPECTED_RESPONSE error naming `what`. */
/** An absolute http(s) URL whose fragment carries the one-time token (`…#token=…`). */
function isTokenLink(value: unknown): value is string {
  if (typeof value !== "string") return false;
  try {
    const url = new URL(value);
    return (url.protocol === "https:" || url.protocol === "http:") && url.hash.startsWith("#token=") && url.hash.length > 7;
  } catch {
    return false;
  }
}

export const isInvitationCreated: Guard<InvitationCreatedResponse> = (v): v is InvitationCreatedResponse =>
  isObject(v) &&
  isObject(v.invitation) &&
  typeof v.invitation.id === "string" &&
  typeof v.invitation.email === "string" &&
  isTokenLink(v.invite_url) &&
  typeof v.email_sent === "boolean";

/** A link is returned only when it was not emailed to the member (the owner then passes it on). */
export const isResetLink: Guard<ResetLinkResponse> = (v): v is ResetLinkResponse =>
  isObject(v) &&
  typeof v.expires_at === "string" &&
  typeof v.email_sent === "boolean" &&
  (v.email_sent ? v.reset_url === null || isTokenLink(v.reset_url) : isTokenLink(v.reset_url));

export function ensureShape<T>(value: unknown, guard: Guard<T>, what: string): T {
  if (guard(value)) return value;
  throw new ApiRequestError({
    status: 502,
    code: "UNEXPECTED_RESPONSE",
    message: `Quartermaster sent ${what} the console couldn't read, so its outcome isn't shown. Refresh to see the current state.`,
  });
}
