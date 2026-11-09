import { and, eq } from "drizzle-orm";
import type { PaymentDto, PaymentStatus, PurchaseOrderDto } from "@qm/contracts";
import { paymentAttempts, purchaseOrders, type DbOrTx } from "@qm/database";
import { PayPalAmbiguousError, PayPalApiError, PayPalNotConfiguredError } from "@qm/payments";
import { canTransition } from "@qm/trustrail";
import type { AppContext } from "../../context";
import { notFound, unavailable } from "../../errors";
import { orderDtos, toPaymentDto } from "../orders";

export type PaymentRow = typeof paymentAttempts.$inferSelect;
type PaymentPatch = Partial<Omit<PaymentRow, "id" | "status" | "organizationId" | "intentId" | "purchaseOrderId">>;

export function requirePayPal(ctx: AppContext): void {
  if (!ctx.paypal.configured) throw unavailable("PAYPAL_NOT_CONFIGURED", "PayPal sandbox is not configured on this server.");
}

export async function loadPayment(db: DbOrTx, organizationId: string, id: string, lock = false): Promise<PaymentRow> {
  const q = db
    .select()
    .from(paymentAttempts)
    .where(and(eq(paymentAttempts.id, id), eq(paymentAttempts.organizationId, organizationId)));
  const [row] = lock ? await q.for("update") : await q;
  if (!row) throw notFound("Payment");
  return row;
}

/** Reads a payment by id without tenant scoping. Only for system paths (webhooks, sweeper). */
export async function loadPaymentForSystem(db: DbOrTx, id: string, lock = false): Promise<PaymentRow | undefined> {
  const q = db.select().from(paymentAttempts).where(eq(paymentAttempts.id, id));
  const [row] = lock ? await q.for("update") : await q;
  return row;
}

export const statusOf = (p: Pick<PaymentRow, "status">): PaymentStatus => p.status;

/**
 * Named exceptions to the forward-only payment state machine. Each one is a deliberate,
 * documented regression that `canTransition` would otherwise refuse.
 */
export type TransitionException =
  /** PayPal definitively declined the capture: the buyer may pick another funding source. */
  "CAPTURE_REJECTED";

const EXCEPTIONS: Record<TransitionException, { from: PaymentStatus; to: PaymentStatus }> = {
  CAPTURE_REJECTED: { from: "CAPTURE_PENDING", to: "ORDER_CREATED" },
};

/**
 * The only writer of `payment_attempts.status`. Applies `from → to` if the state machine allows
 * it and the row is still in `from` (compare-and-set), so concurrent writers can never regress a
 * payment. Returns false when the transition was not applied.
 */
export async function transitionPayment(
  tx: DbOrTx,
  payment: Pick<PaymentRow, "id" | "status">,
  to: PaymentStatus,
  patch: PaymentPatch,
  now: Date,
  exception?: TransitionException,
): Promise<boolean> {
  const from = statusOf(payment);
  const allowed = exception ? EXCEPTIONS[exception].from === from && EXCEPTIONS[exception].to === to : canTransition(from, to);
  if (!allowed) return false;
  const rows = await tx
    .update(paymentAttempts)
    .set({ ...patch, status: to, updatedAt: now })
    .where(and(eq(paymentAttempts.id, payment.id), eq(paymentAttempts.status, from)))
    .returning({ id: paymentAttempts.id });
  return rows.length === 1;
}

/** Updates non-status fields of a payment. */
export async function patchPayment(tx: DbOrTx, id: string, patch: PaymentPatch, now: Date): Promise<void> {
  await tx
    .update(paymentAttempts)
    .set({ ...patch, updatedAt: now })
    .where(eq(paymentAttempts.id, id));
}

/**
 * True when a PayPal call may have changed state even though it failed: timeouts, 5xx, 429,
 * malformed responses and anything that is not a recognised PayPal API rejection.
 */
export function isAmbiguousPayPalFailure(err: unknown): boolean {
  if (err instanceof PayPalAmbiguousError) return true;
  if (err instanceof PayPalNotConfiguredError) return false;
  if (err instanceof PayPalApiError) return err.status >= 500 || err.status === 429 || err.issue === "ORDER_ALREADY_CAPTURED";
  return true;
}

/** A short, client-safe failure code for a PayPal error. Raw messages stay in the logs. */
export function paypalFailureCode(err: unknown, fallback: string): string {
  if (err instanceof PayPalApiError) return (err.issue ?? `HTTP_${err.status}`).slice(0, 64);
  if (err instanceof PayPalAmbiguousError) return "PAYPAL_UNREACHABLE";
  return fallback;
}

/** Client-safe description for a stored failure code. */
export function failureMessageFor(code: string): string {
  switch (code) {
    case "INSTRUMENT_DECLINED":
      return "PayPal declined the funding source.";
    case "PAYER_ACTION_REQUIRED":
      return "The buyer must complete an action in PayPal.";
    case "PAYPAL_UNREACHABLE":
      return "PayPal could not be reached.";
    default:
      return `PayPal reported ${code}.`;
  }
}

export async function paymentResult(
  ctx: AppContext,
  organizationId: string,
  paymentId: string,
): Promise<{ payment: PaymentDto; purchase_order: PurchaseOrderDto }> {
  const payment = await loadPayment(ctx.db, organizationId, paymentId);
  const [po] = await ctx.db.select().from(purchaseOrders).where(eq(purchaseOrders.id, payment.purchaseOrderId));
  const [dto] = await orderDtos(ctx.db, organizationId, [po!]);
  return { payment: toPaymentDto(payment), purchase_order: dto! };
}
