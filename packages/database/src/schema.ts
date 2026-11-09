import { sql, type SQL } from "drizzle-orm";
import {
  DELIVERY_STATUSES,
  INVOICE_STATUSES,
  PAYMENT_STATUSES,
  PO_STATUSES,
  REFUND_STATUSES,
  REQUEST_STATUSES,
} from "@qm/contracts";
import {
  bigint,
  boolean,
  check,
  date,
  doublePrecision,
  index,
  integer,
  jsonb,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
  type AnyPgColumn,
} from "drizzle-orm/pg-core";

/** All money columns are BIGINT minor units, read as JS numbers (safe up to 2^53). */
const money = (name: string) => bigint(name, { mode: "number" });
const ts = (name: string) => timestamp(name, { withTimezone: true, mode: "date" });
const createdAt = () => ts("created_at").notNull().defaultNow();
const updatedAt = () => ts("updated_at").notNull().defaultNow();
const orgId = () => uuid("organization_id").notNull().references(() => organizations.id, { onDelete: "cascade" });
/** A CHECK constraint restricting a text column to the given values (kept in sync with contracts). */
const oneOf = (column: SQL.Aliased | SQL | AnyPgColumn, values: readonly string[]): SQL => sql`${column} in (${sql.raw(values.map((v) => `'${v}'`).join(", "))})`;

/* ================================================================ Identity */

export const organizations = pgTable("organizations", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: text("name").notNull(),
  timezone: text("timezone").notNull().default("America/Los_Angeles"),
  currency: text("currency").notNull().default("USD"),
  createdAt: createdAt(),
});

export const users = pgTable(
  "users",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    email: text("email").notNull(),
    name: text("name").notNull(),
    passwordHash: text("password_hash").notNull(),
    disabled: boolean("disabled").notNull().default(false),
    failedLogins: integer("failed_logins").notNull().default(0),
    lockedUntil: ts("locked_until"),
    createdAt: createdAt(),
  },
  (t) => [uniqueIndex("users_email_uq").on(sql`lower(${t.email})`)],
);

export const memberships = pgTable(
  "memberships",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    organizationId: orgId(),
    userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
    role: text("role", { enum: ["OWNER", "MANAGER", "VIEWER"] }).notNull(),
    createdAt: createdAt(),
  },
  (t) => [uniqueIndex("memberships_org_user_uq").on(t.organizationId, t.userId)],
);

export const sessions = pgTable(
  "sessions",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    tokenHash: text("token_hash").notNull(),
    userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
    organizationId: orgId(),
    expiresAt: ts("expires_at").notNull(),
    revokedAt: ts("revoked_at"),
    lastSeenAt: ts("last_seen_at").notNull().defaultNow(),
    userAgent: text("user_agent"),
    ip: text("ip"),
    createdAt: createdAt(),
  },
  (t) => [uniqueIndex("sessions_token_hash_uq").on(t.tokenHash), index("sessions_user_idx").on(t.userId)],
);

/* =============================================================== Inventory */

export const inventoryItems = pgTable(
  "inventory_items",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    organizationId: orgId(),
    sku: text("sku").notNull(),
    name: text("name").notNull(),
    category: text("category").notNull(),
    unit: text("unit").notNull(),
    onHand: integer("on_hand").notNull().default(0),
    safetyStock: integer("safety_stock").notNull().default(0),
    coverageDays: integer("coverage_days").notNull().default(3),
    leadTimeDaysOverride: integer("lead_time_days_override"),
    preferredSupplierId: uuid("preferred_supplier_id"),
    searchQuery: text("search_query").notNull(),
    keywords: jsonb("keywords").$type<string[]>().notNull().default([]),
    dataSource: text("data_source", { enum: ["CHANNEL3_MARKET", "SANDBOX_SUPPLIER", "SYNTHETIC"] }).notNull().default("SYNTHETIC"),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [uniqueIndex("inventory_items_org_sku_uq").on(t.organizationId, t.sku)],
);

export const stockMovements = pgTable(
  "stock_movements",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    organizationId: orgId(),
    inventoryItemId: uuid("inventory_item_id").notNull().references(() => inventoryItems.id, { onDelete: "cascade" }),
    quantityDelta: integer("quantity_delta").notNull(),
    reason: text("reason").notNull(),
    referenceType: text("reference_type"),
    referenceId: uuid("reference_id"),
    note: text("note"),
    createdBy: uuid("created_by"),
    createdAt: createdAt(),
  },
  (t) => [index("stock_movements_item_idx").on(t.inventoryItemId, t.createdAt)],
);

export const consumptionHistory = pgTable(
  "consumption_history",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    organizationId: orgId(),
    inventoryItemId: uuid("inventory_item_id").notNull().references(() => inventoryItems.id, { onDelete: "cascade" }),
    day: date("day", { mode: "string" }).notNull(),
    quantity: integer("quantity").notNull(),
    dataSource: text("data_source").notNull().default("SYNTHETIC"),
  },
  (t) => [uniqueIndex("consumption_item_day_uq").on(t.inventoryItemId, t.day)],
);

export const forecastRuns = pgTable("forecast_runs", {
  id: uuid("id").primaryKey().defaultRandom(),
  organizationId: orgId(),
  requestId: uuid("request_id"),
  demandMultiplier: doublePrecision("demand_multiplier").notNull(),
  method: text("method").notNull().default("REORDER_POINT_V1"),
  lines: jsonb("lines").$type<unknown[]>().notNull(),
  createdBy: uuid("created_by"),
  createdAt: createdAt(),
});

/* =============================================================== Suppliers */

export interface FeeTerm {
  code: string;
  label: string;
  kind: "SHIPPING" | "FEE";
  amount_minor: number;
  waived_over_minor: number | null;
}

export interface StorefrontLine {
  kind: "FEE" | "SHIPPING";
  code: string;
  description: string;
  amount_minor: number;
  recurring?: boolean;
}

export const suppliers = pgTable(
  "suppliers",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    organizationId: orgId(),
    name: text("name").notNull(),
    active: boolean("active").notNull().default(true),
    checkoutEligible: boolean("checkout_eligible").notNull().default(false),
    leadTimeDays: integer("lead_time_days").notNull(),
    taxRateBps: integer("tax_rate_bps").notNull().default(0),
    feeTerms: jsonb("fee_terms").$type<FeeTerm[]>().notNull().default([]),
    /**
     * Simulated storefront behaviour: extra lines this sandbox supplier's quote endpoint
     * returns beyond its published terms. Used to demonstrate TrustRail on seeded fixtures.
     */
    storefrontQuoteLines: jsonb("storefront_quote_lines").$type<StorefrontLine[]>().notNull().default([]),
    website: text("website"),
    description: text("description"),
    dataSource: text("data_source").notNull().default("SANDBOX_SUPPLIER"),
    quarantined: boolean("quarantined").notNull().default(false),
    createdAt: createdAt(),
  },
  (t) => [uniqueIndex("suppliers_org_name_uq").on(t.organizationId, t.name)],
);

export const supplierCatalogItems = pgTable(
  "supplier_catalog_items",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    organizationId: orgId(),
    supplierId: uuid("supplier_id").notNull().references(() => suppliers.id, { onDelete: "cascade" }),
    sku: text("sku").notNull(),
    title: text("title").notNull(),
    description: text("description").notNull().default(""),
    category: text("category").notNull(),
    inventoryItemId: uuid("inventory_item_id").references(() => inventoryItems.id, { onDelete: "set null" }),
    packQuantity: integer("pack_quantity").notNull(),
    unitPriceMinor: money("unit_price_minor").notNull(),
    currency: text("currency").notNull().default("USD"),
    inStock: boolean("in_stock").notNull().default(true),
    recurring: boolean("recurring").notNull().default(false),
    quarantined: boolean("quarantined").notNull().default(false),
    quarantineReason: text("quarantine_reason"),
    updatedAt: updatedAt(),
  },
  (t) => [uniqueIndex("catalog_supplier_sku_uq").on(t.supplierId, t.sku), index("catalog_item_idx").on(t.inventoryItemId)],
);

export const marketQuotes = pgTable(
  "market_quotes",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    organizationId: orgId(),
    requestId: uuid("request_id"),
    inventoryItemId: uuid("inventory_item_id").notNull().references(() => inventoryItems.id, { onDelete: "cascade" }),
    source: text("source").notNull().default("CHANNEL3_MARKET"),
    externalProductId: text("external_product_id").notNull(),
    title: text("title").notNull(),
    merchantDomain: text("merchant_domain").notNull(),
    url: text("url").notNull(),
    priceMinor: money("price_minor").notNull(),
    currency: text("currency").notNull(),
    packQuantity: doublePrecision("pack_quantity"),
    normalizedUnitPriceMinor: doublePrecision("normalized_unit_price_minor"),
    comparable: boolean("comparable").notNull(),
    availability: text("availability").notNull(),
    suspicious: boolean("suspicious").notNull().default(false),
    observedAt: ts("observed_at").notNull().defaultNow(),
  },
  (t) => [
    index("market_quotes_item_idx").on(t.inventoryItemId, t.observedAt),
    index("market_quotes_request_idx").on(t.requestId),
    check("market_quotes_amounts_ck", sql`${t.priceMinor} >= 0 and (${t.packQuantity} is null or ${t.packQuantity} > 0)`),
  ],
);

/* ============================================================= Procurement */

export const purchaseRequests = pgTable(
  "purchase_requests",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    organizationId: orgId(),
    createdBy: uuid("created_by").notNull().references(() => users.id),
    status: text("status", { enum: REQUEST_STATUSES }).notNull().default("DRAFT"),
    instruction: text("instruction").notNull(),
    currency: text("currency").notNull(),
    budgetLimitMinor: money("budget_limit_minor"),
    requiredBy: date("required_by", { mode: "string" }),
    allowAlternatives: boolean("allow_alternatives").notNull().default(true),
    demandMultiplier: doublePrecision("demand_multiplier"),
    intent: jsonb("intent").$type<Record<string, unknown>>(),
    aiMode: text("ai_mode"),
    recommendation: jsonb("recommendation").$type<Record<string, unknown>>(),
    market: jsonb("market").$type<unknown[]>().notNull().default([]),
    forecastRunId: uuid("forecast_run_id"),
    error: text("error"),
    researchStartedAt: ts("research_started_at"),
    researchCompletedAt: ts("research_completed_at"),
    approvedAt: ts("approved_at"),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [
    index("purchase_requests_org_idx").on(t.organizationId, t.createdAt),
    // The sweeper looks for research abandoned by a crashed process.
    index("purchase_requests_researching_idx").on(t.researchStartedAt).where(sql`${t.status} = 'RESEARCHING'`),
    check("purchase_requests_status_ck", oneOf(t.status, REQUEST_STATUSES)),
    check("purchase_requests_budget_ck", sql`${t.budgetLimitMinor} is null or ${t.budgetLimitMinor} > 0`),
  ],
);

export const purchaseCandidates = pgTable(
  "purchase_candidates",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    organizationId: orgId(),
    requestId: uuid("request_id").notNull().references(() => purchaseRequests.id, { onDelete: "cascade" }),
    inventoryItemId: uuid("inventory_item_id").notNull(),
    supplierId: uuid("supplier_id").notNull().references(() => suppliers.id),
    catalogItemId: uuid("catalog_item_id").notNull().references(() => supplierCatalogItems.id),
    packs: integer("packs").notNull(),
    units: integer("units").notNull(),
    quote: jsonb("quote").$type<Record<string, unknown>>().notNull(),
    deliveredUnitCostMinor: doublePrecision("delivered_unit_cost_minor").notNull(),
    rank: integer("rank"),
    eligible: boolean("eligible").notNull(),
    ineligibleReasons: jsonb("ineligible_reasons").$type<string[]>().notNull().default([]),
    quarantined: boolean("quarantined").notNull().default(false),
    createdAt: createdAt(),
  },
  (t) => [index("purchase_candidates_request_idx").on(t.requestId)],
);

export const purchaseOrders = pgTable(
  "purchase_orders",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    organizationId: orgId(),
    requestId: uuid("request_id").references(() => purchaseRequests.id, { onDelete: "set null" }),
    supplierId: uuid("supplier_id").notNull().references(() => suppliers.id),
    number: text("number").notNull(),
    status: text("status", { enum: PO_STATUSES }).notNull().default("PROPOSED"),
    currency: text("currency").notNull(),
    subtotalMinor: money("subtotal_minor").notNull(),
    shippingMinor: money("shipping_minor").notNull(),
    taxMinor: money("tax_minor").notNull(),
    feesMinor: money("fees_minor").notNull(),
    totalMinor: money("total_minor").notNull(),
    cartHash: text("cart_hash").notNull(),
    /** Immutable snapshot of the cart and the quoted catalog prices at proposal time. */
    cartSnapshot: jsonb("cart_snapshot").$type<Record<string, unknown>>().notNull(),
    planAttempt: integer("plan_attempt").notNull().default(1),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [
    uniqueIndex("purchase_orders_org_number_uq").on(t.organizationId, t.number),
    index("purchase_orders_request_idx").on(t.requestId),
    index("purchase_orders_org_status_idx").on(t.organizationId, t.status, t.createdAt),
    check("purchase_orders_status_ck", oneOf(t.status, PO_STATUSES)),
    check(
      "purchase_orders_amounts_ck",
      sql`${t.subtotalMinor} >= 0 and ${t.shippingMinor} >= 0 and ${t.taxMinor} >= 0 and ${t.feesMinor} >= 0 and ${t.totalMinor} = ${t.subtotalMinor} + ${t.shippingMinor} + ${t.taxMinor} + ${t.feesMinor}`,
    ),
  ],
);

export const purchaseOrderItems = pgTable(
  "purchase_order_items",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    organizationId: orgId(),
    purchaseOrderId: uuid("purchase_order_id").notNull().references(() => purchaseOrders.id, { onDelete: "cascade" }),
    position: integer("position").notNull(),
    kind: text("kind", { enum: ["PRODUCT", "SHIPPING", "TAX", "FEE"] }).notNull(),
    sku: text("sku"),
    description: text("description").notNull(),
    category: text("category"),
    quantity: integer("quantity").notNull(),
    unitPriceMinor: money("unit_price_minor").notNull(),
    lineTotalMinor: money("line_total_minor").notNull(),
    recurring: boolean("recurring").notNull().default(false),
    inventoryItemId: uuid("inventory_item_id"),
    catalogItemId: uuid("catalog_item_id"),
    packQuantity: integer("pack_quantity"),
  },
  (t) => [uniqueIndex("po_items_po_position_uq").on(t.purchaseOrderId, t.position)],
);

/* =============================================================== TrustRail */

export const spendMandates = pgTable(
  "spend_mandates",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    organizationId: orgId(),
    version: integer("version").notNull(),
    status: text("status", { enum: ["ACTIVE", "SUPERSEDED"] }).notNull(),
    currency: text("currency").notNull(),
    weeklyBudgetMinor: money("weekly_budget_minor").notNull(),
    perOrderLimitMinor: money("per_order_limit_minor").notNull(),
    autoApprovalLimitMinor: money("auto_approval_limit_minor").notNull(),
    humanApprovalRequired: boolean("human_approval_required").notNull().default(true),
    approvedSupplierIds: jsonb("approved_supplier_ids").$type<string[]>().notNull(),
    allowedCategories: jsonb("allowed_categories").$type<string[]>().notNull(),
    maxMarketPricePremiumPct: integer("max_market_price_premium_pct").notNull(),
    marketPriceAction: text("market_price_action", { enum: ["REVIEW", "BLOCK"] }).notNull().default("REVIEW"),
    duplicateWindowHours: integer("duplicate_window_hours").notNull().default(24),
    duplicateAction: text("duplicate_action", { enum: ["REVIEW", "BLOCK"] }).notNull().default("REVIEW"),
    subscriptionsAllowed: boolean("subscriptions_allowed").notNull().default(false),
    certificateTtlMinutes: integer("certificate_ttl_minutes").notNull().default(30),
    maxQuantityMultipleOfNeed: doublePrecision("max_quantity_multiple_of_need").notNull().default(2),
    createdBy: uuid("created_by").notNull(),
    createdAt: createdAt(),
  },
  (t) => [
    uniqueIndex("mandates_org_version_uq").on(t.organizationId, t.version),
    uniqueIndex("mandates_org_active_uq").on(t.organizationId).where(sql`${t.status} = 'ACTIVE'`),
  ],
);

export const policyDecisions = pgTable(
  "policy_decisions",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    organizationId: orgId(),
    purchaseOrderId: uuid("purchase_order_id").notNull().references(() => purchaseOrders.id, { onDelete: "cascade" }),
    requestId: uuid("request_id"),
    stage: text("stage", { enum: ["EVALUATE", "APPROVE", "CAPTURE"] }).notNull(),
    decision: text("decision", { enum: ["ALLOW", "REVIEW_REQUIRED", "BLOCK"] }).notNull(),
    violations: jsonb("violations").$type<unknown[]>().notNull(),
    checks: jsonb("checks").$type<unknown[]>().notNull(),
    humanApprovalRequired: boolean("human_approval_required").notNull(),
    mandateId: uuid("mandate_id"),
    mandateVersion: integer("mandate_version").notNull(),
    policyVersion: text("policy_version").notNull(),
    inputDigest: text("input_digest").notNull(),
    createdAt: createdAt(),
  },
  (t) => [index("policy_decisions_po_idx").on(t.purchaseOrderId, t.createdAt), index("policy_decisions_org_idx").on(t.organizationId, t.createdAt)],
);

export const approvalEvents = pgTable("approval_events", {
  id: uuid("id").primaryKey().defaultRandom(),
  organizationId: orgId(),
  purchaseOrderId: uuid("purchase_order_id").notNull().references(() => purchaseOrders.id, { onDelete: "cascade" }),
  userId: uuid("user_id").notNull().references(() => users.id),
  action: text("action", { enum: ["APPROVED", "REJECTED"] }).notNull(),
  cartHash: text("cart_hash").notNull(),
  acknowledgedReviewCodes: jsonb("acknowledged_review_codes").$type<string[]>().notNull().default([]),
  note: text("note"),
  ip: text("ip"),
  userAgent: text("user_agent"),
  createdAt: createdAt(),
});

export const signingKeys = pgTable("signing_keys", {
  keyId: text("key_id").primaryKey(),
  algorithm: text("algorithm").notNull().default("Ed25519"),
  publicKeyPem: text("public_key_pem").notNull(),
  createdAt: createdAt(),
  retiredAt: ts("retired_at"),
});

export const intentCertificates = pgTable(
  "intent_certificates",
  {
    id: uuid("id").primaryKey(),
    organizationId: orgId(),
    purchaseOrderId: uuid("purchase_order_id").notNull().references(() => purchaseOrders.id, { onDelete: "cascade" }),
    buyerId: uuid("buyer_id").notNull().references(() => users.id),
    policyDecisionId: uuid("policy_decision_id").notNull().references(() => policyDecisions.id),
    approvalEventId: uuid("approval_event_id").notNull().references(() => approvalEvents.id),
    payload: jsonb("payload").$type<Record<string, unknown>>().notNull(),
    signature: text("signature").notNull(),
    keyId: text("key_id").notNull().references(() => signingKeys.keyId),
    status: text("status", { enum: ["ACTIVE", "CONSUMED", "REVOKED", "EXPIRED"] }).notNull().default("ACTIVE"),
    revokedReason: text("revoked_reason"),
    issuedAt: ts("issued_at").notNull(),
    expiresAt: ts("expires_at").notNull(),
    consumedAt: ts("consumed_at"),
  },
  (t) => [
    uniqueIndex("certificates_po_active_uq").on(t.purchaseOrderId).where(sql`${t.status} in ('ACTIVE','CONSUMED')`),
    index("certificates_org_status_idx").on(t.organizationId, t.status, t.expiresAt),
    // The sweeper expires certificates across organisations.
    index("certificates_status_expiry_idx").on(t.status, t.expiresAt),
  ],
);

/* ================================================================= Budgets */

export const budgetAccounts = pgTable(
  "budget_accounts",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    organizationId: orgId(),
    periodStart: date("period_start", { mode: "string" }).notNull(),
    periodEnd: date("period_end", { mode: "string" }).notNull(),
    currency: text("currency").notNull(),
    limitMinor: money("limit_minor").notNull(),
    reservedMinor: money("reserved_minor").notNull().default(0),
    spentMinor: money("spent_minor").notNull().default(0),
    updatedAt: updatedAt(),
  },
  (t) => [
    uniqueIndex("budget_accounts_org_period_uq").on(t.organizationId, t.periodStart),
    check("budget_accounts_amounts_ck", sql`${t.limitMinor} >= 0 and ${t.reservedMinor} >= 0 and ${t.spentMinor} >= 0`),
  ],
);

export const budgetReservations = pgTable(
  "budget_reservations",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    organizationId: orgId(),
    budgetAccountId: uuid("budget_account_id").notNull().references(() => budgetAccounts.id),
    intentId: uuid("intent_id").notNull(),
    purchaseOrderId: uuid("purchase_order_id").notNull(),
    amountMinor: money("amount_minor").notNull(),
    status: text("status", { enum: ["ACTIVE", "CONSUMED", "RELEASED"] }).notNull().default("ACTIVE"),
    releaseReason: text("release_reason"),
    createdAt: createdAt(),
    releasedAt: ts("released_at"),
    consumedAt: ts("consumed_at"),
  },
  (t) => [uniqueIndex("reservations_intent_uq").on(t.intentId), index("reservations_status_idx").on(t.organizationId, t.status)],
);

/* ================================================================ Payments */

export const paymentAttempts = pgTable(
  "payment_attempts",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    organizationId: orgId(),
    intentId: uuid("intent_id").notNull().references(() => intentCertificates.id),
    purchaseOrderId: uuid("purchase_order_id").notNull().references(() => purchaseOrders.id),
    status: text("status", { enum: PAYMENT_STATUSES }).notNull().default("CREATED"),
    amountMinor: money("amount_minor").notNull(),
    currency: text("currency").notNull(),
    paypalOrderId: text("paypal_order_id"),
    paypalCaptureId: text("paypal_capture_id"),
    capturedAmountMinor: money("captured_amount_minor"),
    refundedAmountMinor: money("refunded_amount_minor").notNull().default(0),
    payerId: text("payer_id"),
    failureCode: text("failure_code"),
    failureMessage: text("failure_message"),
    createdBy: uuid("created_by").notNull(),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
    completedAt: ts("completed_at"),
    lastReconciledAt: ts("last_reconciled_at"),
  },
  (t) => [
    // A certificate can produce at most one logical payment attempt.
    uniqueIndex("payments_intent_uq").on(t.intentId),
    uniqueIndex("payments_paypal_order_uq").on(t.paypalOrderId),
    uniqueIndex("payments_paypal_capture_uq").on(t.paypalCaptureId),
    index("payments_org_status_idx").on(t.organizationId, t.status),
    index("payments_po_idx").on(t.purchaseOrderId),
    // The sweeper scans by status and age across organisations.
    index("payments_status_updated_idx").on(t.status, t.updatedAt),
    check("payments_status_ck", oneOf(t.status, PAYMENT_STATUSES)),
    check(
      "payments_amounts_ck",
      sql`${t.amountMinor} > 0 and ${t.refundedAmountMinor} >= 0 and (${t.capturedAmountMinor} is null or (${t.capturedAmountMinor} >= 0 and ${t.refundedAmountMinor} <= ${t.capturedAmountMinor}))`,
    ),
  ],
);

export const paypalWebhookEvents = pgTable(
  "paypal_webhook_events",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    eventId: text("event_id").notNull(),
    eventType: text("event_type").notNull(),
    resourceId: text("resource_id"),
    organizationId: uuid("organization_id"),
    verified: boolean("verified").notNull(),
    processed: boolean("processed").notNull().default(false),
    result: text("result"),
    payload: jsonb("payload").$type<Record<string, unknown>>().notNull(),
    receivedAt: ts("received_at").notNull().defaultNow(),
    processedAt: ts("processed_at"),
  },
  (t) => [uniqueIndex("webhook_event_id_uq").on(t.eventId)],
);

export const refunds = pgTable(
  "refunds",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    organizationId: orgId(),
    paymentAttemptId: uuid("payment_attempt_id").notNull().references(() => paymentAttempts.id),
    paypalRefundId: text("paypal_refund_id"),
    /** Stable per logical refund (derived from the client's Idempotency-Key); reused on retry. */
    requestKey: text("request_key"),
    amountMinor: money("amount_minor").notNull(),
    status: text("status", { enum: REFUND_STATUSES }).notNull(),
    reason: text("reason").notNull(),
    createdBy: uuid("created_by"),
    createdAt: createdAt(),
  },
  (t) => [
    uniqueIndex("refunds_paypal_id_uq").on(t.paypalRefundId),
    uniqueIndex("refunds_request_key_uq").on(t.requestKey),
    index("refunds_payment_idx").on(t.paymentAttemptId),
    check("refunds_status_ck", oneOf(t.status, REFUND_STATUSES)),
    check("refunds_amount_ck", sql`${t.amountMinor} > 0`),
  ],
);

/* ============================================================= Fulfillment */

export const deliveries = pgTable(
  "deliveries",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    organizationId: orgId(),
    purchaseOrderId: uuid("purchase_order_id").notNull().references(() => purchaseOrders.id),
    supplierId: uuid("supplier_id").notNull().references(() => suppliers.id),
    status: text("status", { enum: DELIVERY_STATUSES }).notNull().default("SCHEDULED"),
    expectedDate: date("expected_date", { mode: "string" }).notNull(),
    originalExpectedDate: date("original_expected_date", { mode: "string" }).notNull(),
    deliveredAt: ts("delivered_at"),
    delayReason: text("delay_reason"),
    dataSource: text("data_source").notNull().default("SYNTHETIC"),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [
    uniqueIndex("deliveries_po_uq").on(t.purchaseOrderId),
    index("deliveries_org_created_idx").on(t.organizationId, t.createdAt),
    check("deliveries_status_ck", oneOf(t.status, DELIVERY_STATUSES)),
  ],
);

export const goodsReceipts = pgTable(
  "goods_receipts",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    organizationId: orgId(),
    deliveryId: uuid("delivery_id").notNull().references(() => deliveries.id),
    purchaseOrderItemId: uuid("purchase_order_item_id").notNull().references(() => purchaseOrderItems.id),
    unitsReceived: integer("units_received").notNull(),
    receivedBy: uuid("received_by").notNull(),
    note: text("note"),
    createdAt: createdAt(),
  },
  (t) => [
    index("goods_receipts_delivery_idx").on(t.deliveryId),
    index("goods_receipts_item_idx").on(t.purchaseOrderItemId),
    check("goods_receipts_units_ck", sql`${t.unitsReceived} >= 0`),
  ],
);

export const invoices = pgTable(
  "invoices",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    organizationId: orgId(),
    supplierId: uuid("supplier_id").notNull().references(() => suppliers.id),
    purchaseOrderId: uuid("purchase_order_id").references(() => purchaseOrders.id),
    invoiceNumber: text("invoice_number").notNull(),
    invoiceNumberNormalized: text("invoice_number_normalized").notNull(),
    invoiceDate: date("invoice_date", { mode: "string" }).notNull(),
    currency: text("currency").notNull(),
    lines: jsonb("lines").$type<unknown[]>().notNull(),
    totalMinor: money("total_minor").notNull(),
    notes: text("notes"),
    contentHash: text("content_hash").notNull(),
    status: text("status", { enum: INVOICE_STATUSES }).notNull(),
    settlementAllowed: boolean("settlement_allowed").notNull(),
    createdBy: uuid("created_by").notNull(),
    createdAt: createdAt(),
  },
  (t) => [
    index("invoices_supplier_number_idx").on(t.organizationId, t.supplierId, t.invoiceNumberNormalized),
    index("invoices_content_idx").on(t.organizationId, t.contentHash),
    // At most one settled invoice per purchase order.
    uniqueIndex("invoices_po_settled_uq").on(t.purchaseOrderId).where(sql`${t.settlementAllowed} = true`),
    check("invoices_status_ck", oneOf(t.status, INVOICE_STATUSES)),
  ],
);

export const invoiceMatches = pgTable(
  "invoice_matches",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    invoiceId: uuid("invoice_id").notNull().references(() => invoices.id, { onDelete: "cascade" }),
    check: text("check").notNull(),
    passed: boolean("passed").notNull(),
    severity: text("severity"),
    detail: text("detail").notNull(),
  },
  (t) => [index("invoice_matches_invoice_idx").on(t.invoiceId)],
);

/* ======================================================== AI and auditing */

export const agentRuns = pgTable(
  "agent_runs",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    organizationId: orgId(),
    requestId: uuid("request_id").notNull().references(() => purchaseRequests.id, { onDelete: "cascade" }),
    kind: text("kind").notNull(),
    status: text("status").notNull(),
    aiMode: text("ai_mode").notNull(),
    model: text("model"),
    tokensUsed: integer("tokens_used").notNull().default(0),
    toolCalls: integer("tool_calls").notNull().default(0),
    error: text("error"),
    startedAt: ts("started_at").notNull().defaultNow(),
    completedAt: ts("completed_at"),
  },
  (t) => [index("agent_runs_request_idx").on(t.requestId)],
);

export const toolExecutions = pgTable(
  "tool_executions",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    organizationId: orgId(),
    agentRunId: uuid("agent_run_id").notNull().references(() => agentRuns.id, { onDelete: "cascade" }),
    tool: text("tool").notNull(),
    status: text("status", { enum: ["SUCCEEDED", "FAILED", "SKIPPED"] }).notNull(),
    input: jsonb("input").$type<Record<string, unknown>>().notNull().default({}),
    summary: text("summary").notNull(),
    error: text("error"),
    durationMs: integer("duration_ms").notNull(),
    startedAt: ts("started_at").notNull(),
  },
  (t) => [index("tool_executions_run_idx").on(t.agentRunId, t.startedAt)],
);

export const securityFindings = pgTable(
  "security_findings",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    organizationId: orgId(),
    type: text("type").notNull(),
    severity: text("severity", { enum: ["LOW", "MEDIUM", "HIGH", "CRITICAL"] }).notNull(),
    title: text("title").notNull(),
    description: text("description").notNull(),
    sourceKind: text("source_kind").notNull(),
    sourceId: text("source_id"),
    evidence: jsonb("evidence").$type<Record<string, unknown>>().notNull().default({}),
    relatedPurchaseOrderId: uuid("related_purchase_order_id"),
    relatedRequestId: uuid("related_request_id"),
    createdAt: createdAt(),
  },
  (t) => [index("security_findings_org_idx").on(t.organizationId, t.createdAt), index("security_findings_request_idx").on(t.relatedRequestId)],
);

export const auditEvents = pgTable(
  "audit_events",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    organizationId: orgId(),
    sequence: bigint("sequence", { mode: "number" }).notNull(),
    action: text("action").notNull(),
    actorType: text("actor_type", { enum: ["USER", "SYSTEM", "AGENT", "PAYPAL"] }).notNull(),
    actorId: text("actor_id"),
    entityType: text("entity_type").notNull(),
    entityId: text("entity_id"),
    data: jsonb("data").$type<Record<string, unknown>>().notNull().default({}),
    prevHash: text("prev_hash"),
    hash: text("hash").notNull(),
    correlationId: text("correlation_id"),
    createdAt: createdAt(),
  },
  (t) => [uniqueIndex("audit_org_sequence_uq").on(t.organizationId, t.sequence), index("audit_entity_idx").on(t.entityType, t.entityId)],
);

export const idempotencyKeys = pgTable(
  "idempotency_keys",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    organizationId: orgId(),
    userId: uuid("user_id").notNull(),
    key: text("key").notNull(),
    route: text("route").notNull(),
    requestHash: text("request_hash").notNull(),
    status: text("status", { enum: ["IN_PROGRESS", "COMPLETED"] }).notNull(),
    responseStatus: integer("response_status"),
    responseBody: jsonb("response_body"),
    createdAt: createdAt(),
  },
  (t) => [uniqueIndex("idempotency_scope_uq").on(t.organizationId, t.userId, t.key)],
);

/** Time-bound leases electing a single runner for background jobs across instances. */
export const jobLeases = pgTable("job_leases", {
  name: text("name").primaryKey(),
  holder: text("holder").notNull(),
  leaseUntil: ts("lease_until").notNull(),
});
