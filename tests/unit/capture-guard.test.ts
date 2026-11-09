import { describe, expect, it } from "vitest";
import { canTransition, guardCapture, type CaptureGuardInput } from "@qm/trustrail";
import { PAYMENT_STATUSES, type PaymentStatus } from "@qm/contracts";

function input(overrides: Partial<CaptureGuardInput> = {}): CaptureGuardInput {
  return {
    certificate: {
      certificate_version: 1,
      intent_id: "intent_1",
      organization_id: "org_1",
      buyer_id: "owner_1",
      purchase_order_id: "po_1",
      supplier_id: "sup_1",
      cart_hash: "sha256:x",
      mandate_id: "m_1",
      mandate_version: 1,
      policy_decision_id: "pd_1",
      currency: "USD",
      approved_amount_minor: 17_320,
      approved_at: "2026-11-10T18:00:00Z",
      expires_at: "2026-11-10T18:30:00Z",
      nonce: "n",
      key_id: "k",
    },
    verification: { status: "VALID", valid: true, checks: [] },
    authenticated_user_id: "owner_1",
    authenticated_org_id: "org_1",
    payment: { id: "pay_1", status: "ORDER_CREATED", paypal_order_id: "5O190127TN364715T", amount_minor: 17_320, currency: "USD" },
    requested_paypal_order_id: "5O190127TN364715T",
    provider_order: {
      id: "5O190127TN364715T",
      status: "APPROVED",
      currency: "USD",
      amount_minor: 17_320,
      reference_id: "po_1",
      custom_id: "intent_1",
      invoice_id: "PO-1",
      payee_merchant_id: "MERCHANT",
    },
    reservation: { status: "ACTIVE", amount_minor: 17_320 },
    expected_payee_merchant_id: "MERCHANT",
    policy_still_allows: true,
    ...overrides,
  };
}

const failCodes = (i: CaptureGuardInput) => guardCapture(i).failures.map((f) => f.code);

describe("capture guard", () => {
  it("allows a fully consistent capture", () => {
    expect(guardCapture(input())).toEqual({ allowed: true, failures: [] });
  });

  it("requires buyer approval at PayPal", () => {
    expect(failCodes(input({ provider_order: { ...input().provider_order, status: "CREATED" } }))).toContain("PROVIDER_STATUS");
  });

  it("refuses when the PayPal amount differs from the approval", () => {
    expect(failCodes(input({ provider_order: { ...input().provider_order, amount_minor: 17_321 } }))).toContain("AMOUNT_MISMATCH");
  });

  it("refuses when the currency differs", () => {
    expect(failCodes(input({ provider_order: { ...input().provider_order, currency: "EUR" } }))).toContain("CURRENCY_MISMATCH");
  });

  it("refuses an order bound to another intent or purchase order", () => {
    expect(failCodes(input({ provider_order: { ...input().provider_order, custom_id: "intent_2" } }))).toContain("INTENT_BINDING");
    expect(failCodes(input({ provider_order: { ...input().provider_order, reference_id: "po_2" } }))).toContain("PO_BINDING");
  });

  it("refuses a substituted PayPal order id", () => {
    expect(failCodes(input({ requested_paypal_order_id: "OTHERORDER123" }))).toContain("ORDER_ID_MISMATCH");
  });

  it("refuses when funds would go to an unexpected merchant", () => {
    expect(failCodes(input({ provider_order: { ...input().provider_order, payee_merchant_id: "ATTACKER" } }))).toContain("PAYEE_MISMATCH");
  });

  it("refuses when the provider order omits its payee but a merchant is expected", () => {
    const r = guardCapture(input({ provider_order: { ...input().provider_order, payee_merchant_id: null } }));
    expect(r.allowed).toBe(false);
    expect(r.failures).toEqual([{ code: "PAYEE_MISMATCH", detail: expect.stringMatching(/does not identify its payee/) }]);
  });

  it("does not require a payee when none is configured", () => {
    expect(
      guardCapture(input({ expected_payee_merchant_id: null, provider_order: { ...input().provider_order, payee_merchant_id: null } }))
        .allowed,
    ).toBe(true);
    expect(
      guardCapture(input({ expected_payee_merchant_id: null, provider_order: { ...input().provider_order, payee_merchant_id: "ANY" } }))
        .allowed,
    ).toBe(true);
  });

  it("refuses anyone other than the approving buyer", () => {
    expect(failCodes(input({ authenticated_user_id: "manager_1" }))).toContain("BUYER_MISMATCH");
    expect(failCodes(input({ authenticated_org_id: "org_2" }))).toContain("ORG_MISMATCH");
  });

  it("refuses an invalid certificate", () => {
    expect(failCodes(input({ verification: { status: "EXPIRED", valid: false, checks: [] } }))).toContain("CERTIFICATE_INVALID");
  });

  it("refuses without an active budget reservation of the same amount", () => {
    expect(failCodes(input({ reservation: null }))).toContain("NO_RESERVATION");
    expect(failCodes(input({ reservation: { status: "RELEASED", amount_minor: 17_320 } }))).toContain("NO_RESERVATION");
    expect(failCodes(input({ reservation: { status: "ACTIVE", amount_minor: 1 } }))).toContain("RESERVATION_AMOUNT");
  });

  it("refuses when the current mandate no longer permits the purchase", () => {
    expect(failCodes(input({ policy_still_allows: false }))).toContain("POLICY_CHANGED");
  });

  it("refuses to capture a payment that is already completed", () => {
    expect(failCodes(input({ payment: { ...input().payment, status: "COMPLETED" } }))).toContain("PAYMENT_STATE");
  });
});

describe("payment state machine", () => {
  const cases: [PaymentStatus, PaymentStatus, boolean][] = [
    ["CREATED", "ORDER_CREATED", true],
    ["ORDER_CREATED", "PAYER_APPROVED", true],
    ["PAYER_APPROVED", "CAPTURE_PENDING", true],
    ["CAPTURE_PENDING", "COMPLETED", true],
    ["COMPLETED", "CAPTURE_PENDING", false],
    ["COMPLETED", "PAYER_APPROVED", false],
    ["COMPLETED", "FAILED", false],
    ["COMPLETED", "REFUNDED", true],
    ["COMPLETED", "PARTIALLY_REFUNDED", true],
    ["PARTIALLY_REFUNDED", "REFUNDED", true],
    ["REFUNDED", "COMPLETED", false],
    ["FAILED", "COMPLETED", true],
    ["FAILED", "ORDER_CREATED", false],
    ["CAPTURE_PENDING", "PAYER_APPROVED", false],
    ["COMPLETED", "COMPLETED", false],
    ["CAPTURE_PENDING", "REFUNDED", false],
    ["ORDER_CREATED", "PARTIALLY_REFUNDED", false],
  ];
  it.each(cases)("%s → %s allowed: %s", (from, to, ok) => {
    expect(canTransition(from, to)).toBe(ok);
  });

  it("matches the full transition matrix over every payment status", () => {
    // Rows: from. Columns: to, in PAYMENT_STATUSES order. Written out explicitly so any change
    // to the state machine has to be made here deliberately.
    const order = [
      "CREATED",
      "ORDER_CREATED",
      "PAYER_APPROVED",
      "CAPTURE_PENDING",
      "COMPLETED",
      "FAILED",
      "VOIDED",
      "PARTIALLY_REFUNDED",
      "REFUNDED",
    ] as const;
    expect([...PAYMENT_STATUSES].sort()).toEqual([...order].sort());
    const matrix: Record<(typeof order)[number], string> = {
      //                   CRE ORD PAY CAP COM FAI VOI PAR REF
      CREATED: "0   1   1   1   1   1   1   0   0",
      ORDER_CREATED: "0   0   1   1   1   1   1   0   0",
      PAYER_APPROVED: "0   0   0   1   1   1   1   0   0",
      CAPTURE_PENDING: "0   0   0   0   1   1   1   0   0",
      COMPLETED: "0   0   0   0   0   0   0   1   1",
      FAILED: "0   0   0   0   1   0   0   0   0",
      VOIDED: "0   0   0   0   1   0   0   0   0",
      PARTIALLY_REFUNDED: "0   0   0   0   0   0   0   0   1",
      REFUNDED: "0   0   0   0   0   0   0   0   0",
    };
    for (const from of order) {
      const row = matrix[from].split(/\s+/).map((c) => c === "1");
      expect(row).toHaveLength(order.length);
      order.forEach((to, i) => {
        expect([from, to, canTransition(from, to)]).toEqual([from, to, row[i]]);
      });
    }
  });
});
