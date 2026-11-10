import * as s from "../core/validation/index.js";
import type { Schema } from "../core/validation/schema.js";

export type SpendBySupplier = {
  /** Supplier. */
  supplier: string;
  /** Captured, in minor units (cents). */
  capturedMinor: number;
  orders: number;
};

export const spendBySupplierSchema: Schema<SpendBySupplier> = s.object<SpendBySupplier>({
  supplier: s.string(),
  capturedMinor: s.int(),
  orders: s.int(),
  _keysMap: {
    capturedMinor: "captured_minor",
  },
});
