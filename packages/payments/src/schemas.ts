import { z } from "zod";
import type { PayPalCapture, PayPalOrder, PayPalRefund } from "./types";

/**
 * Boundary validation for PayPal responses. Every 2xx body is parsed against these schemas
 * before the client returns it, so callers never act on a shape PayPal did not promise.
 * Objects are loose: unknown fields pass through untouched, missing or mistyped required
 * fields are rejected.
 */

const MoneySchema = z.object({ currency_code: z.string().min(3).max(3), value: z.string().min(1).max(32) });

export const PayPalCaptureSchema = z.looseObject({
  id: z.string().min(1).max(64),
  status: z.enum(["COMPLETED", "DECLINED", "PARTIALLY_REFUNDED", "PENDING", "REFUNDED", "FAILED"]),
  amount: MoneySchema,
  final_capture: z.boolean().optional(),
  custom_id: z.string().optional(),
  invoice_id: z.string().optional(),
  status_details: z.looseObject({ reason: z.string().optional() }).optional(),
  create_time: z.string().optional(),
}) satisfies z.ZodType<PayPalCapture>;

export const PayPalOrderSchema = z.looseObject({
  id: z.string().min(1).max(64),
  status: z.enum(["CREATED", "SAVED", "APPROVED", "VOIDED", "COMPLETED", "PAYER_ACTION_REQUIRED"]),
  intent: z.string().optional(),
  purchase_units: z
    .array(
      z.looseObject({
        reference_id: z.string().optional(),
        custom_id: z.string().optional(),
        invoice_id: z.string().optional(),
        amount: MoneySchema.optional(),
        payee: z.looseObject({ merchant_id: z.string().optional(), email_address: z.string().optional() }).optional(),
        payments: z.looseObject({ captures: z.array(PayPalCaptureSchema).optional() }).optional(),
      }),
    )
    .optional(),
  payer: z.looseObject({ payer_id: z.string().optional(), email_address: z.string().optional() }).optional(),
  links: z.array(z.looseObject({ href: z.string(), rel: z.string(), method: z.string().optional() })).optional(),
  create_time: z.string().optional(),
  update_time: z.string().optional(),
}) satisfies z.ZodType<PayPalOrder>;

export const PayPalRefundSchema = z.looseObject({
  id: z.string().min(1).max(64),
  status: z.enum(["CANCELLED", "FAILED", "PENDING", "COMPLETED"]),
  amount: MoneySchema.optional(),
}) satisfies z.ZodType<PayPalRefund>;

export const WebhookVerificationSchema = z.looseObject({
  verification_status: z.enum(["SUCCESS", "FAILURE"]),
});

export const OAuthTokenSchema = z.looseObject({
  access_token: z.string().min(1),
  /** Seconds. Bounded so a hostile or broken response cannot pin a token for years. */
  expires_in: z.number().int().positive().max(7 * 86_400).optional(),
});

/** Paths (never values) of the fields that failed validation, for logs and error messages. */
export function issuePaths(error: z.ZodError): string[] {
  return error.issues.slice(0, 5).map((i) => i.path.join(".") || "(root)");
}
