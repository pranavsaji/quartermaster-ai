/**
 * Display labels and semantic tones for contract enums. Keeping these in one
 * place means every page renders a given status identically.
 */
import type {
  CertificateStatus,
  CertificateVerificationStatus,
  DataSource,
  DeliveryStatus,
  FindingType,
  InvoiceStatus,
  PaymentStatus,
  PolicyDecisionKind,
  ProductCategory,
  PurchaseOrderStatus,
  RequestStatus,
  Severity,
} from "@qm/contracts";
import type { InventoryItemDto } from "@qm/contracts";

export type Tone = "neutral" | "accent" | "allow" | "review" | "block" | "info";

/**
 * Total lookup for an enum-keyed map. The API can add an enum value before
 * the web app knows it; rendering must degrade to `fallback`, not crash.
 */
export function lookup<K extends string, V>(map: Readonly<Record<K, V>>, key: string, fallback: V): V {
  return Object.hasOwn(map, key) ? map[key as K] : fallback;
}

export const CATEGORY_LABELS: Record<ProductCategory, string> = {
  food_packaging: "Food packaging",
  cleaning_supplies: "Cleaning supplies",
  cooking_ingredients: "Cooking ingredients",
  beverages: "Beverages",
  kitchen_equipment: "Kitchen equipment",
  alcohol: "Alcohol",
  gift_cards: "Gift cards",
  services: "Services",
};

export function categoryLabel(category: string | null | undefined): string {
  if (!category) return "—";
  return CATEGORY_LABELS[category as ProductCategory] ?? category;
}

export const DATA_SOURCE_LABELS: Record<DataSource, string> = {
  CHANNEL3_MARKET: "Channel3 market data",
  SANDBOX_SUPPLIER: "Sandbox supplier",
  SYNTHETIC: "Synthetic data",
};

export const DECISION_LABELS: Record<PolicyDecisionKind, string> = {
  ALLOW: "Allow",
  REVIEW_REQUIRED: "Review required",
  BLOCK: "Blocked",
};

export const DECISION_TONES: Record<PolicyDecisionKind, Tone> = {
  ALLOW: "allow",
  REVIEW_REQUIRED: "review",
  BLOCK: "block",
};

export const STOCK_TONES: Record<InventoryItemDto["status"], Tone> = {
  OK: "allow",
  LOW: "review",
  CRITICAL: "block",
  OUT: "block",
};

export const STOCK_LABELS: Record<InventoryItemDto["status"], string> = {
  OK: "OK",
  LOW: "Low",
  CRITICAL: "Critical",
  OUT: "Out of stock",
};

export const REQUEST_STATUS_TONES: Record<RequestStatus, Tone> = {
  DRAFT: "neutral",
  RESEARCHING: "info",
  READY_FOR_REVIEW: "accent",
  BLOCKED: "block",
  APPROVED: "allow",
  PAYMENT_PENDING: "review",
  PAID: "allow",
  FULFILLED: "allow",
  REJECTED: "neutral",
  CANCELLED: "neutral",
  FAILED: "block",
};

export const PO_STATUS_TONES: Record<PurchaseOrderStatus, Tone> = {
  PROPOSED: "accent",
  BLOCKED: "block",
  SUPERSEDED: "neutral",
  APPROVED: "allow",
  PAYMENT_PENDING: "review",
  PAID: "allow",
  FULFILLED: "allow",
  REJECTED: "neutral",
  CANCELLED: "neutral",
  EXPIRED: "neutral",
};

export const PAYMENT_STATUS_TONES: Record<PaymentStatus, Tone> = {
  CREATED: "neutral",
  ORDER_CREATED: "info",
  PAYER_APPROVED: "info",
  CAPTURE_PENDING: "review",
  COMPLETED: "allow",
  FAILED: "block",
  VOIDED: "neutral",
  REFUNDED: "neutral",
  PARTIALLY_REFUNDED: "review",
};

export const DELIVERY_STATUS_TONES: Record<DeliveryStatus, Tone> = {
  SCHEDULED: "info",
  IN_TRANSIT: "accent",
  DELAYED: "review",
  DELIVERED: "allow",
  CANCELLED: "neutral",
};

export const INVOICE_STATUS_TONES: Record<InvoiceStatus, Tone> = {
  MATCHED: "allow",
  DISCREPANCY: "review",
  DUPLICATE: "block",
  UNMATCHED: "neutral",
};

export const CERTIFICATE_STATUS_TONES: Record<CertificateStatus, Tone> = {
  ACTIVE: "allow",
  CONSUMED: "info",
  REVOKED: "block",
  EXPIRED: "neutral",
};

export const VERIFICATION_TONES: Record<CertificateVerificationStatus, Tone> = {
  VALID: "allow",
  EXPIRED: "review",
  CART_MODIFIED: "block",
  SIGNATURE_INVALID: "block",
  UNKNOWN_KEY: "block",
  MANDATE_CHANGED: "block",
  REVOKED: "block",
  CONSUMED: "info",
  PAYLOAD_MISMATCH: "block",
};

export const SEVERITY_TONES: Record<Severity, Tone> = {
  LOW: "neutral",
  MEDIUM: "review",
  HIGH: "block",
  CRITICAL: "block",
};

export const FINDING_LABELS: Record<FindingType, string> = {
  PROMPT_INJECTION: "Prompt injection",
  UNAUTHORIZED_FEE: "Unauthorized fee",
  POLICY_VIOLATION: "Policy violation",
  CART_TAMPERING: "Cart tampering",
  DUPLICATE_INVOICE: "Duplicate invoice",
  INVOICE_DISCREPANCY: "Invoice discrepancy",
  WEBHOOK_SIGNATURE_INVALID: "Webhook signature invalid",
  CERTIFICATE_VERIFICATION_FAILED: "Certificate verification failed",
  PAYMENT_AMOUNT_MISMATCH: "Payment amount mismatch",
  ACCESS_DENIED: "Access denied",
};

export function findingLabel(type: string): string {
  return FINDING_LABELS[type as FindingType] ?? type;
}
