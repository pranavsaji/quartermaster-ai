import * as s from "../core/validation/index.js";
import type { Schema } from "../core/validation/schema.js";
import { supplierDtoSchema, type SupplierDto } from "./supplier-dto.js";

export type SuppliersResponse = {
  items: SupplierDto[];
};

export const suppliersResponseSchema: Schema<SuppliersResponse> = s.object<SuppliersResponse>({
  items: s.array(s.lazy(() => supplierDtoSchema)),
});
