import { eq } from "drizzle-orm";
import type { RequestStatus } from "@qm/contracts";
import { purchaseOrders, purchaseRequests, type DbOrTx } from "@qm/database";

/** Request status is derived from its proposals so it can never drift from them. */
export function deriveRequestStatus(statuses: string[], fallback: RequestStatus): RequestStatus {
  const live = statuses.filter((s) => s !== "SUPERSEDED");
  if (live.length === 0) return fallback;
  const has = (s: string) => live.includes(s);
  if (has("PROPOSED")) return "READY_FOR_REVIEW";
  if (has("PAYMENT_PENDING")) return "PAYMENT_PENDING";
  if (has("APPROVED")) return "APPROVED";
  const settled = live.filter((s) => s === "PAID" || s === "FULFILLED");
  if (settled.length > 0)
    return settled.every((s) => s === "FULFILLED") &&
      live.every((s) => ["FULFILLED", "BLOCKED", "REJECTED", "EXPIRED", "CANCELLED"].includes(s))
      ? "FULFILLED"
      : "PAID";
  if (live.every((s) => s === "REJECTED")) return "REJECTED";
  if (live.every((s) => s === "REJECTED" || s === "CANCELLED" || s === "EXPIRED")) return "CANCELLED";
  return "BLOCKED";
}

export async function refreshRequestStatus(tx: DbOrTx, requestId: string, now: Date): Promise<RequestStatus> {
  const [req] = await tx.select({ status: purchaseRequests.status }).from(purchaseRequests).where(eq(purchaseRequests.id, requestId));
  if (!req) return "FAILED";
  const pos = await tx.select({ status: purchaseOrders.status }).from(purchaseOrders).where(eq(purchaseOrders.requestId, requestId));
  const next = deriveRequestStatus(
    pos.map((p) => p.status),
    req.status,
  );
  if (next !== req.status)
    await tx.update(purchaseRequests).set({ status: next, updatedAt: now }).where(eq(purchaseRequests.id, requestId));
  return next;
}
