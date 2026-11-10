import { fireEvent, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { SecurityPage } from "@/app/(console)/security/SecurityPage";
import { clearSharedCache } from "@/lib/shared-cache";
import { analyticsSummary, jsonResponse, mockFetch, renderWithSession } from "./helpers";

// The grids are AG Grid (covered by grid.test and the Playwright suite); here only the page's states matter.
vi.mock("@/components/security/FindingsGrid", () => ({ FindingsGrid: () => <div>findings grid</div> }));
vi.mock("@/components/security/DecisionsGrid", () => ({ DecisionsGrid: () => <div>decisions grid</div> }));
vi.mock("@/components/security/AuditLog", () => ({ AuditLog: () => <div>audit log</div> }));

const emptyPage = jsonResponse({ items: [], next_cursor: null });
const notificationStatus = {
  configured: true,
  last_received_at: "2026-11-09T10:00:00.000Z",
  last_event_type: "PAYMENT.CAPTURE.COMPLETED",
  received_24h: 3,
  unconfirmed_captures_7d: 0,
  rejected_signatures_24h: 0,
};
const lists = {
  "GET /api/v1/security/events": [emptyPage],
  "GET /api/v1/security/decisions": [emptyPage],
  "GET /api/v1/security/audit": [emptyPage],
  "GET /api/v1/security/paypal-notifications": [jsonResponse({ status: notificationStatus })],
};

describe("SecurityPage", () => {
  beforeEach(() => clearSharedCache());

  it("shows the summary's failure with a retry instead of shimmering tiles forever", async () => {
    const { calls } = mockFetch({
      ...lists,
      "GET /api/v1/analytics/summary": [
        jsonResponse({ error: { code: "INTERNAL", message: "Analytics are unavailable.", correlation_id: "corr-9" } }, 500),
        jsonResponse(analyticsSummary()),
      ],
    });
    renderWithSession(<SecurityPage />);

    expect(await screen.findByText("Couldn't load the security totals")).toBeInTheDocument();
    expect(screen.getByText("Analytics are unavailable.")).toBeInTheDocument();
    expect(screen.queryByText("Duplicate captures")).not.toBeInTheDocument();
    // The lists still load on their own.
    expect(screen.getByText("findings grid")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Retry" }));
    expect(await screen.findByText("Duplicate captures")).toBeInTheDocument();
    expect(screen.getByText("Prompt injections detected").nextElementSibling).toHaveTextContent("1");
    expect(calls.filter((c) => c.url.includes("/analytics/summary"))).toHaveLength(2);
  });

  it("shows the totals once the summary loads", async () => {
    mockFetch({ ...lists, "GET /api/v1/analytics/summary": [jsonResponse(analyticsSummary())] });
    renderWithSession(<SecurityPage />);

    expect(await screen.findByText("Target: always 0")).toBeInTheDocument();
    expect(screen.getByText("Blocked attempts").nextElementSibling).toHaveTextContent("2");
    expect(screen.queryByText(/Couldn't load/)).not.toBeInTheDocument();
  });

  it("shows whether PayPal's signed notifications are arriving, and warns about captures without one", async () => {
    mockFetch({
      ...lists,
      "GET /api/v1/analytics/summary": [jsonResponse(analyticsSummary())],
      "GET /api/v1/security/paypal-notifications": [jsonResponse({ status: { ...notificationStatus, unconfirmed_captures_7d: 2 } })],
    });
    renderWithSession(<SecurityPage />);

    expect(await screen.findByText("Missing confirmations")).toBeInTheDocument();
    expect(screen.getByText("Captures without a notification (7 d)").nextElementSibling).toHaveTextContent("2");
    expect(screen.getByText("Received (24 h)").nextElementSibling).toHaveTextContent("3");
    expect(screen.getByText("PAYMENT.CAPTURE.COMPLETED")).toBeInTheDocument();
  });
});
