import * as s from "../core/validation/index.js";
import type { Schema } from "../core/validation/schema.js";
import { invoiceDtoSchema, type InvoiceDto } from "./invoice-dto.js";

export type InvoicesResponse = {
  items: InvoiceDto[];
};

export const invoicesResponseSchema: Schema<InvoicesResponse> = s.object<InvoicesResponse>({
  items: s.array(s.lazy(() => invoiceDtoSchema)),
});
