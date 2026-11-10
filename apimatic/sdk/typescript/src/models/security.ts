import * as s from "../core/validation/index.js";
import type { Schema } from "../core/validation/schema.js";

export type Security = {
  /** Number of findings. */
  findingsTotal: number;
  blockedAttempts: number;
  promptInjectionsDetected: number;
  duplicateInvoicesFlagged: number;
  duplicateCaptures: number;
};

export const securitySchema: Schema<Security> = s.object<Security>({
  findingsTotal: s.int(),
  blockedAttempts: s.int(),
  promptInjectionsDetected: s.int(),
  duplicateInvoicesFlagged: s.int(),
  duplicateCaptures: s.int(),
  _keysMap: {
    findingsTotal: "findings_total",
    blockedAttempts: "blocked_attempts",
    promptInjectionsDetected: "prompt_injections_detected",
    duplicateInvoicesFlagged: "duplicate_invoices_flagged",
    duplicateCaptures: "duplicate_captures",
  },
});
