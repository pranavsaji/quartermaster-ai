import * as s from "../core/validation/index.js";
import type { Schema } from "../core/validation/schema.js";

/** Result of re-verifying the hash-chained audit log. */
export type AuditChainVerificationDto = {
  /** Whether verification passed. */
  valid: boolean;
  eventsChecked: number;
  firstInvalidSequence: number | null;
};

export const auditChainVerificationDtoSchema: Schema<AuditChainVerificationDto> =
  s.object<AuditChainVerificationDto>({
    valid: s.boolean(),
    eventsChecked: s.int(),
    firstInvalidSequence: s.nullable(s.float64()),
    _keysMap: {
      eventsChecked: "events_checked",
      firstInvalidSequence: "first_invalid_sequence",
    },
  });
