import * as s from "../core/validation/index.js";
import type { Schema } from "../core/validation/schema.js";

export type Totals = {
  /** Approved spend, in minor units (cents). */
  approvedSpendMinor: number;
  /** Captured spend, in minor units (cents). */
  capturedSpendMinor: number;
  /** Refunded, in minor units (cents). */
  refundedMinor: number;
  ordersPaid: number;
  ordersBlocked: number;
  pendingApprovals: number;
  /** Number of requests. */
  requestsTotal: number;
};

export const totalsSchema: Schema<Totals> = s.object<Totals>({
  approvedSpendMinor: s.int(),
  capturedSpendMinor: s.int(),
  refundedMinor: s.int(),
  ordersPaid: s.int(),
  ordersBlocked: s.int(),
  pendingApprovals: s.int(),
  requestsTotal: s.int(),
  _keysMap: {
    approvedSpendMinor: "approved_spend_minor",
    capturedSpendMinor: "captured_spend_minor",
    refundedMinor: "refunded_minor",
    ordersPaid: "orders_paid",
    ordersBlocked: "orders_blocked",
    pendingApprovals: "pending_approvals",
    requestsTotal: "requests_total",
  },
});
