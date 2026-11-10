import * as s from "../core/validation/index.js";
import type { EnumSchema } from "../core/validation/schema.js";

/** Kind of security finding. */
export const FindingType = {
  PromptInjection: "PROMPT_INJECTION",
  UnauthorizedFee: "UNAUTHORIZED_FEE",
  PolicyViolation: "POLICY_VIOLATION",
  CartTampering: "CART_TAMPERING",
  DuplicateInvoice: "DUPLICATE_INVOICE",
  InvoiceDiscrepancy: "INVOICE_DISCREPANCY",
  WebhookSignatureInvalid: "WEBHOOK_SIGNATURE_INVALID",
  CertificateVerificationFailed: "CERTIFICATE_VERIFICATION_FAILED",
  PaymentAmountMismatch: "PAYMENT_AMOUNT_MISMATCH",
  AccessDenied: "ACCESS_DENIED",
  PaymentReversed: "PAYMENT_REVERSED",
} as const;
export type FindingType = (typeof FindingType)[keyof typeof FindingType] | (string & {});

export const findingTypeSchema: EnumSchema<FindingType> = s.enumOf<FindingType>(FindingType);
