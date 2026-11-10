import * as s from "../core/validation/index.js";
import type { EnumSchema } from "../core/validation/schema.js";

/** What happens when a price exceeds the market premium: REVIEW or BLOCK. */
export const MarketPriceAction = {
  Review: "REVIEW",
  Block: "BLOCK",
} as const;
export type MarketPriceAction = (typeof MarketPriceAction)[keyof typeof MarketPriceAction] | (string & {});

export const marketPriceActionSchema: EnumSchema<MarketPriceAction> =
  s.enumOf<MarketPriceAction>(MarketPriceAction);
