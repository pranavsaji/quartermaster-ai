import * as s from "../core/validation/index.js";
import type { Schema } from "../core/validation/schema.js";
import { dataSourceSchema, type DataSource } from "./data-source.js";
import { feeTermDtoSchema, type FeeTermDto } from "./fee-term-dto.js";

/** A supplier with its terms and mandate approval. */
export type SupplierDto = {
  /** Unique identifier (UUID). */
  id: string;
  /** Display name. */
  name: string;
  /** Approved in the current Spend Mandate. */
  approved: boolean;
  /** Whether the record is in use. */
  active: boolean;
  /** Whether orders from this supplier can be paid through PayPal checkout. */
  checkoutEligible: boolean;
  /** Days from order to delivery. */
  leadTimeDays: number;
  /** Tax rate, in basis points (825 = 8.25%). */
  taxRateBps: number;
  /** Published fees and shipping terms; any other fee in a quote is unauthorised. */
  feeTerms: FeeTermDto[];
  /** Supplier website. */
  website: string | null;
  /** Free-text description. */
  description: string | null;
  /** Flagged by prompt-injection screening: withheld from the agent and blocked by TrustRail. */
  quarantined: boolean;
  catalogItems: number;
  /** Where a piece of commercial data came from (shown as a label in the UI). */
  dataSource: DataSource;
};

export const supplierDtoSchema: Schema<SupplierDto> = s.object<SupplierDto>({
  id: s.string(),
  name: s.string(),
  approved: s.boolean(),
  active: s.boolean(),
  checkoutEligible: s.boolean(),
  leadTimeDays: s.int(),
  taxRateBps: s.int(),
  feeTerms: s.array(s.lazy(() => feeTermDtoSchema)),
  website: s.nullable(s.string()),
  description: s.nullable(s.string()),
  quarantined: s.boolean(),
  catalogItems: s.int(),
  dataSource: dataSourceSchema,
  _keysMap: {
    checkoutEligible: "checkout_eligible",
    leadTimeDays: "lead_time_days",
    taxRateBps: "tax_rate_bps",
    feeTerms: "fee_terms",
    catalogItems: "catalog_items",
    dataSource: "data_source",
  },
});
