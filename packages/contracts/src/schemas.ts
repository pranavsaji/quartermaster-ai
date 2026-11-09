import { z } from "zod";
import { PO_STATUSES, PRODUCT_CATEGORIES, type PurchaseOrderStatus } from "./enums";
import { SUPPORTED_CURRENCIES } from "./money";

const minor = z.number().int().nonnegative().max(Number.MAX_SAFE_INTEGER);
const currency = z.enum(SUPPORTED_CURRENCIES);

/**
 * True only for a real `YYYY-MM-DD` calendar date. `Date.parse("2026-02-30")` succeeds (it rolls
 * over to March 2), so the components are round-tripped through UTC instead (`setUTCFullYear`,
 * because `Date.UTC` maps years 0–99 onto 1900–1999). Year 0000 is rejected: the proleptic
 * Gregorian calendar used by PostgreSQL has no year zero.
 */
export function isCalendarDate(value: string): boolean {
  if (typeof value !== "string") return false;
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!m) return false;
  const [y, mo, d] = [Number(m[1]), Number(m[2]), Number(m[3])];
  if (y < 1) return false;
  const t = new Date(0);
  t.setUTCFullYear(y, mo - 1, d);
  return t.getUTCFullYear() === y && t.getUTCMonth() === mo - 1 && t.getUTCDate() === d;
}

/** A real calendar date: syntactically `YYYY-MM-DD` and not "2026-02-30" or "2026-13-45". */
const isoDate = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "Expected YYYY-MM-DD")
  .refine(isCalendarDate, "Not a real calendar date");

/* ------------------------------------------------------------------ Auth */

export const LoginRequest = z.object({
  email: z.string().trim().toLowerCase().email().max(254),
  password: z.string().min(8).max(200),
});
export type LoginRequest = z.infer<typeof LoginRequest>;

/* ------------------------------------------------------------- Inventory */

export const InventoryAdjustmentRequest = z.object({
  quantity_delta: z
    .number()
    .int()
    .min(-1_000_000)
    .max(1_000_000)
    .refine((v) => v !== 0, "Delta must be non-zero"),
  reason: z.enum(["COUNT_CORRECTION", "WASTE", "CONSUMPTION", "MANUAL_RECEIPT"]),
  note: z.string().trim().max(500).optional(),
  /** The on-hand quantity the user saw. When given, the change is refused if stock has moved since. */
  expected_on_hand: z.number().int().min(0).max(10_000_000).optional(),
});
export type InventoryAdjustmentRequest = z.infer<typeof InventoryAdjustmentRequest>;

export const ForecastRequest = z.object({
  inventory_item_ids: z.array(z.string().uuid()).max(100).optional(),
  demand_multiplier: z.number().min(0.25).max(4).default(1),
  horizon_days: z.number().int().min(1).max(30).optional(),
});
export type ForecastRequest = z.infer<typeof ForecastRequest>;

/* ----------------------------------------------------------- Procurement */

export const CreateProcurementRequest = z.object({
  instruction: z.string().trim().min(3).max(2000),
  currency: currency.default("USD"),
  budget_limit_minor: minor.optional(),
  required_by: isoDate.optional(),
  allow_alternatives: z.boolean().default(true),
  demand_multiplier: z.number().min(0.25).max(4).optional(),
});
export type CreateProcurementRequest = z.infer<typeof CreateProcurementRequest>;

export const ApproveRequest = z.object({
  purchase_order_id: z.string().uuid(),
  /** The cart hash the owner was shown. Approval fails if the server-side cart differs. */
  cart_hash: z.string().regex(/^sha256:[a-f0-9]{64}$/),
  /** Every REVIEW-severity violation must be acknowledged explicitly. */
  acknowledged_review_codes: z.array(z.string().max(64)).max(32).default([]),
  note: z.string().trim().max(500).optional(),
});
export type ApproveRequest = z.infer<typeof ApproveRequest>;

export const RejectRequest = z.object({
  reason: z.string().trim().min(1).max(500),
  /** Reject only this proposal; omitted rejects every open proposal on the request. */
  purchase_order_id: z.string().uuid().optional(),
});
export type RejectRequest = z.infer<typeof RejectRequest>;

/* --------------------------------------------------------------- Mandate */

export const SpendMandateInput = z
  .object({
    currency: currency,
    weekly_budget_minor: minor.max(100_000_000),
    per_order_limit_minor: minor.max(100_000_000),
    auto_approval_limit_minor: minor.max(100_000_000),
    human_approval_required: z.literal(true),
    approved_supplier_ids: z.array(z.string().uuid()).max(200),
    allowed_categories: z.array(z.enum(PRODUCT_CATEGORIES)).min(1).max(PRODUCT_CATEGORIES.length),
    max_market_price_premium_pct: z.number().int().min(0).max(500),
    market_price_action: z.enum(["REVIEW", "BLOCK"]),
    duplicate_window_hours: z
      .number()
      .int()
      .min(0)
      .max(24 * 30),
    duplicate_action: z.enum(["REVIEW", "BLOCK"]),
    subscriptions_allowed: z.boolean(),
    certificate_ttl_minutes: z.number().int().min(5).max(60),
    max_quantity_multiple_of_need: z.number().min(1).max(10),
    /** Optimistic concurrency: the version the owner edited. */
    expected_version: z.number().int().positive(),
  })
  .refine((m) => m.per_order_limit_minor <= m.weekly_budget_minor, {
    message: "Per-order limit cannot exceed the weekly budget",
    path: ["per_order_limit_minor"],
  })
  .refine((m) => m.auto_approval_limit_minor <= m.per_order_limit_minor, {
    message: "Auto-approval limit cannot exceed the per-order limit",
    path: ["auto_approval_limit_minor"],
  });
export type SpendMandateInput = z.infer<typeof SpendMandateInput>;

/* -------------------------------------------------------------- Payments */

export const CapturePaymentRequest = z.object({
  paypal_order_id: z
    .string()
    .min(5)
    .max(64)
    .regex(/^[A-Z0-9-]+$/i),
});
export type CapturePaymentRequest = z.infer<typeof CapturePaymentRequest>;

export const RefundRequest = z.object({
  amount_minor: minor.positive().optional(),
  reason: z.string().trim().min(1).max(255),
});
export type RefundRequest = z.infer<typeof RefundRequest>;

/* -------------------------------------------------------------- Invoices */

export const InvoiceLineInput = z.object({
  sku: z.string().max(64).nullable().optional(),
  description: z.string().trim().min(1).max(500),
  quantity: z.number().int().positive().max(1_000_000),
  unit_price_minor: minor,
  line_total_minor: minor,
});

export const AnalyzeInvoiceRequest = z.object({
  supplier_id: z.string().uuid(),
  purchase_order_id: z.string().uuid().nullable().optional(),
  invoice_number: z.string().trim().min(1).max(64),
  invoice_date: isoDate,
  currency: currency,
  lines: z.array(InvoiceLineInput).min(1).max(200),
  total_minor: minor,
  /** Free-text notes from the supplier document — treated as untrusted content. */
  notes: z.string().max(5000).optional(),
});
export type AnalyzeInvoiceRequest = z.infer<typeof AnalyzeInvoiceRequest>;

/* ------------------------------------------------------------ Deliveries */

export const ReceiveDeliveryRequest = z.object({
  lines: z
    .array(z.object({ purchase_order_item_id: z.string().uuid(), quantity_received: z.number().int().min(0).max(1_000_000) }))
    .min(1)
    .max(200),
  note: z.string().trim().max(500).optional(),
});
export type ReceiveDeliveryRequest = z.infer<typeof ReceiveDeliveryRequest>;

export const DelayDeliveryRequest = z.object({
  new_expected_date: isoDate,
  reason: z.string().trim().min(1).max(255),
});
export type DelayDeliveryRequest = z.infer<typeof DelayDeliveryRequest>;

/* ---------------------------------------------------------------- Common */

export const PaginationQuery = z.object({
  limit: z.coerce.number().int().min(1).max(200).default(50),
  cursor: z.string().max(200).optional(),
});
export type PaginationQuery = z.infer<typeof PaginationQuery>;

export const PurchaseOrdersQuery = PaginationQuery.extend({
  /** Comma-separated statuses to include, e.g. `PROPOSED,APPROVED`. */
  status: z
    .string()
    .max(200)
    .optional()
    .transform((v, ctx) => {
      if (!v) return undefined;
      const parts = [
        ...new Set(
          v
            .split(",")
            .map((s) => s.trim())
            .filter(Boolean),
        ),
      ];
      for (const p of parts) {
        if (!(PO_STATUSES as readonly string[]).includes(p)) {
          ctx.addIssue({ code: "custom", message: `Unknown purchase order status: ${p.slice(0, 32)}` });
          return z.NEVER;
        }
      }
      return parts as PurchaseOrderStatus[];
    }),
});
export type PurchaseOrdersQuery = z.infer<typeof PurchaseOrdersQuery>;

export const SecurityEventsQuery = PaginationQuery.extend({
  severity: z.enum(["LOW", "MEDIUM", "HIGH", "CRITICAL"]).optional(),
  type: z.string().max(64).optional(),
});
export type SecurityEventsQuery = z.infer<typeof SecurityEventsQuery>;
