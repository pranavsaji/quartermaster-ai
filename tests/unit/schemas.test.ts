import { describe, expect, it } from "vitest";
import {
  AnalyzeInvoiceRequest,
  ApproveRequest,
  CapturePaymentRequest,
  CreateProcurementRequest,
  DelayDeliveryRequest,
  ForecastRequest,
  InventoryAdjustmentRequest,
  LoginRequest,
  PaginationQuery,
  PurchaseOrdersQuery,
  ReceiveDeliveryRequest,
  RefundRequest,
  RejectRequest,
  SecurityEventsQuery,
  SpendMandateInput,
  isCalendarDate,
} from "@qm/contracts";

/**
 * Real parse tests for every request schema: a valid body, the boundaries, and the rejections.
 * Zod definitions execute on import, so line coverage of schemas.ts says nothing on its own.
 */
const UUID = "11111111-1111-4111-8111-111111111111";
const UUID2 = "22222222-2222-4222-8222-222222222222";
const ok = (schema: { safeParse: (v: unknown) => { success: boolean } }, v: unknown) => expect(schema.safeParse(v).success).toBe(true);
const bad = (schema: { safeParse: (v: unknown) => { success: boolean } }, v: unknown) => expect(schema.safeParse(v).success).toBe(false);

describe("isCalendarDate", () => {
  it.each([
    ["2026-02-28", true],
    ["2028-02-29", true], // leap year
    ["2000-02-29", true], // divisible by 400
    ["1900-02-29", false], // divisible by 100, not 400
    ["2026-02-29", false],
    ["2026-02-30", false],
    ["2026-04-31", false],
    ["2026-12-31", true],
    ["2026-13-45", false],
    ["2026-00-10", false],
    ["2026-01-00", false],
    ["0001-01-01", true],
    ["0050-06-15", true], // Date.UTC would map year 50 to 1950
    ["0000-01-01", false], // no year zero
    ["9999-12-31", true],
    ["2026-1-01", false],
    ["2026-01-01T00:00:00Z", false],
    [" 2026-01-01", false],
    ["", false],
  ])("%s → %s", (value, expected) => {
    expect(isCalendarDate(value)).toBe(expected);
  });

  it("is false for non-strings instead of throwing", () => {
    expect(isCalendarDate(20260101 as never)).toBe(false);
    expect(isCalendarDate(null as never)).toBe(false);
  });
});

describe("date fields reject impossible calendar dates", () => {
  const procurement = (required_by: string) => ({ instruction: "restock gloves", required_by });
  const invoice = (invoice_date: string) => ({
    supplier_id: UUID,
    invoice_number: "INV-1",
    invoice_date,
    currency: "USD",
    lines: [{ description: "Gloves", quantity: 1, unit_price_minor: 100, line_total_minor: 100 }],
    total_minor: 100,
  });
  const delay = (new_expected_date: string) => ({ new_expected_date, reason: "Carrier delay" });

  it.each([
    ["CreateProcurementRequest.required_by", CreateProcurementRequest, procurement],
    ["AnalyzeInvoiceRequest.invoice_date", AnalyzeInvoiceRequest, invoice],
    ["DelayDeliveryRequest.new_expected_date", DelayDeliveryRequest, delay],
  ] as const)("%s", (_name, schema, build) => {
    ok(schema, build("2026-11-30"));
    ok(schema, build("2028-02-29"));
    for (const d of ["2026-02-30", "2026-13-45", "2026-02-29", "2026-04-31", "0000-01-01", "2026-11-3", "30/11/2026"]) {
      const r = schema.safeParse(build(d));
      expect(r.success, d).toBe(false);
    }
  });

  it("reports a readable message for an impossible date", () => {
    const r = DelayDeliveryRequest.safeParse(delay("2026-02-30"));
    expect(r.success).toBe(false);
    expect(r.error?.issues.map((i) => i.message)).toEqual(["Not a real calendar date"]);
  });
});

describe("LoginRequest", () => {
  it("trims and lower-cases the email", () => {
    expect(LoginRequest.parse({ email: "  Owner@Example.COM ", password: "12345678" }).email).toBe("owner@example.com");
  });
  it("enforces password length bounds", () => {
    ok(LoginRequest, { email: "a@b.co", password: "x".repeat(8) });
    ok(LoginRequest, { email: "a@b.co", password: "x".repeat(200) });
    bad(LoginRequest, { email: "a@b.co", password: "x".repeat(7) });
    bad(LoginRequest, { email: "a@b.co", password: "x".repeat(201) });
    bad(LoginRequest, { email: "not-an-email", password: "12345678" });
  });
});

describe("InventoryAdjustmentRequest", () => {
  const body = (quantity_delta: number) => ({ quantity_delta, reason: "WASTE" });
  it("accepts non-zero integer deltas within ±1,000,000", () => {
    ok(InventoryAdjustmentRequest, body(-1_000_000));
    ok(InventoryAdjustmentRequest, body(1_000_000));
    ok(InventoryAdjustmentRequest, body(-1));
  });
  it("rejects zero, fractional, out-of-range deltas and unknown reasons", () => {
    const r = InventoryAdjustmentRequest.safeParse(body(0));
    expect(r.error?.issues[0]?.message).toBe("Delta must be non-zero");
    bad(InventoryAdjustmentRequest, body(1.5));
    bad(InventoryAdjustmentRequest, body(1_000_001));
    bad(InventoryAdjustmentRequest, { quantity_delta: 1, reason: "THEFT" });
    bad(InventoryAdjustmentRequest, { ...body(1), note: "x".repeat(501) });
  });
});

describe("ForecastRequest", () => {
  it("defaults the multiplier and bounds it", () => {
    expect(ForecastRequest.parse({}).demand_multiplier).toBe(1);
    ok(ForecastRequest, { demand_multiplier: 0.25, horizon_days: 1 });
    ok(ForecastRequest, { demand_multiplier: 4, horizon_days: 30 });
    bad(ForecastRequest, { demand_multiplier: 0.24 });
    bad(ForecastRequest, { demand_multiplier: 4.01 });
    bad(ForecastRequest, { horizon_days: 31 });
    bad(ForecastRequest, { inventory_item_ids: ["not-a-uuid"] });
    bad(ForecastRequest, { inventory_item_ids: Array.from({ length: 101 }, () => UUID) });
  });
});

describe("CreateProcurementRequest", () => {
  it("applies defaults", () => {
    expect(CreateProcurementRequest.parse({ instruction: "  restock  " })).toEqual({
      instruction: "restock",
      currency: "USD",
      allow_alternatives: true,
    });
  });
  it("bounds the instruction, budget and multiplier", () => {
    ok(CreateProcurementRequest, { instruction: "abc", budget_limit_minor: 0, demand_multiplier: 0.25 });
    ok(CreateProcurementRequest, { instruction: "x".repeat(2000), budget_limit_minor: Number.MAX_SAFE_INTEGER, demand_multiplier: 4 });
    bad(CreateProcurementRequest, { instruction: "  ab  " });
    bad(CreateProcurementRequest, { instruction: "x".repeat(2001) });
    bad(CreateProcurementRequest, { instruction: "abc", budget_limit_minor: -1 });
    bad(CreateProcurementRequest, { instruction: "abc", budget_limit_minor: 10.5 });
    bad(CreateProcurementRequest, { instruction: "abc", budget_limit_minor: Number.MAX_SAFE_INTEGER + 1 });
    bad(CreateProcurementRequest, { instruction: "abc", currency: "EUR" });
    bad(CreateProcurementRequest, { instruction: "abc", demand_multiplier: 5 });
  });
});

describe("ApproveRequest and RejectRequest", () => {
  const hash = `sha256:${"a".repeat(64)}`;
  it("requires a well-formed cart hash", () => {
    expect(ApproveRequest.parse({ purchase_order_id: UUID, cart_hash: hash }).acknowledged_review_codes).toEqual([]);
    bad(ApproveRequest, { purchase_order_id: UUID, cart_hash: `sha256:${"A".repeat(64)}` });
    bad(ApproveRequest, { purchase_order_id: UUID, cart_hash: `sha256:${"a".repeat(63)}` });
    bad(ApproveRequest, { purchase_order_id: "po_1", cart_hash: hash });
    bad(ApproveRequest, { purchase_order_id: UUID, cart_hash: hash, acknowledged_review_codes: Array.from({ length: 33 }, () => "X") });
  });
  it("requires a non-blank rejection reason", () => {
    ok(RejectRequest, { reason: "Too expensive" });
    ok(RejectRequest, { reason: "x", purchase_order_id: UUID });
    bad(RejectRequest, { reason: "   " });
    bad(RejectRequest, { reason: "x".repeat(501) });
  });
});

describe("SpendMandateInput", () => {
  const mandate = (o: Record<string, unknown> = {}) => ({
    currency: "USD",
    weekly_budget_minor: 50_000,
    per_order_limit_minor: 25_000,
    auto_approval_limit_minor: 10_000,
    human_approval_required: true,
    approved_supplier_ids: [UUID],
    allowed_categories: ["food_packaging"],
    max_market_price_premium_pct: 10,
    market_price_action: "REVIEW",
    duplicate_window_hours: 24,
    duplicate_action: "BLOCK",
    subscriptions_allowed: false,
    certificate_ttl_minutes: 30,
    max_quantity_multiple_of_need: 2,
    expected_version: 1,
    ...o,
  });
  it("accepts a consistent mandate and the equal-limit boundary", () => {
    ok(SpendMandateInput, mandate());
    ok(SpendMandateInput, mandate({ per_order_limit_minor: 50_000, auto_approval_limit_minor: 50_000 }));
    ok(SpendMandateInput, mandate({ duplicate_window_hours: 0, certificate_ttl_minutes: 5, max_quantity_multiple_of_need: 1 }));
    ok(SpendMandateInput, mandate({ duplicate_window_hours: 720, certificate_ttl_minutes: 60, max_quantity_multiple_of_need: 10 }));
  });
  it("rejects limits that are inconsistent with each other", () => {
    const perOrder = SpendMandateInput.safeParse(mandate({ per_order_limit_minor: 50_001 }));
    expect(perOrder.error?.issues.map((i) => i.path.join("."))).toContain("per_order_limit_minor");
    const auto = SpendMandateInput.safeParse(mandate({ auto_approval_limit_minor: 25_001 }));
    expect(auto.error?.issues.map((i) => i.path.join("."))).toContain("auto_approval_limit_minor");
  });
  it("rejects out-of-range and malformed fields", () => {
    bad(SpendMandateInput, mandate({ human_approval_required: false }));
    bad(SpendMandateInput, mandate({ weekly_budget_minor: 100_000_001 }));
    bad(SpendMandateInput, mandate({ allowed_categories: [] }));
    bad(SpendMandateInput, mandate({ allowed_categories: ["weapons"] }));
    bad(SpendMandateInput, mandate({ approved_supplier_ids: ["x"] }));
    bad(SpendMandateInput, mandate({ max_market_price_premium_pct: 501 }));
    bad(SpendMandateInput, mandate({ market_price_action: "ALLOW" }));
    bad(SpendMandateInput, mandate({ duplicate_window_hours: 721 }));
    bad(SpendMandateInput, mandate({ certificate_ttl_minutes: 4 }));
    bad(SpendMandateInput, mandate({ certificate_ttl_minutes: 61 }));
    bad(SpendMandateInput, mandate({ max_quantity_multiple_of_need: 0.5 }));
    bad(SpendMandateInput, mandate({ expected_version: 0 }));
  });
});

describe("payments", () => {
  it("CapturePaymentRequest accepts PayPal-style ids only", () => {
    ok(CapturePaymentRequest, { paypal_order_id: "5O190127TN364715T" });
    ok(CapturePaymentRequest, { paypal_order_id: "ab-12" });
    bad(CapturePaymentRequest, { paypal_order_id: "abcd" });
    bad(CapturePaymentRequest, { paypal_order_id: "x".repeat(65) });
    bad(CapturePaymentRequest, { paypal_order_id: "abc_123" });
    bad(CapturePaymentRequest, { paypal_order_id: "abc 123" });
  });
  it("RefundRequest requires a positive integer amount when one is given", () => {
    ok(RefundRequest, { reason: "Damaged" });
    ok(RefundRequest, { reason: "Damaged", amount_minor: 1 });
    bad(RefundRequest, { reason: "Damaged", amount_minor: 0 });
    bad(RefundRequest, { reason: "Damaged", amount_minor: 1.5 });
    bad(RefundRequest, { reason: " " });
  });
});

describe("AnalyzeInvoiceRequest", () => {
  const line = { description: "Gloves", quantity: 1, unit_price_minor: 100, line_total_minor: 100 };
  const body = (o: Record<string, unknown> = {}) => ({
    supplier_id: UUID,
    purchase_order_id: UUID2,
    invoice_number: "INV-1",
    invoice_date: "2026-11-11",
    currency: "USD",
    lines: [line],
    total_minor: 100,
    ...o,
  });
  it("accepts a valid invoice, a null order and the line-count bounds", () => {
    ok(AnalyzeInvoiceRequest, body());
    ok(AnalyzeInvoiceRequest, body({ purchase_order_id: null }));
    ok(AnalyzeInvoiceRequest, body({ lines: Array.from({ length: 200 }, () => line) }));
    ok(AnalyzeInvoiceRequest, body({ lines: [{ ...line, sku: null }] }));
  });
  it("rejects malformed invoices", () => {
    bad(AnalyzeInvoiceRequest, body({ lines: [] }));
    bad(AnalyzeInvoiceRequest, body({ lines: Array.from({ length: 201 }, () => line) }));
    bad(AnalyzeInvoiceRequest, body({ lines: [{ ...line, quantity: 0 }] }));
    bad(AnalyzeInvoiceRequest, body({ lines: [{ ...line, description: "  " }] }));
    bad(AnalyzeInvoiceRequest, body({ lines: [{ ...line, unit_price_minor: -1 }] }));
    bad(AnalyzeInvoiceRequest, body({ invoice_number: " " }));
    bad(AnalyzeInvoiceRequest, body({ total_minor: 1.5 }));
    bad(AnalyzeInvoiceRequest, body({ notes: "x".repeat(5001) }));
  });
});

describe("deliveries", () => {
  it("ReceiveDeliveryRequest bounds quantities and lines", () => {
    const l = (q: number) => ({ purchase_order_item_id: UUID, quantity_received: q });
    ok(ReceiveDeliveryRequest, { lines: [l(0)] });
    ok(ReceiveDeliveryRequest, { lines: [l(1_000_000)] });
    bad(ReceiveDeliveryRequest, { lines: [] });
    bad(ReceiveDeliveryRequest, { lines: [l(-1)] });
    bad(ReceiveDeliveryRequest, { lines: [l(1_000_001)] });
    bad(ReceiveDeliveryRequest, { lines: [l(1.5)] });
  });
  it("DelayDeliveryRequest requires a reason", () => {
    bad(DelayDeliveryRequest, { new_expected_date: "2026-12-01", reason: "" });
  });
});

describe("query schemas", () => {
  it("PaginationQuery coerces the limit and applies the default", () => {
    expect(PaginationQuery.parse({})).toEqual({ limit: 50 });
    expect(PaginationQuery.parse({ limit: "200" }).limit).toBe(200);
    bad(PaginationQuery, { limit: "0" });
    bad(PaginationQuery, { limit: "201" });
    bad(PaginationQuery, { limit: "abc" });
  });

  it("PurchaseOrdersQuery parses a de-duplicated status list", () => {
    expect(PurchaseOrdersQuery.parse({ status: " PROPOSED, APPROVED,PROPOSED,," }).status).toEqual(["PROPOSED", "APPROVED"]);
    expect(PurchaseOrdersQuery.parse({ status: "" }).status).toBeUndefined();
    expect(PurchaseOrdersQuery.parse({}).status).toBeUndefined();
    const r = PurchaseOrdersQuery.safeParse({ status: "PROPOSED,SHIPPED" });
    expect(r.error?.issues[0]?.message).toBe("Unknown purchase order status: SHIPPED");
    bad(PurchaseOrdersQuery, { status: "x".repeat(201) });
  });

  it("SecurityEventsQuery accepts known severities only", () => {
    ok(SecurityEventsQuery, { severity: "CRITICAL", type: "PROMPT_INJECTION" });
    bad(SecurityEventsQuery, { severity: "URGENT" });
  });
});
