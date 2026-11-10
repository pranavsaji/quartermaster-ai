import * as s from "../core/validation/index.js";
import type { Schema } from "../core/validation/schema.js";
import { invoiceMatchDtoSchema, type InvoiceMatchDto } from "./invoice-match-dto.js";
import { invoiceStatusSchema, type InvoiceStatus } from "./invoice-status.js";

/** A supplier invoice and its three-way match result. */
export type InvoiceDto = {
  /** Unique identifier (UUID). */
  id: string;
  /** Id of the related supplier. */
  supplierId: string;
  /** Id of the related purchase order. */
  purchaseOrderId: string | null;
  invoiceNumber: string;
  /** Invoice date (YYYY-MM-DD). */
  invoiceDate: string;
  /** ISO 4217 currency code. */
  currency: string;
  /** Total, in minor units (cents). */
  totalMinor: number;
  /** Invoice match outcome. */
  status: InvoiceStatus;
  settlementAllowed: boolean;
  matches: InvoiceMatchDto[];
  /** When created happened (ISO 8601, UTC). */
  createdAt: string;
};

export const invoiceDtoSchema: Schema<InvoiceDto> = s.object<InvoiceDto>({
  id: s.string(),
  supplierId: s.string(),
  purchaseOrderId: s.nullable(s.string()),
  invoiceNumber: s.string(),
  invoiceDate: s.string(),
  currency: s.string(),
  totalMinor: s.int(),
  status: invoiceStatusSchema,
  settlementAllowed: s.boolean(),
  matches: s.array(s.lazy(() => invoiceMatchDtoSchema)),
  createdAt: s.string(),
  _keysMap: {
    supplierId: "supplier_id",
    purchaseOrderId: "purchase_order_id",
    invoiceNumber: "invoice_number",
    invoiceDate: "invoice_date",
    totalMinor: "total_minor",
    settlementAllowed: "settlement_allowed",
    createdAt: "created_at",
  },
});
