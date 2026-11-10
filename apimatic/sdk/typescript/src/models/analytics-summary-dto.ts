import * as s from "../core/validation/index.js";
import type { Schema } from "../core/validation/schema.js";
import { budgetDtoSchema, type BudgetDto } from "./budget-dto.js";
import { decisionsByKindSchema, type DecisionsByKind } from "./decisions-by-kind.js";
import { deliveriesSchema, type Deliveries } from "./deliveries.js";
import { findingsByTypeSchema, type FindingsByType } from "./findings-by-type.js";
import { inventorySchema, type Inventory } from "./inventory.js";
import { procurementTimeMsSchema, type ProcurementTimeMs } from "./procurement-time-ms.js";
import { securitySchema, type Security } from "./security.js";
import { spendByCategorySchema, type SpendByCategory } from "./spend-by-category.js";
import { spendBySupplierSchema, type SpendBySupplier } from "./spend-by-supplier.js";
import { spendByWeekSchema, type SpendByWeek } from "./spend-by-week.js";
import { totalsSchema, type Totals } from "./totals.js";

/** Spend, budget, procurement and security outcomes for the workspace. */
export type AnalyticsSummaryDto = {
  /** ISO 4217 currency code. */
  currency: string;
  /** The current weekly budget: limit, reserved and spent amounts. */
  budget: BudgetDto;
  totals: Totals;
  security: Security;
  inventory: Inventory;
  deliveries: Deliveries;
  spendByWeek: SpendByWeek[];
  /** Captured spend net of refunds, per supplier, largest first. */
  spendBySupplier: SpendBySupplier[];
  spendByCategory: SpendByCategory[];
  decisionsByKind: DecisionsByKind[];
  findingsByType: FindingsByType[];
  /** Procurement time, in milliseconds. */
  procurementTimeMs: ProcurementTimeMs;
};

export const analyticsSummaryDtoSchema: Schema<AnalyticsSummaryDto> = s.object<AnalyticsSummaryDto>({
  currency: s.string(),
  budget: budgetDtoSchema,
  totals: totalsSchema,
  security: securitySchema,
  inventory: inventorySchema,
  deliveries: deliveriesSchema,
  spendByWeek: s.array(s.lazy(() => spendByWeekSchema)),
  spendBySupplier: s.array(s.lazy(() => spendBySupplierSchema)),
  spendByCategory: s.array(s.lazy(() => spendByCategorySchema)),
  decisionsByKind: s.array(s.lazy(() => decisionsByKindSchema)),
  findingsByType: s.array(s.lazy(() => findingsByTypeSchema)),
  procurementTimeMs: procurementTimeMsSchema,
  _keysMap: {
    spendByWeek: "spend_by_week",
    spendBySupplier: "spend_by_supplier",
    spendByCategory: "spend_by_category",
    decisionsByKind: "decisions_by_kind",
    findingsByType: "findings_by_type",
    procurementTimeMs: "procurement_time_ms",
  },
});
