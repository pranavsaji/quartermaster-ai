import * as s from "../core/validation/index.js";
import type { Schema } from "../core/validation/schema.js";
import { catalogItemDtoSchema, type CatalogItemDto } from "./catalog-item-dto.js";

export type SuppliersCatalogResponse = {
  /** A supplier catalog listing (product, pack size, price). */
  item: CatalogItemDto;
};

export const suppliersCatalogResponseSchema: Schema<SuppliersCatalogResponse> =
  s.object<SuppliersCatalogResponse>({
    item: catalogItemDtoSchema,
  });
