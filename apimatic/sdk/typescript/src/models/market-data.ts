import * as s from "../core/validation/index.js";
import type { Schema } from "../core/validation/schema.js";

export type MarketData = {
  /** Provider in use. @default "channel3" */
  provider?: "channel3";
  /** Whether the feature is turned on. */
  enabled: boolean;
};

export const marketDataSchema: Schema<MarketData> = s.object<MarketData>({
  provider: s.defaulted(s.literal("channel3"), "channel3"),
  enabled: s.boolean(),
});
