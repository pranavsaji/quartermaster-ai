import * as s from "../core/validation/index.js";
import type { Schema } from "../core/validation/schema.js";

/** Capture a PayPal order the buyer approved. */
export type CapturePaymentRequest = {
  /** PayPal Orders v2 order id. */
  paypalOrderId: string;
};

export const capturePaymentRequestSchema: Schema<CapturePaymentRequest> = s.object<CapturePaymentRequest>({
  paypalOrderId: s.string(),
  _keysMap: {
    paypalOrderId: "paypal_order_id",
  },
});
