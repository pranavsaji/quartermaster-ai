import * as s from "../core/validation/index.js";
import type { Schema } from "../core/validation/schema.js";

/** The signed fields of an Intent Certificate. */
export type IntentCertificatePayload = {
  /** @default 1 */
  certificateVersion?: 1;
  /** Id of the related intent. */
  intentId: string;
  /** Id of the related organization. */
  organizationId: string;
  /** Id of the related buyer. */
  buyerId: string;
  /** Id of the related purchase order. */
  purchaseOrderId: string;
  /** Id of the related supplier. */
  supplierId: string;
  /** SHA-256 of the canonical cart, bound into the Intent Certificate. */
  cartHash: string;
  /** Id of the related mandate. */
  mandateId: string;
  mandateVersion: number;
  /** Id of the related policy decision. */
  policyDecisionId: string;
  /** ISO 4217 currency code. */
  currency: string;
  /** Approved amount, in minor units (cents). */
  approvedAmountMinor: number;
  /** When approved happened (ISO 8601, UTC). */
  approvedAt: string;
  /** When expires happened (ISO 8601, UTC). */
  expiresAt: string;
  nonce: string;
  /** Id of the related key. */
  keyId: string;
};

export const intentCertificatePayloadSchema: Schema<IntentCertificatePayload> =
  s.object<IntentCertificatePayload>({
    certificateVersion: s.defaulted(s.literal(1), 1),
    intentId: s.string(),
    organizationId: s.string(),
    buyerId: s.string(),
    purchaseOrderId: s.string(),
    supplierId: s.string(),
    cartHash: s.string(),
    mandateId: s.string(),
    mandateVersion: s.float64(),
    policyDecisionId: s.string(),
    currency: s.string(),
    approvedAmountMinor: s.int(),
    approvedAt: s.string(),
    expiresAt: s.string(),
    nonce: s.string(),
    keyId: s.string(),
    _keysMap: {
      certificateVersion: "certificate_version",
      intentId: "intent_id",
      organizationId: "organization_id",
      buyerId: "buyer_id",
      purchaseOrderId: "purchase_order_id",
      supplierId: "supplier_id",
      cartHash: "cart_hash",
      mandateId: "mandate_id",
      mandateVersion: "mandate_version",
      policyDecisionId: "policy_decision_id",
      approvedAmountMinor: "approved_amount_minor",
      approvedAt: "approved_at",
      expiresAt: "expires_at",
      keyId: "key_id",
    },
  });
