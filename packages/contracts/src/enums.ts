export const ROLES = ["OWNER", "MANAGER", "VIEWER"] as const;
export type Role = (typeof ROLES)[number];

export const PRODUCT_CATEGORIES = [
  "food_packaging",
  "cleaning_supplies",
  "cooking_ingredients",
  "beverages",
  "kitchen_equipment",
  "alcohol",
  "gift_cards",
  "services",
] as const;
export type ProductCategory = (typeof PRODUCT_CATEGORIES)[number];

export const REQUEST_STATUSES = [
  "DRAFT",
  "RESEARCHING",
  "READY_FOR_REVIEW",
  "BLOCKED",
  "APPROVED",
  "PAYMENT_PENDING",
  "PAID",
  "FULFILLED",
  "REJECTED",
  "CANCELLED",
  "FAILED",
] as const;
export type RequestStatus = (typeof REQUEST_STATUSES)[number];

export const PO_STATUSES = [
  "PROPOSED",
  "BLOCKED",
  "SUPERSEDED",
  "APPROVED",
  "PAYMENT_PENDING",
  "PAID",
  "FULFILLED",
  "REJECTED",
  "CANCELLED",
  "EXPIRED",
] as const;
export type PurchaseOrderStatus = (typeof PO_STATUSES)[number];

export const LINE_KINDS = ["PRODUCT", "SHIPPING", "TAX", "FEE"] as const;
export type LineKind = (typeof LINE_KINDS)[number];

export const POLICY_DECISIONS = ["ALLOW", "REVIEW_REQUIRED", "BLOCK"] as const;
export type PolicyDecisionKind = (typeof POLICY_DECISIONS)[number];

export const VIOLATION_CODES = [
  "MANDATE_INACTIVE",
  "EMPTY_CART",
  "CURRENCY_MISMATCH",
  "SUPPLIER_NOT_APPROVED",
  "SUPPLIER_INACTIVE",
  "CATEGORY_NOT_ALLOWED",
  "UNAUTHORIZED_LINE_ITEM",
  "PRICE_MISMATCH",
  "CART_ARITHMETIC_INVALID",
  "PER_ORDER_LIMIT_EXCEEDED",
  "WEEKLY_BUDGET_EXCEEDED",
  "REQUEST_BUDGET_EXCEEDED",
  "MARKET_PRICE_PREMIUM_EXCEEDED",
  "MARKET_REFERENCE_UNAVAILABLE",
  "DUPLICATE_ORDER",
  "SUBSCRIPTION_NOT_ALLOWED",
  "QUARANTINED_SOURCE",
  "QUANTITY_EXCEEDS_NEED",
] as const;
export type ViolationCode = (typeof VIOLATION_CODES)[number];

export const CERTIFICATE_STATUSES = ["ACTIVE", "CONSUMED", "REVOKED", "EXPIRED"] as const;
export type CertificateStatus = (typeof CERTIFICATE_STATUSES)[number];

export const CERTIFICATE_VERIFICATION = [
  "VALID",
  "EXPIRED",
  "CART_MODIFIED",
  "SIGNATURE_INVALID",
  "UNKNOWN_KEY",
  "MANDATE_CHANGED",
  "REVOKED",
  "CONSUMED",
  "PAYLOAD_MISMATCH",
] as const;
export type CertificateVerificationStatus = (typeof CERTIFICATE_VERIFICATION)[number];

export const PAYMENT_STATUSES = [
  "CREATED",
  "ORDER_CREATED",
  "PAYER_APPROVED",
  "CAPTURE_PENDING",
  "COMPLETED",
  "FAILED",
  "VOIDED",
  "REFUNDED",
  "PARTIALLY_REFUNDED",
] as const;
export type PaymentStatus = (typeof PAYMENT_STATUSES)[number];

export const RESERVATION_STATUSES = ["ACTIVE", "CONSUMED", "RELEASED"] as const;
export type ReservationStatus = (typeof RESERVATION_STATUSES)[number];

export const DELIVERY_STATUSES = ["SCHEDULED", "IN_TRANSIT", "DELAYED", "DELIVERED", "CANCELLED"] as const;
export type DeliveryStatus = (typeof DELIVERY_STATUSES)[number];

export const INVOICE_STATUSES = ["MATCHED", "DISCREPANCY", "DUPLICATE", "UNMATCHED"] as const;
export type InvoiceStatus = (typeof INVOICE_STATUSES)[number];

export const SEVERITIES = ["LOW", "MEDIUM", "HIGH", "CRITICAL"] as const;
export type Severity = (typeof SEVERITIES)[number];

export const FINDING_TYPES = [
  "PROMPT_INJECTION",
  "UNAUTHORIZED_FEE",
  "POLICY_VIOLATION",
  "CART_TAMPERING",
  "DUPLICATE_INVOICE",
  "INVOICE_DISCREPANCY",
  "WEBHOOK_SIGNATURE_INVALID",
  "CERTIFICATE_VERIFICATION_FAILED",
  "PAYMENT_AMOUNT_MISMATCH",
  "ACCESS_DENIED",
] as const;
export type FindingType = (typeof FINDING_TYPES)[number];

/** Where a piece of commercial data came from. Shown as a visible label in the UI. */
export const DATA_SOURCES = ["CHANNEL3_MARKET", "SANDBOX_SUPPLIER", "SYNTHETIC"] as const;
export type DataSource = (typeof DATA_SOURCES)[number];

export const AI_MODES = ["LLM", "DETERMINISTIC_FALLBACK"] as const;
export type AiMode = (typeof AI_MODES)[number];

/* ------------------------------------------------------------ Status groups */

/** Orders that hold or have spent budget: they count towards spend and duplicate checks. */
export const COMMITTED_PO_STATUSES = ["APPROVED", "PAYMENT_PENDING", "PAID", "FULFILLED"] as const satisfies readonly PurchaseOrderStatus[];
/** Orders that may still be paid for. */
export const PAYABLE_PO_STATUSES = ["APPROVED", "PAYMENT_PENDING"] as const satisfies readonly PurchaseOrderStatus[];
/** Payments where no capture has been requested yet: safe to void without asking PayPal. */
export const PRE_CAPTURE_PAYMENT_STATUSES = ["CREATED", "ORDER_CREATED", "PAYER_APPROVED"] as const satisfies readonly PaymentStatus[];
/** Payments where money has moved. */
export const SETTLED_PAYMENT_STATUSES = ["COMPLETED", "PARTIALLY_REFUNDED", "REFUNDED"] as const satisfies readonly PaymentStatus[];

export const REFUND_STATUSES = ["REQUESTED", "UNKNOWN", "PENDING", "COMPLETED", "FAILED", "CANCELLED"] as const;
export type RefundStatus = (typeof REFUND_STATUSES)[number];
