import * as s from "../core/validation/index.js";
import type { Schema } from "../core/validation/schema.js";
import { supplierDetailDtoSchema, type SupplierDetailDto } from "./supplier-detail-dto.js";

export type SuppliersResponse1 = {
  /** A supplier with its catalog. */
  supplier: SupplierDetailDto;
};

export const suppliersResponse1Schema: Schema<SuppliersResponse1> = s.object<SuppliersResponse1>({
  supplier: supplierDetailDtoSchema,
});
