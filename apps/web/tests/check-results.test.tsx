import type { IntentCertificateDto, InvoiceDto } from "@qm/contracts";
import { fireEvent, render, screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { InvoiceResult } from "@/components/orders/InvoiceResult";
import { CertificatePanel } from "@/components/trustrail/CertificatePanel";
import { jsonResponse, mockFetch } from "./helpers";

const certificate: IntentCertificateDto = {
  id: "intent-1",
  status: "ACTIVE",
  key_id: "key-1",
  signature: "sig-abcdefghijklmnopqrstuvwxyz",
  algorithm: "Ed25519",
  issued_at: "2026-11-09T10:00:00.000Z",
  expires_at: "2099-01-01T00:00:00.000Z",
  payload: {
    certificate_version: 1,
    intent_id: "intent-1",
    organization_id: "org-1",
    buyer_id: "u-1",
    purchase_order_id: "po-1",
    supplier_id: "sup-1",
    cart_hash: "sha256:cart-1",
    mandate_id: "m-1",
    mandate_version: 3,
    policy_decision_id: "dec-1",
    currency: "USD",
    approved_amount_minor: 10000,
    approved_at: "2026-11-09T10:00:00.000Z",
    expires_at: "2099-01-01T00:00:00.000Z",
    nonce: "n-1",
    key_id: "key-1",
  } as IntentCertificateDto["payload"],
};

describe("pass/fail results are not conveyed by icons alone", () => {
  it("labels each certificate verification check for screen readers", async () => {
    mockFetch({
      "GET /api/v1/intents/intent-1/verify": [
        jsonResponse({
          intent_id: "intent-1",
          status: "CART_MODIFIED",
          valid: false,
          checks: [
            { code: "SIGNATURE_VALID", passed: true, detail: "Ed25519 signature verifies." },
            { code: "CART_HASH_MATCHES", passed: false, detail: "The cart changed after approval." },
          ],
          certificate,
          verified_at: "2026-11-09T10:05:00.000Z",
        }),
      ],
    });
    render(<CertificatePanel certificate={certificate} />);
    fireEvent.click(screen.getByRole("button", { name: "Verify" }));

    const items = within(await screen.findByRole("status", { name: "" })).getAllByRole("listitem");
    expect(items[0]).toHaveTextContent(/^Passed: Signature valid/);
    expect(items[1]).toHaveTextContent(/^Failed: Cart hash matches/);
  });

  it("labels each invoice match check for screen readers", () => {
    const invoice: InvoiceDto = {
      id: "inv-1",
      supplier_id: "sup-1",
      purchase_order_id: "po-1",
      invoice_number: "INV-1",
      invoice_date: "2026-11-09",
      currency: "USD",
      total_minor: 10000,
      status: "DISCREPANCY",
      settlement_allowed: false,
      matches: [
        { check: "PO_MATCH", passed: true, severity: null, detail: "Linked to PO-1001." },
        { check: "TOTAL_MATCH", passed: false, severity: "HIGH", detail: "Total is $5.00 above the PO." },
      ],
      created_at: "2026-11-09T10:00:00.000Z",
    };
    render(<InvoiceResult invoice={invoice} />);
    const items = screen.getAllByRole("listitem");
    expect(items[0]).toHaveTextContent(/^Passed: Po match/);
    expect(items[1]).toHaveTextContent(/^Failed: Total match/);
  });
});
