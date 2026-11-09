import { screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { ApprovalsPage } from "@/app/(console)/approvals/ApprovalsPage";
import { jsonResponse, mockFetch, purchaseOrder, renderWithSession } from "./helpers";

const LIST = "GET /api/v1/purchase-orders";

describe("ApprovalsPage", () => {
  it("shows only the error when the list can't be loaded, never an empty queue", async () => {
    mockFetch({ [LIST]: [jsonResponse({ error: { code: "INTERNAL", message: "Database unavailable" } }, 500)] });
    renderWithSession(<ApprovalsPage />);

    expect(await screen.findByText("Couldn't load proposals awaiting you")).toBeInTheDocument();
    expect(screen.getByText("Database unavailable")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Retry" })).toBeInTheDocument();
    expect(screen.queryByText("Nothing waiting")).not.toBeInTheDocument();
    expect(screen.queryByText("No proposals need approval.")).not.toBeInTheDocument();
  });

  it("says nothing is waiting when the loaded list is empty", async () => {
    mockFetch({ [LIST]: [jsonResponse({ items: [], next_cursor: null })] });
    renderWithSession(<ApprovalsPage />);

    expect(await screen.findByText("No proposals need approval.")).toBeInTheDocument();
    expect(screen.getByText("No approved carts awaiting payment.")).toBeInTheDocument();
    expect(screen.queryByText(/Something went wrong|Couldn't load/)).not.toBeInTheDocument();
  });

  it("groups proposals by stage, newest first, and asks the API for awaiting statuses only", async () => {
    const older = purchaseOrder({
      id: "po-old",
      number: "PO-1001",
      supplier_name: "Harbor Foodservice",
      created_at: "2026-11-08T10:00:00.000Z",
    });
    const newer = purchaseOrder({
      id: "po-new",
      number: "PO-1002",
      supplier_name: "QuickServe Packaging",
      created_at: "2026-11-09T10:00:00.000Z",
    });
    const approved = purchaseOrder({ id: "po-pay", number: "PO-1003", supplier_name: "Metro Supply", status: "APPROVED" });
    const { calls } = mockFetch({ [LIST]: [jsonResponse({ items: [newer, older, approved], next_cursor: null })] });
    renderWithSession(<ApprovalsPage />);

    expect(await screen.findByText("Metro Supply")).toBeInTheDocument();
    const rows = within(screen.getByRole("region", { name: "Awaiting approval" })).getAllByRole("listitem");
    expect(rows.map((r) => within(r).getByText(/PO-\d+/).textContent)).toEqual(["PO-1002", "PO-1001"]);
    expect(within(screen.getByRole("region", { name: "Approved — awaiting payment" })).getByText("Metro Supply")).toBeInTheDocument();
    expect(new URL(calls[0]!.url, "http://localhost").searchParams.get("status")).toBe("PROPOSED,APPROVED,PAYMENT_PENDING");
  });
});
