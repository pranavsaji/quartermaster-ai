import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { LoadMore } from "@/components/ui/LoadMore";
import { api } from "@/lib/api";
import type { PagedState } from "@/lib/hooks";
import { jsonResponse, mockFetch } from "./helpers";

describe("api.purchaseOrders.list", () => {
  it("asks the API to filter by status, comma-separated, alongside the cursor", async () => {
    const { calls } = mockFetch({ "GET /api/v1/purchase-orders": [jsonResponse({ items: [], next_cursor: null })] });
    await api.purchaseOrders.list({ limit: 100, cursor: "c-2", statuses: ["PROPOSED", "APPROVED", "PAYMENT_PENDING"] });
    const url = new URL(calls[0]!.url, "http://localhost");
    expect(url.searchParams.get("status")).toBe("PROPOSED,APPROVED,PAYMENT_PENDING");
    expect(url.searchParams.get("cursor")).toBe("c-2");
    expect(url.searchParams.get("limit")).toBe("100");
  });

  it("omits the filter when no statuses are given", async () => {
    const { calls } = mockFetch({ "GET /api/v1/purchase-orders": [jsonResponse({ items: [], next_cursor: null })] });
    await api.purchaseOrders.list({ statuses: [] });
    expect(new URL(calls[0]!.url, "http://localhost").searchParams.has("status")).toBe(false);
  });
});

function paged(overrides: Partial<PagedState<string>> = {}): PagedState<string> {
  return {
    items: ["a", "b"],
    error: undefined,
    moreError: undefined,
    hasMore: true,
    loadingMore: false,
    loadMore: vi.fn(),
    reload: vi.fn(),
    refreshing: false,
    stale: false,
    updatedAt: 1,
    ...overrides,
  };
}

describe("LoadMore", () => {
  it("says the list is partial and loads the next page", () => {
    const state = paged();
    render(<LoadMore state={state} noun="orders" />);
    expect(screen.getByRole("status")).toHaveTextContent("Showing the first 2 orders. More are available.");
    fireEvent.click(screen.getByRole("button", { name: "Load more" }));
    expect(state.loadMore).toHaveBeenCalled();
  });

  it("renders nothing for a complete or stale list", () => {
    const { container, rerender } = render(<LoadMore state={paged({ hasMore: false })} />);
    expect(container).toBeEmptyDOMElement();
    rerender(<LoadMore state={paged({ stale: true })} />);
    expect(container).toBeEmptyDOMElement();
  });

  it("keeps the loaded rows and offers a retry when the next page fails", () => {
    render(<LoadMore state={paged({ moreError: new Error("offline") })} />);
    expect(screen.getByText("Couldn't load more")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Try loading more again" })).toBeInTheDocument();
  });
});
