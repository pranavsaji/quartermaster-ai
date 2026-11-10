import * as s from "../core/validation/index.js";
import type { Schema } from "../core/validation/schema.js";
import { line1Schema, type Line1 } from "./line1.js";

/** A supplier invoice to match against its purchase order and delivery. */
export type AnalyzeInvoiceRequest = {
  /** Id of the related supplier. */
  supplierId: string;
  /** Id of the related purchase order. */
  purchaseOrderId?: string | null;
  invoiceNumber: string;
  /** Invoice date (YYYY-MM-DD). */
  invoiceDate: string;
  /** ISO 4217 currency code. @default "USD" */
  currency?: "USD";
  /** Line items. */
  lines: Line1[];
  /** Total, in minor units (cents). */
  totalMinor: number;
  notes?: string;
};

export const analyzeInvoiceRequestSchema: Schema<AnalyzeInvoiceRequest> = s.object<AnalyzeInvoiceRequest>({
  supplierId: s.string(),
  purchaseOrderId: s.optionalNullable(s.string()),
  invoiceNumber: s.string(),
  invoiceDate: s.string(),
  currency: s.defaulted(s.literal("USD"), "USD"),
  lines: s.array(s.lazy(() => line1Schema)),
  totalMinor: s.int(),
  notes: s.optional(s.string()),
  _keysMap: {
    supplierId: "supplier_id",
    purchaseOrderId: "purchase_order_id",
    invoiceNumber: "invoice_number",
    invoiceDate: "invoice_date",
    totalMinor: "total_minor",
  },
});
