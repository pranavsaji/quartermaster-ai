import * as s from "../core/validation/index.js";
import type { EnumSchema } from "../core/validation/schema.js";

/** Outcome of a certificate verification. */
export const CertificateVerificationStatus = {
  Valid: "VALID",
  Expired: "EXPIRED",
  CartModified: "CART_MODIFIED",
  SignatureInvalid: "SIGNATURE_INVALID",
  UnknownKey: "UNKNOWN_KEY",
  MandateChanged: "MANDATE_CHANGED",
  Revoked: "REVOKED",
  Consumed: "CONSUMED",
  PayloadMismatch: "PAYLOAD_MISMATCH",
} as const;
export type CertificateVerificationStatus =
  | (typeof CertificateVerificationStatus)[keyof typeof CertificateVerificationStatus]
  | (string & {});

export const certificateVerificationStatusSchema: EnumSchema<CertificateVerificationStatus> =
  s.enumOf<CertificateVerificationStatus>(CertificateVerificationStatus);
