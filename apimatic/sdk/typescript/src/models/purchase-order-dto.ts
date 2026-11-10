import * as s from "../core/validation/index.js";
import type { Schema } from "../core/validation/schema.js";
import { deliveryDtoSchema, type DeliveryDto } from "./delivery-dto.js";
import { intentCertificateDtoSchema, type IntentCertificateDto } from "./intent-certificate-dto.js";
import { paymentDtoSchema, type PaymentDto } from "./payment-dto.js";
import { policyDecisionDtoSchema, type PolicyDecisionDto } from "./policy-decision-dto.js";
import { purchaseOrderItemDtoSchema, type PurchaseOrderItemDto } from "./purchase-order-item-dto.js";
import { purchaseOrderStatusSchema, type PurchaseOrderStatus } from "./purchase-order-status.js";

/** A proposed or committed purchase order (immutable once proposed). */
export type PurchaseOrderDto = {
  /** Unique identifier (UUID). */
  id: string;
  number: string;
  /** Id of the related request. */
  requestId: string | null;
  /** Id of the related supplier. */
  supplierId: string;
  supplierName: string;
  /** Purchase order lifecycle. */
  status: PurchaseOrderStatus;
  /** ISO 4217 currency code. */
  currency: string;
  /** Subtotal, in minor units (cents). */
  subtotalMinor: number;
  /** Shipping, in minor units (cents). */
  shippingMinor: number;
  /** Tax, in minor units (cents). */
  taxMinor: number;
  /** Fees, in minor units (cents). */
  feesMinor: number;
  /** Total, in minor units (cents). */
  totalMinor: number;
  /** SHA-256 of the canonical cart, bound into the Intent Certificate. */
  cartHash: string;
  /** The items in this response. */
  items: PurchaseOrderItemDto[];
  policyDecision: PolicyDecisionDto | null;
  /** Intent Certificate. */
  certificate: IntentCertificateDto | null;
  /** Payment attempt. */
  payment: PaymentDto | null;
  /** Delivery. */
  delivery: DeliveryDto | null;
  /** When created happened (ISO 8601, UTC). */
  createdAt: string;
};

export const purchaseOrderDtoSchema: Schema<PurchaseOrderDto> = s.object<PurchaseOrderDto>({
  id: s.string(),
  number: s.string(),
  requestId: s.nullable(s.string()),
  supplierId: s.string(),
  supplierName: s.string(),
  status: purchaseOrderStatusSchema,
  currency: s.string(),
  subtotalMinor: s.int(),
  shippingMinor: s.int(),
  taxMinor: s.int(),
  feesMinor: s.int(),
  totalMinor: s.int(),
  cartHash: s.string(),
  items: s.array(s.lazy(() => purchaseOrderItemDtoSchema)),
  policyDecision: s.nullable(s.lazy(() => policyDecisionDtoSchema)),
  certificate: s.nullable(s.lazy(() => intentCertificateDtoSchema)),
  payment: s.nullable(s.lazy(() => paymentDtoSchema)),
  delivery: s.nullable(s.lazy(() => deliveryDtoSchema)),
  createdAt: s.string(),
  _keysMap: {
    requestId: "request_id",
    supplierId: "supplier_id",
    supplierName: "supplier_name",
    subtotalMinor: "subtotal_minor",
    shippingMinor: "shipping_minor",
    taxMinor: "tax_minor",
    feesMinor: "fees_minor",
    totalMinor: "total_minor",
    cartHash: "cart_hash",
    policyDecision: "policy_decision",
    createdAt: "created_at",
  },
});
