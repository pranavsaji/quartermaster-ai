import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { and, eq } from "drizzle-orm";
import { invoices } from "@qm/database";
import type { InvoiceDto, PurchaseOrderDto } from "@qm/contracts";
import { createHarness, type Client, type Harness } from "../helpers/harness";
import { paidOrder, relaxMandate } from "../helpers/flows";

/**
 * Partial invoices end to end: a short invoice is a DISCREPANCY (settlement withheld, because at
 * most one invoice per order can be settled), and the follow-up for the remainder is never a
 * DUPLICATE. Invoice numbers carry a per-run suffix so the file can share a database.
 */
let h: Harness;
let owner: Client;
let po: PurchaseOrderDto;
const run = Math.random().toString(36).slice(2, 8).toUpperCase();

beforeAll(async () => {
  h = await createHarness();
  owner = await h.agent("owner");
  await relaxMandate(owner);
  po = (await paidOrder(h, owner, "CLN-TOWELS")).po;
});
afterAll(async () => {
  await h.close();
});

const analyze = async (body: unknown) => {
  const res = await owner.post("/invoices/analyze", body);
  expect(res.status).toBe(200);
  return res.body as InvoiceDto;
};
const failed = (inv: InvoiceDto) => inv.matches.filter((m) => !m.passed).map((m) => m.check);

function productInvoice(number: string, quantityFor: (ordered: number) => number) {
  const lines = po.items
    .filter((i) => i.kind === "PRODUCT")
    .map((i) => ({
      sku: i.sku,
      description: i.description,
      quantity: quantityFor(i.quantity),
      unit_price_minor: i.unit_price_minor,
      line_total_minor: quantityFor(i.quantity) * i.unit_price_minor,
    }));
  return {
    supplier_id: po.supplier_id,
    purchase_order_id: po.id,
    invoice_number: `${number}-${run}`,
    invoice_date: "2026-11-11",
    currency: po.currency,
    lines,
    total_minor: lines.reduce((a, l) => a + l.line_total_minor, 0),
  };
}

describe("partial invoices", () => {
  it("withholds settlement from a short invoice and never calls the follow-up a duplicate", async () => {
    const product = po.items.find((i) => i.kind === "PRODUCT")!;
    // The seeded towel order is 2 packs, so the two halves are identical invoices.
    expect(product.quantity).toBe(2);

    const first = await analyze(productInvoice("PART-1", (q) => q - 1));
    expect(first.status).toBe("DISCREPANCY");
    expect(first.settlement_allowed).toBe(false);
    expect(failed(first)).toEqual(["ORDER_FULLY_INVOICED"]);
    expect(first.matches.find((m) => m.check === "ORDER_FULLY_INVOICED")?.detail).toMatch(/^Partial invoice/);

    // The follow-up bills the remainder. When it repeats the first invoice's content (1 + 1 of 2)
    // it may be a split delivery or a resubmission: a discrepancy to verify, never a duplicate.
    const remainder = 1;
    const second = await analyze(productInvoice("PART-2", () => remainder));
    expect(second.status).toBe("DISCREPANCY");
    expect(second.settlement_allowed).toBe(false);
    expect(failed(second)).not.toContain("PO_ALREADY_INVOICED");
    expect(failed(second)).not.toContain("ORDER_FULLY_INVOICED");
    expect(second.matches.find((m) => m.check === "DUPLICATE_CONTENT")).toMatchObject({ passed: false, severity: "MEDIUM" });

    // A third copy would bill beyond the order: that one is a duplicate.
    const third = await analyze(productInvoice("PART-3", () => remainder));
    expect(third.status).toBe("DUPLICATE");

    const settled = await h.ctx.db
      .select()
      .from(invoices)
      .where(and(eq(invoices.purchaseOrderId, po.id), eq(invoices.settlementAllowed, true)));
    expect(settled).toEqual([]);
  });
});
