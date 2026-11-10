import * as s from "../core/validation/index.js";
import type { Schema } from "../core/validation/schema.js";
import {
  certificateVerificationStatusSchema,
  type CertificateVerificationStatus,
} from "./certificate-verification-status.js";
import { intentCertificateDtoSchema, type IntentCertificateDto } from "./intent-certificate-dto.js";
import { policyCheckDtoSchema, type PolicyCheckDto } from "./policy-check-dto.js";

/** Result of verifying an Intent Certificate's signature and bindings. */
export type CertificateVerificationDto = {
  /** Id of the related intent. */
  intentId: string;
  /** Outcome of a certificate verification. */
  status: CertificateVerificationStatus;
  /** Whether verification passed. */
  valid: boolean;
  checks: PolicyCheckDto[];
  /** The owner's signed approval of one exact cart (Ed25519). */
  certificate: IntentCertificateDto;
  /** When verified happened (ISO 8601, UTC). */
  verifiedAt: string;
};

export const certificateVerificationDtoSchema: Schema<CertificateVerificationDto> =
  s.object<CertificateVerificationDto>({
    intentId: s.string(),
    status: certificateVerificationStatusSchema,
    valid: s.boolean(),
    checks: s.array(s.lazy(() => policyCheckDtoSchema)),
    certificate: intentCertificateDtoSchema,
    verifiedAt: s.string(),
    _keysMap: {
      intentId: "intent_id",
      verifiedAt: "verified_at",
    },
  });
