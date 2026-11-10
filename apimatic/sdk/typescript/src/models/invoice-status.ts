import * as s from "../core/validation/index.js";
import type { EnumSchema } from "../core/validation/schema.js";

/** Invoice match outcome. */
export const InvoiceStatus = {
  Matched: "MATCHED",
  Discrepancy: "DISCREPANCY",
  Duplicate: "DUPLICATE",
  Unmatched: "UNMATCHED",
} as const;
export type InvoiceStatus = (typeof InvoiceStatus)[keyof typeof InvoiceStatus] | (string & {});

export const invoiceStatusSchema: EnumSchema<InvoiceStatus> = s.enumOf<InvoiceStatus>(InvoiceStatus);
