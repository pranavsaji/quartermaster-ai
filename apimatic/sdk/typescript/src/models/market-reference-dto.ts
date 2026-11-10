import * as s from "../core/validation/index.js";
import type { Schema } from "../core/validation/schema.js";
import { marketQuoteDtoSchema, type MarketQuoteDto } from "./market-quote-dto.js";
import { status1Schema, type Status1 } from "./status1.js";

/** The market reference price for an item. */
export type MarketReferenceDto = {
  /** Id of the related inventory item. */
  inventoryItemId: string;
  /**
   * Market reference price per unit, in minor units; may be fractional (null when no comparable
   * quote).
   */
  referenceUnitPriceMinor: number | null;
  sampleSize: number;
  /** When observed happened (ISO 8601, UTC). */
  observedAt: string | null;
  /** Current status. */
  status: Status1;
  quotes: MarketQuoteDto[];
};

export const marketReferenceDtoSchema: Schema<MarketReferenceDto> = s.object<MarketReferenceDto>({
  inventoryItemId: s.string(),
  referenceUnitPriceMinor: s.nullable(s.float64()),
  sampleSize: s.float64(),
  observedAt: s.nullable(s.string()),
  status: status1Schema,
  quotes: s.array(s.lazy(() => marketQuoteDtoSchema)),
  _keysMap: {
    inventoryItemId: "inventory_item_id",
    referenceUnitPriceMinor: "reference_unit_price_minor",
    sampleSize: "sample_size",
    observedAt: "observed_at",
  },
});
