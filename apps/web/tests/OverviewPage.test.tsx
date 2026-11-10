import { screen, within } from "@testing-library/react";
import { beforeEach, describe, expect, it } from "vitest";
import { OverviewPage } from "@/app/(console)/OverviewPage";
import { clearSharedCache } from "@/lib/shared-cache";
import { analyticsSummary, delivery, inventoryItem, jsonResponse, mockFetch, renderWithSession } from "./helpers";

const failure = (message: string) => jsonResponse({ error: { code: "INTERNAL", message } }, 500);

describe("OverviewPage", () => {
  beforeEach(() => clearSharedCache());

  it("shows each section's own failure with a retry, and never an empty state under it", async () => {
    mockFetch({
      "GET /api/v1/analytics/summary": [failure("Analytics are unavailable.")],
      "GET /api/v1/inventory": [failure("Inventory is unavailable.")],
      "GET /api/v1/deliveries": [failure("Deliveries are unavailable.")],
      "GET /api/v1/purchase-orders": [jsonResponse({ items: [], next_cursor: null })],
      "GET /api/v1/security/events": [jsonResponse({ items: [], next_cursor: null })],
    });
    renderWithSession(<OverviewPage />);

    expect(await screen.findByText("Couldn't load KPIs")).toBeInTheDocument();
    expect(await screen.findByText("Inventory is unavailable.")).toBeInTheDocument();
    expect(await screen.findByText("Deliveries are unavailable.")).toBeInTheDocument();
    expect(screen.getAllByRole("button", { name: "Retry" })).toHaveLength(3);
    expect(screen.queryByText("Everything is above its reorder point")).not.toBeInTheDocument();
    expect(screen.queryByText("No deliveries on the way")).not.toBeInTheDocument();
    expect(screen.queryByText("Pending approvals")).not.toBeInTheDocument();
  });

  it("renders the KPIs, low stock and upcoming deliveries once loaded", async () => {
    mockFetch({
      "GET /api/v1/analytics/summary": [jsonResponse(analyticsSummary())],
      "GET /api/v1/inventory": [
        jsonResponse({ items: [inventoryItem({ status: "CRITICAL", name: "Fryer oil" }), inventoryItem({ id: "inv-2" })] }),
      ],
      "GET /api/v1/deliveries": [jsonResponse({ items: [delivery()] })],
      "GET /api/v1/purchase-orders": [jsonResponse({ items: [], next_cursor: null })],
      "GET /api/v1/security/events": [jsonResponse({ items: [], next_cursor: null })],
    });
    renderWithSession(<OverviewPage />);

    expect(await screen.findByText("Carts waiting for the owner")).toBeInTheDocument();
    const lowStock = screen.getByRole("region", { name: "Low stock" });
    expect(await within(lowStock).findByText("Fryer oil")).toBeInTheDocument();
    expect(within(lowStock).getAllByRole("row")).toHaveLength(2);
    expect(await screen.findByText(/Expected/)).toBeInTheDocument();
  });
});
