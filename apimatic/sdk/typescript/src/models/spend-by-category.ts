import * as s from "../core/validation/index.js";
import type { Schema } from "../core/validation/schema.js";

export type SpendByCategory = {
  /** Product category. */
  category: string;
  /** Captured, in minor units (cents). */
  capturedMinor: number;
};

export const spendByCategorySchema: Schema<SpendByCategory> = s.object<SpendByCategory>({
  category: s.string(),
  capturedMinor: s.int(),
  _keysMap: {
    capturedMinor: "captured_minor",
  },
});
