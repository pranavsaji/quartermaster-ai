import * as s from "../core/validation/index.js";
import type { EnumSchema } from "../core/validation/schema.js";

export const ActorType = {
  User: "USER",
  System: "SYSTEM",
  Agent: "AGENT",
  Paypal: "PAYPAL",
} as const;
export type ActorType = (typeof ActorType)[keyof typeof ActorType] | (string & {});

export const actorTypeSchema: EnumSchema<ActorType> = s.enumOf<ActorType>(ActorType);
