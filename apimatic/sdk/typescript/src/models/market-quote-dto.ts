import * as s from "../core/validation/index.js";
import type { Schema } from "../core/validation/schema.js";

/** A market price quote from Channel3, used as a reference only. */
export type MarketQuoteDto = {
  /** Unique identifier (UUID). */
  id: string;
  /** Where the error came from. @default "CHANNEL3_MARKET" */
  source?: "CHANNEL3_MARKET";
  /** Short title. */
  title: string;
  merchantDomain: string;
  url: string;
  /** Price, in minor units (cents). */
  priceMinor: number;
  /** ISO 4217 currency code. */
  currency: string;
  /** Units in one pack. */
  packQuantity: number | null;
  /** Quote price per unit after pack-size normalisation, in minor units; may be fractional. */
  normalizedUnitPriceMinor: number | null;
  comparable: boolean;
  /** When observed happened (ISO 8601, UTC). */
  observedAt: string;
  availability: string;
};

export const marketQuoteDtoSchema: Schema<MarketQuoteDto> = s.object<MarketQuoteDto>({
  id: s.string(),
  source: s.defaulted(s.literal("CHANNEL3_MARKET"), "CHANNEL3_MARKET"),
  title: s.string(),
  merchantDomain: s.string(),
  url: s.string(),
  priceMinor: s.float64(),
  currency: s.string(),
  packQuantity: s.nullable(s.float64()),
  normalizedUnitPriceMinor: s.nullable(s.float64()),
  comparable: s.boolean(),
  observedAt: s.string(),
  availability: s.string(),
  _keysMap: {
    merchantDomain: "merchant_domain",
    priceMinor: "price_minor",
    packQuantity: "pack_quantity",
    normalizedUnitPriceMinor: "normalized_unit_price_minor",
    observedAt: "observed_at",
  },
});
