import * as s from "../core/validation/index.js";
import type { Schema } from "../core/validation/schema.js";
import { feeTermSchema, type FeeTerm } from "./fee-term.js";

/** Fields for creating or updating a supplier. */
export type SupplierInput = {
  /** Display name. */
  name: string;
  /** Supplier website. */
  website?: string | null;
  /** Free-text description. */
  description?: string | null;
  /** Days from order to delivery. */
  leadTimeDays: number;
  /** Tax rate, in basis points (825 = 8.25%). */
  taxRateBps: number;
  /** Published fees and shipping terms; any other fee in a quote is unauthorised. */
  feeTerms?: FeeTerm[];
  /** Whether the record is in use. @default true */
  active?: boolean;
  /** Whether orders from this supplier can be paid through PayPal checkout. @default true */
  checkoutEligible?: boolean;
};

export const supplierInputSchema: Schema<SupplierInput> = s.object<SupplierInput>({
  name: s.string(),
  website: s.optionalNullable(s.string()),
  description: s.optionalNullable(s.string()),
  leadTimeDays: s.int(),
  taxRateBps: s.int(),
  feeTerms: s.optional(s.array(s.lazy(() => feeTermSchema))),
  active: s.defaulted(s.boolean(), true),
  checkoutEligible: s.defaulted(s.boolean(), true),
  _keysMap: {
    leadTimeDays: "lead_time_days",
    taxRateBps: "tax_rate_bps",
    feeTerms: "fee_terms",
    checkoutEligible: "checkout_eligible",
  },
});
