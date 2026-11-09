import type { SpendMandateDto, SupplierDto } from "@qm/contracts";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { MandateForm } from "@/components/mandate/MandateForm";
import { jsonResponse, mockFetch } from "./helpers";

const SUPPLIER_ID = "5b0c3f4e-2a6d-4d8e-9b1a-3c2f1e0d9a87";

const mandate: SpendMandateDto = {
  id: "m-1",
  version: 3,
  status: "ACTIVE",
  currency: "USD",
  weekly_budget_minor: 150000,
  per_order_limit_minor: 50000,
  auto_approval_limit_minor: 10000,
  human_approval_required: true,
  approved_supplier_ids: [SUPPLIER_ID],
  allowed_categories: ["food_packaging", "cooking_ingredients"],
  max_market_price_premium_pct: 25,
  market_price_action: "REVIEW",
  duplicate_window_hours: 48,
  duplicate_action: "BLOCK",
  subscriptions_allowed: false,
  certificate_ttl_minutes: 30,
  max_quantity_multiple_of_need: 1.5,
  created_by: "u-1",
  created_at: "2026-11-01T00:00:00.000Z",
};

const suppliers: SupplierDto[] = [
  {
    id: SUPPLIER_ID,
    name: "Harbor Foodservice",
    approved: true,
    active: true,
    checkout_eligible: true,
    lead_time_days: 2,
    tax_rate_bps: 825,
    fee_terms: [],
    website: null,
    data_source: "SANDBOX_SUPPLIER",
  },
];

function renderForm(onSaved = vi.fn()) {
  render(<MandateForm mandate={mandate} suppliers={suppliers} editable onSaved={onSaved} />);
  return { onSaved, save: () => fireEvent.click(screen.getByRole("button", { name: "Save mandate" })) };
}

describe("MandateForm validation", () => {
  it("flags a cleared number field instead of sending 0", () => {
    const { fetchMock } = mockFetch({});
    const { save } = renderForm();
    const ttl = screen.getByRole("textbox", { name: "Certificate lifetime (minutes)" });

    fireEvent.change(ttl, { target: { value: "" } });
    save();

    expect(ttl).toHaveAttribute("aria-invalid", "true");
    expect(ttl).toHaveAccessibleDescription(expect.stringContaining("This field is required."));
    expect(ttl).toHaveAttribute("aria-required");
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("explains out-of-range and non-numeric values in words", () => {
    mockFetch({});
    const { save } = renderForm();
    fireEvent.change(screen.getByRole("textbox", { name: "Duplicate window (hours)" }), { target: { value: "1000" } });
    fireEvent.change(screen.getByRole("textbox", { name: "Max quantity × need" }), { target: { value: "lots" } });
    fireEvent.change(screen.getByRole("textbox", { name: /Weekly budget/ }), { target: { value: "12.345" } });
    save();

    expect(screen.getByText("Enter a value from 0 to 720.")).toBeInTheDocument();
    expect(screen.getByText("Enter a number using digits, like 12 or 1.5.")).toBeInTheDocument();
    expect(screen.getByText("Enter an amount in USD using digits only.")).toBeInTheDocument();
    expect(screen.queryByText(/expected number|Too (big|small)/i)).not.toBeInTheDocument();
  });

  it("reports cross-field limits and empty category groups on the group itself", () => {
    mockFetch({});
    const { save } = renderForm();
    fireEvent.change(screen.getByRole("textbox", { name: /Per-order limit/ }), { target: { value: "2000" } });
    for (const name of ["Food packaging", "Cooking ingredients"]) fireEvent.click(screen.getByRole("checkbox", { name }));
    save();

    expect(screen.getByText("Per-order limit cannot exceed the weekly budget.")).toBeInTheDocument();
    const group = screen.getByRole("group", { name: "Allowed categories" });
    expect(group).toHaveAccessibleDescription(expect.stringContaining("Select at least one category."));
  });

  it("submits integer minor units and parsed numbers when valid", async () => {
    const { calls } = mockFetch({
      "PUT /api/v1/mandates/current": [
        jsonResponse({ mandate: { ...mandate, version: 4, certificate_ttl_minutes: 45 }, budget: {}, revoked_certificates: 0 }),
      ],
    });
    const { save, onSaved } = renderForm();
    fireEvent.change(screen.getByRole("textbox", { name: "Certificate lifetime (minutes)" }), { target: { value: "45" } });
    save();

    await waitFor(() => expect(onSaved).toHaveBeenCalled());
    expect(calls[0]!.body).toMatchObject({
      weekly_budget_minor: 150000,
      per_order_limit_minor: 50000,
      certificate_ttl_minutes: 45,
      max_quantity_multiple_of_need: 1.5,
      expected_version: 3,
    });
  });
});
