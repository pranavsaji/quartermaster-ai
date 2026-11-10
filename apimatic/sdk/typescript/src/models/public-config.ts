import * as s from "../core/validation/index.js";
import type { Schema } from "../core/validation/schema.js";
import { accountsSchema, type Accounts } from "./accounts.js";
import { aiSchema, type Ai } from "./ai.js";
import { marketDataSchema, type MarketData } from "./market-data.js";
import { paypalSchema, type Paypal } from "./paypal.js";

/** Feature flags and integration status visible before sign-in. */
export type PublicConfig = {
  /** Deployment environment. */
  environment: string;
  paypal: Paypal;
  marketData: MarketData;
  ai: Ai;
  accounts: Accounts;
  /** Show the shared sample-workspace accounts on the sign-in page. */
  sampleAccountsHint: boolean;
};

export const publicConfigSchema: Schema<PublicConfig> = s.object<PublicConfig>({
  environment: s.string(),
  paypal: paypalSchema,
  marketData: marketDataSchema,
  ai: aiSchema,
  accounts: accountsSchema,
  sampleAccountsHint: s.boolean(),
  _keysMap: {
    marketData: "market_data",
    sampleAccountsHint: "sample_accounts_hint",
  },
});
