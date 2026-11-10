import * as s from "../core/validation/index.js";
import type { Schema } from "../core/validation/schema.js";
import { dataSourceSchema, type DataSource } from "./data-source.js";

/** A supplier offer the agent considered, with its policy verdict and delivered cost. */
export type CandidateDto = {
  /** Unique identifier (UUID). */
  id: string;
  /** Id of the related inventory item. */
  inventoryItemId: string;
  /** Id of the related supplier. */
  supplierId: string;
  supplierName: string;
  supplierApproved: boolean;
  /** Whether orders from this supplier can be paid through PayPal checkout. */
  checkoutEligible: boolean;
  /** Id of the related catalog item. */
  catalogItemId: string;
  /** Stock-keeping unit code. */
  sku: string;
  /** Short title. */
  title: string;
  /** Units in one pack. */
  packQuantity: number;
  packs: number;
  units: number;
  /** Item subtotal, in minor units (cents). */
  itemSubtotalMinor: number;
  /** Shipping, in minor units (cents). */
  shippingMinor: number;
  /** Tax, in minor units (cents). */
  taxMinor: number;
  /** Fees, in minor units (cents). */
  feesMinor: number;
  /** Delivered total, in minor units (cents). */
  deliveredTotalMinor: number;
  /**
   * Delivered cost per unit (price, shipping, tax and fees over units), in minor units; may be
   * fractional.
   */
  deliveredUnitCostMinor: number;
  /** Days from order to delivery. */
  leadTimeDays: number;
  rank: number | null;
  eligible: boolean;
  ineligibleReasons: string[];
  /** Flagged by prompt-injection screening: withheld from the agent and blocked by TrustRail. */
  quarantined: boolean;
  /** Where a piece of commercial data came from (shown as a label in the UI). */
  dataSource: DataSource;
};

export const candidateDtoSchema: Schema<CandidateDto> = s.object<CandidateDto>({
  id: s.string(),
  inventoryItemId: s.string(),
  supplierId: s.string(),
  supplierName: s.string(),
  supplierApproved: s.boolean(),
  checkoutEligible: s.boolean(),
  catalogItemId: s.string(),
  sku: s.string(),
  title: s.string(),
  packQuantity: s.int(),
  packs: s.float64(),
  units: s.float64(),
  itemSubtotalMinor: s.int(),
  shippingMinor: s.int(),
  taxMinor: s.int(),
  feesMinor: s.int(),
  deliveredTotalMinor: s.int(),
  deliveredUnitCostMinor: s.float64(),
  leadTimeDays: s.int(),
  rank: s.nullable(s.float64()),
  eligible: s.boolean(),
  ineligibleReasons: s.array(s.string()),
  quarantined: s.boolean(),
  dataSource: dataSourceSchema,
  _keysMap: {
    inventoryItemId: "inventory_item_id",
    supplierId: "supplier_id",
    supplierName: "supplier_name",
    supplierApproved: "supplier_approved",
    checkoutEligible: "checkout_eligible",
    catalogItemId: "catalog_item_id",
    packQuantity: "pack_quantity",
    itemSubtotalMinor: "item_subtotal_minor",
    shippingMinor: "shipping_minor",
    taxMinor: "tax_minor",
    feesMinor: "fees_minor",
    deliveredTotalMinor: "delivered_total_minor",
    deliveredUnitCostMinor: "delivered_unit_cost_minor",
    leadTimeDays: "lead_time_days",
    ineligibleReasons: "ineligible_reasons",
    dataSource: "data_source",
  },
});
