import type { InvoiceDto, SupplierDto } from "@qm/contracts";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { InvoiceForm, validateInvoiceForm, type InvoiceDraft } from "@/components/orders/InvoiceForm";
import { nextLineKey } from "@/components/orders/InvoiceLines";
import { jsonResponse, mockFetch, purchaseOrder } from "./helpers";

const SUPPLIER_ID = "5b0c3f4e-2a6d-4d8e-9b1a-3c2f1e0d9a87";
const PO_ID = "7f1e2d3c-4b5a-4968-8778-695a4b3c2d1e";

const suppliers: SupplierDto[] = [
  {
    id: SUPPLIER_ID,
    name: "Harbor Foodservice",
    approved: true,
    active: true,
    checkout_eligible: true,
    lead_time_days: 2,
    tax_rate_bps: 0,
    fee_terms: [],
    website: null,
    data_source: "SANDBOX_SUPPLIER",
  },
];

const po = purchaseOrder({ id: PO_ID, supplier_id: SUPPLIER_ID, status: "PAID" });

function draft(overrides: Partial<InvoiceDraft> = {}): InvoiceDraft {
  return {
    supplierId: SUPPLIER_ID,
    poId: "",
    number: "INV-1",
    invoiceDate: "2026-11-09",
    lines: [{ key: "a", sku: "", description: "Containers", quantity: "4", unitPrice: "25.00" }],
    totalOverride: "",
    notes: "",
    ...overrides,
  };
}

const line = (quantity: string, unitPrice = "25.00") => [{ key: "a", sku: "", description: "Containers", quantity, unitPrice }];

describe("validateInvoiceForm", () => {
  it("builds integer minor units from digits-only quantities and prices", () => {
    const result = validateInvoiceForm(draft(), "USD");
    expect(result.body).toMatchObject({
      lines: [{ quantity: 4, unit_price_minor: 2500, line_total_minor: 10000 }],
      total_minor: 10000,
    });
  });

  it("rejects quantities that Number() would have accepted", () => {
    for (const quantity of ["1e2", "0x10", " ", "2.5", "0", "-1"]) {
      const result = validateInvoiceForm(draft({ lines: line(quantity) }), "USD");
      expect(result.body, quantity).toBeNull();
      expect(result.errors?.lines.a?.quantity, quantity).toEqual(expect.any(String));
    }
  });

  it("attaches each problem to its own field", () => {
    const result = validateInvoiceForm(
      draft({
        supplierId: "",
        number: " ",
        lines: [{ key: "a", sku: "", description: "", quantity: "3", unitPrice: "12,50" }],
        totalOverride: "abc",
      }),
      "USD",
    );
    expect(result.errors).toEqual({
      supplier: "Choose a supplier.",
      number: "Enter the invoice number.",
      total: "Enter a total in USD, like 1,250.00.",
      lines: { a: { description: "Enter a description.", unitPrice: "Enter a price in USD, like 12.50." } },
    });
  });
});

describe("InvoiceForm", () => {
  function renderForm() {
    const onAnalyzed = vi.fn();
    render(<InvoiceForm suppliers={suppliers} orders={[po]} currency="USD" timeZone="UTC" prefill={null} onAnalyzed={onAnalyzed} />);
    return { onAnalyzed, submit: () => fireEvent.click(screen.getByRole("button", { name: "Analyze invoice" })) };
  }

  it("marks the specific invalid line fields, announces them and focuses the first", async () => {
    const { fetchMock } = mockFetch({});
    const { submit } = renderForm();
    fireEvent.change(screen.getByRole("combobox", { name: /Supplier/ }), { target: { value: SUPPLIER_ID } });
    fireEvent.change(screen.getByRole("textbox", { name: /Invoice number/ }), { target: { value: "INV-9" } });
    fireEvent.change(screen.getByRole("textbox", { name: "Line 1 description" }), { target: { value: "Oil" } });
    fireEvent.change(screen.getByRole("textbox", { name: "Line 1 quantity" }), { target: { value: "1e2" } });
    fireEvent.change(screen.getByRole("textbox", { name: "Line 1 unit price" }), { target: { value: "4.00" } });
    submit();

    const quantity = screen.getByRole("textbox", { name: "Line 1 quantity" });
    expect(quantity).toHaveAttribute("aria-invalid", "true");
    expect(quantity).toHaveAccessibleDescription("Enter a number using digits, like 12 or 1.5.");
    expect(screen.getByRole("textbox", { name: "Line 1 unit price" })).not.toHaveAttribute("aria-invalid");
    expect(screen.getByRole("alert")).toHaveTextContent("Line 1 quantity: Enter a number using digits, like 12 or 1.5.");
    await waitFor(() => expect(quantity).toHaveFocus());
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("moves focus to the form when the orders grid asks to invoice a PO", async () => {
    mockFetch({});
    const scrollIntoView = vi.fn();
    Element.prototype.scrollIntoView = scrollIntoView;
    vi.stubGlobal("matchMedia", (query: string) => ({ matches: query.includes("reduce"), media: query }));
    const { rerender } = render(<InvoiceForm suppliers={suppliers} orders={[po]} currency="USD" prefill={null} onAnalyzed={vi.fn()} />);
    expect(scrollIntoView).not.toHaveBeenCalled();

    rerender(<InvoiceForm suppliers={suppliers} orders={[po]} currency="USD" prefill={{ po, seq: 1 }} onAnalyzed={vi.fn()} />);
    await waitFor(() => expect(screen.getByRole("heading", { name: "Analyze a supplier invoice" })).toHaveFocus());
    // Reduced motion: jump, don't animate.
    expect(scrollIntoView).toHaveBeenCalledWith({ behavior: "auto", block: "start" });
    expect(screen.getByRole("textbox", { name: /Invoice number/ })).toHaveValue("INV-1001");
  });

  it("prefills from a PO and submits the parsed body", async () => {
    const invoice = { id: "inv-1", invoice_number: "INV-1001", matches: [], settlement_allowed: true } as unknown as InvoiceDto;
    const { calls } = mockFetch({ "POST /api/v1/invoices/analyze": [jsonResponse({ ...invoice, status: "MATCHED", currency: "USD" })] });
    const { submit, onAnalyzed } = renderForm();
    fireEvent.change(screen.getByRole("combobox", { name: /Purchase order/ }), { target: { value: PO_ID } });
    submit();

    await waitFor(() => expect(onAnalyzed).toHaveBeenCalled());
    expect(calls[0]!.body).toMatchObject({
      supplier_id: SUPPLIER_ID,
      purchase_order_id: PO_ID,
      invoice_number: "INV-1001",
      lines: [{ quantity: 4, unit_price_minor: 2500, line_total_minor: 10000 }],
      total_minor: 10000,
    });
  });

  it("adds and removes lines with keys that stay unique", () => {
    mockFetch({});
    renderForm();
    fireEvent.click(screen.getByRole("button", { name: "+ Add line" }));
    fireEvent.click(screen.getByRole("button", { name: "+ Add line" }));
    fireEvent.change(screen.getByRole("textbox", { name: "Line 3 description" }), { target: { value: "Gloves" } });
    fireEvent.click(screen.getByRole("button", { name: "Remove line 2" }));
    fireEvent.click(screen.getByRole("button", { name: "+ Add line" }));
    expect(screen.getAllByRole("textbox", { name: /^Line \d description$/ }).map((i) => (i as HTMLInputElement).value)).toEqual([
      "",
      "Gloves",
      "",
    ]);
  });

  it("offers the duplicate-invoice demo only in demo mode", async () => {
    mockFetch({});
    renderForm();
    expect(screen.getByRole("button", { name: "Simulate duplicate invoice" })).toBeDisabled();

    vi.resetModules();
    vi.stubEnv("NEXT_PUBLIC_DEMO_ACCOUNTS", "false");
    const { InvoiceForm: ProductionForm } = await import("@/components/orders/InvoiceForm");
    cleanup();
    render(<ProductionForm suppliers={suppliers} orders={[po]} currency="USD" prefill={null} onAnalyzed={vi.fn()} />);
    expect(screen.getByRole("button", { name: "Analyze invoice" })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Simulate duplicate invoice" })).not.toBeInTheDocument();
    vi.unstubAllEnvs();
  });
});

describe("nextLineKey", () => {
  it("picks the first unused key", () => {
    const l = (key: string) => ({ key, sku: "", description: "", quantity: "1", unitPrice: "" });
    expect(nextLineKey([])).toBe("l0");
    expect(nextLineKey([l("l0"), l("l1")])).toBe("l2");
    expect(nextLineKey([l("l0"), l("l2")])).toBe("l3");
    expect(nextLineKey([l("l1")])).toBe("l2");
  });
});
