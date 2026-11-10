import * as s from "../core/validation/index.js";
import type { Schema } from "../core/validation/schema.js";
import { severitySchema, type Severity } from "./severity.js";

/** One check of the invoice match (amounts, quantities, duplicates). */
export type InvoiceMatchDto = {
  check: string;
  passed: boolean;
  /** Severity. */
  severity: Severity | null;
  detail: string;
};

export const invoiceMatchDtoSchema: Schema<InvoiceMatchDto> = s.object<InvoiceMatchDto>({
  check: s.string(),
  passed: s.boolean(),
  severity: s.nullable(s.lazy(() => severitySchema)),
  detail: s.string(),
});
