import * as s from "../core/validation/index.js";
import type { Schema } from "../core/validation/schema.js";
import { environmentSchema, type Environment } from "./environment.js";

export type Paypal = {
  /** Whether the feature is turned on. */
  enabled: boolean;
  /** Id of the related client. */
  clientId: string | null;
  sdkUrl: string;
  /** Deployment environment. */
  environment: Environment;
};

export const paypalSchema: Schema<Paypal> = s.object<Paypal>({
  enabled: s.boolean(),
  clientId: s.nullable(s.string()),
  sdkUrl: s.string(),
  environment: environmentSchema,
  _keysMap: {
    clientId: "client_id",
    sdkUrl: "sdk_url",
  },
});
