import { and, eq, inArray } from "drizzle-orm";
import type { PurchaseOrderStatus } from "@qm/contracts";
import { purchaseOrders, type DbOrTx } from "@qm/database";
import { refreshRequestStatus } from "./procurement/status";

/**
 * Moves a purchase order to `to`, but only while it is still in one of `from` (a compare-and-set,
 * so a concurrent transition is never overwritten), then re-derives the owning request's status.
 * Returns whether the order changed. Run it inside the transaction that owns the transition.
 */
export async function setOrderStatus(
  tx: DbOrTx,
  purchaseOrderId: string,
  from: readonly PurchaseOrderStatus[],
  to: PurchaseOrderStatus,
  now: Date,
): Promise<boolean> {
  if (from.length === 0) return false;
  const changed = await tx
    .update(purchaseOrders)
    .set({ status: to, updatedAt: now })
    .where(and(eq(purchaseOrders.id, purchaseOrderId), inArray(purchaseOrders.status, [...from])))
    .returning({ requestId: purchaseOrders.requestId });
  if (changed.length === 0) return false;
  const requestId = changed[0]!.requestId;
  if (requestId) await refreshRequestStatus(tx, requestId, now);
  return true;
}
