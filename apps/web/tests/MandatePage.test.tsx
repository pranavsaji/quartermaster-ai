import type { SpendMandateDto } from "@qm/contracts";
import { fireEvent, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { MandatePage } from "@/app/(console)/mandate/MandatePage";
import { analyticsSummary, jsonResponse, mockFetch, renderWithSession } from "./helpers";

const mandate: SpendMandateDto = {
  id: "m-1",
  version: 3,
  status: "ACTIVE",
  currency: "USD",
  weekly_budget_minor: 150000,
  per_order_limit_minor: 50000,
  auto_approval_limit_minor: 10000,
  human_approval_required: true,
  approved_supplier_ids: [],
  allowed_categories: ["food_packaging"],
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

const current = jsonResponse({ mandate, budget: analyticsSummary().budget });

describe("MandatePage", () => {
  it("shows the mandate's load failure with a retry and nothing else", async () => {
    mockFetch({
      "GET /api/v1/mandates/current": [jsonResponse({ error: { code: "INTERNAL", message: "Mandate store unavailable." } }, 500), current],
      "GET /api/v1/suppliers": [jsonResponse({ items: [] })],
    });
    renderWithSession(<MandatePage />);

    expect(await screen.findByText("Couldn't load the mandate")).toBeInTheDocument();
    expect(screen.queryByText("This week's budget")).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Retry" }));
    expect(await screen.findByText("This week's budget")).toBeInTheDocument();
  });

  it("keeps the budget visible when only the suppliers fail, with their own retry", async () => {
    mockFetch({
      "GET /api/v1/mandates/current": [current],
      "GET /api/v1/suppliers": [jsonResponse({ error: { code: "INTERNAL", message: "Suppliers unavailable." } }, 500)],
    });
    renderWithSession(<MandatePage />);

    expect(await screen.findByText("Couldn't load suppliers")).toBeInTheDocument();
    expect(screen.getByText("This week's budget")).toBeInTheDocument();
    expect(screen.getByText(/You are viewing/)).toHaveTextContent("version 3");
  });
});
