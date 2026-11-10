import type { GridApi } from "ag-grid-community";
import { fireEvent, render, screen, within } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { emptyOverlayHtml, fitColumns } from "@/components/grid/DataGrid";
import { ticks } from "@/components/inventory/DemandSlider";
import { groupProposals } from "@/components/procurement/ProposalList";
import { ProposalLines } from "@/components/procurement/ProposalLines";
import { Header } from "@/components/shell/Header";
import { EmptyState } from "@/components/ui/EmptyState";
import { RefreshButton } from "@/components/ui/RefreshButton";
import { cn } from "@/components/ui/cn";
import { policyDecision, purchaseOrder, renderWithSession } from "./helpers";

function fakeApi(cols: { id: string; minWidth?: number; flex?: number; wrap?: boolean }[]) {
  const api = {
    getAllDisplayedColumns: () =>
      cols.map((c) => ({
        getColDef: () => ({ minWidth: c.minWidth, wrapText: c.wrap }),
        getFlex: () => c.flex ?? null,
        getColId: () => c.id,
      })),
    sizeColumnsToFit: vi.fn(),
    autoSizeColumns: vi.fn(),
  };
  return api;
}

describe("DataGrid column fitting", () => {
  it("lets flex columns fill the width when every column fits at its minimum", () => {
    const api = fakeApi([
      { id: "name", minWidth: 200, flex: 2 },
      { id: "qty", minWidth: 90 },
    ]);
    expect(fitColumns(api as unknown as GridApi, 600, 90)).toBe("fit");
    expect(api.sizeColumnsToFit).not.toHaveBeenCalled();
    expect(api.autoSizeColumns).not.toHaveBeenCalled();
  });

  it("spreads fixed columns over the width when none of them flex", () => {
    const api = fakeApi([{ id: "a" }, { id: "b" }]);
    expect(fitColumns(api as unknown as GridApi, 600, 90)).toBe("fit");
    expect(api.sizeColumnsToFit).toHaveBeenCalled();
  });

  it("sizes fixed, non-wrapping columns to their cells when the minimums don't fit", () => {
    const api = fakeApi([
      { id: "item", minWidth: 200, flex: 1 },
      { id: "product", minWidth: 200, wrap: true },
      { id: "qty", minWidth: 90 },
      { id: "total", minWidth: 120 },
    ]);
    expect(fitColumns(api as unknown as GridApi, 400, 90)).toBe("content");
    expect(api.autoSizeColumns).toHaveBeenCalledWith(["qty", "total"]);
  });

  it("renders the empty overlay in the EmptyState shape, escaping its text", () => {
    const html = emptyOverlayHtml("No <rows>", "Add one & retry");
    expect(html).toContain('class="qm-grid-empty-title">No &#60;rows&#62;<');
    expect(html).toContain('class="qm-grid-empty-text">Add one &#38; retry<');
  });
});

describe("proposal grouping", () => {
  it("separates live proposals from evidence and counts only TrustRail's blocks", () => {
    const approvable = purchaseOrder({ id: "ok", created_at: "2026-11-09T10:00:03.000Z" });
    const approved = purchaseOrder({ id: "paid", status: "APPROVED", created_at: "2026-11-09T10:00:01.000Z" });
    const blocked = purchaseOrder({ id: "bad", status: "BLOCKED", policy_decision: policyDecision({ decision: "BLOCK" }) });
    const replaced = purchaseOrder({ id: "old", status: "SUPERSEDED", policy_decision: policyDecision({ decision: "REVIEW_REQUIRED" }) });
    const g = groupProposals([approved, replaced, approvable, blocked]);
    // Approvable first, then the one waiting for payment.
    expect(g.live.map((p) => p.id)).toEqual(["ok", "paid"]);
    // Blocked evidence before replaced evidence.
    expect(g.evidence.map((p) => p.id)).toEqual(["bad", "old"]);
    expect(g).toMatchObject({ ready: 1, blocked: 1, replaced: 1, open: 1 });
  });
});

describe("small components", () => {
  it("places demand ticks at both ends and on whole multiples", () => {
    expect(ticks(0.5, 3)).toEqual([0.5, 1, 2, 3]);
    expect(ticks(1, 2)).toEqual([1, 2]);
  });

  it("names line types in sentence case", () => {
    render(<ProposalLines po={purchaseOrder()} />);
    expect(screen.getAllByText("Product").length).toBeGreaterThan(0);
    expect(screen.queryByText("PRODUCT")).not.toBeInTheDocument();
  });

  it("has one Refresh control with an accessible name that spins while busy", () => {
    const onClick = vi.fn();
    const { rerender } = render(<RefreshButton onClick={onClick} />);
    fireEvent.click(screen.getByRole("button", { name: "Refresh" }));
    expect(onClick).toHaveBeenCalledTimes(1);
    rerender(<RefreshButton onClick={onClick} loading />);
    expect(screen.getByRole("button", { name: "Refresh" })).toBeDisabled();
  });

  it("gives every empty state a title, a line and an optional action", () => {
    render(<EmptyState title="Nothing yet" description="It fills in later." action={<button type="button">Do it</button>} />);
    expect(screen.getByText("Nothing yet")).toBeInTheDocument();
    expect(screen.getByText("It fills in later.")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Do it" })).toBeInTheDocument();
  });

  it("merges the type-scale tokens as font sizes", () => {
    expect(cn("text-xs text-ink-3", "text-2xs")).toBe("text-ink-3 text-2xs");
  });
});

describe("header", () => {
  it("shows one Sandbox chip whose popover lists the services", () => {
    renderWithSession(<Header onOpenMenu={vi.fn()} />);
    const chip = screen.getByRole("button", { name: /Sandbox environment details/ });
    expect(chip).toHaveAttribute("aria-expanded", "false");
    fireEvent.click(chip);
    expect(chip).toHaveAttribute("aria-expanded", "true");
    const panel = screen.getByRole("group", { name: /Sandbox environment details/ });
    expect(within(panel).getByText("PayPal")).toBeInTheDocument();
    expect(within(panel).getByText("AI model")).toBeInTheDocument();
    expect(within(panel).getByText("Market prices")).toBeInTheDocument();
    fireEvent.keyDown(document, { key: "Escape" });
    expect(chip).toHaveAttribute("aria-expanded", "false");
    expect(chip).toHaveFocus();
  });
});
