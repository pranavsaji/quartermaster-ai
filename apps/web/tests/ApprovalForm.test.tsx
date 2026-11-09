import type { PurchaseOrderDto } from "@qm/contracts";
import { fireEvent, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { ApprovalForm } from "@/components/procurement/ApprovalForm";
import { ProposalCard } from "@/components/procurement/ProposalCard";
import { jsonResponse, mockFetch, policyDecision, purchaseOrder, renderWithSession, violation } from "./helpers";

const premium12 = violation({ code: "MARKET_PRICE_PREMIUM_EXCEEDED", message: "Unit price is 12% above market." });
const premium40 = violation({ code: "MARKET_PRICE_PREMIUM_EXCEEDED", message: "Unit price is 40% above market." });
const duplicate = violation({ code: "DUPLICATE_ORDER", message: "A similar order was placed yesterday." });
const quantity = violation({ code: "QUANTITY_EXCEEDS_NEED", message: "Quantity is 3× the forecast need." });

function card(po: PurchaseOrderDto) {
  return <ProposalCard requestId="req-1" po={po} onChange={vi.fn()} onReload={vi.fn()} />;
}

const approveButton = () => screen.getByRole("button", { name: "Approve & sign" });

describe("ApprovalForm acknowledgements", () => {
  it("clears every acknowledgement when a re-evaluation produces a new decision", () => {
    mockFetch({});
    const before = purchaseOrder({ policy_decision: policyDecision({ id: "dec-1", violations: [premium12] }) });
    const { rerender } = renderWithSession(card(before));

    fireEvent.click(screen.getByRole("checkbox", { name: /I have reviewed MARKET_PRICE_PREMIUM_EXCEEDED/ }));
    expect(approveButton()).toBeEnabled();

    // Re-evaluated: same code, but the premium is now 40%. The owner has not reviewed that.
    rerender(card({ ...before, policy_decision: policyDecision({ id: "dec-2", violations: [premium40] }) }));

    const box = screen.getByRole("checkbox", { name: /I have reviewed MARKET_PRICE_PREMIUM_EXCEEDED/ });
    expect(box).not.toBeChecked();
    expect(box).toHaveAccessibleDescription("Unit price is 40% above market.");
    expect(approveButton()).toBeDisabled();
  });

  it("counts only acknowledgements for codes in the current decision", () => {
    const po = purchaseOrder({ policy_decision: policyDecision({ violations: [premium12, duplicate] }) });
    const props = { requestId: "req-1", onApproved: vi.fn(), onReject: vi.fn(), onConflict: vi.fn() };
    const { rerender } = renderWithSession(<ApprovalForm {...props} po={po} />);
    for (const box of screen.getAllByRole("checkbox")) fireEvent.click(box);
    expect(screen.getByText(/Acknowledge each review item to continue \(2\/2\)/)).toBeInTheDocument();

    // Without a remount, a stale tick for DUPLICATE_ORDER must not count towards QUANTITY_EXCEEDS_NEED.
    rerender(<ApprovalForm {...props} po={{ ...po, policy_decision: policyDecision({ violations: [premium12, quantity] }) }} />);
    expect(screen.getByText(/Acknowledge each review item to continue \(1\/2\)/)).toBeInTheDocument();
    expect(approveButton()).toBeDisabled();
  });

  it.each(["CART_CHANGED", "MANDATE_CHANGED", "PROPOSAL_NOT_APPROVABLE"])(
    "explains a 409 %s and reloads the request instead of leaving it stale",
    async (code) => {
      const po = purchaseOrder({ policy_decision: policyDecision({ violations: [premium12] }) });
      mockFetch({
        "POST /api/v1/procurement/requests/req-1/approve": [
          jsonResponse({ error: { code, message: "The proposal changed since you opened it." } }, 409),
        ],
      });
      const onReload = vi.fn();
      const onChange = vi.fn();
      renderWithSession(<ProposalCard requestId="req-1" po={po} onChange={onChange} onReload={onReload} />);
      fireEvent.click(screen.getByRole("checkbox"));
      fireEvent.click(approveButton());

      expect(await screen.findByText("This proposal changed before it could be approved")).toBeInTheDocument();
      expect(screen.getByText("The proposal changed since you opened it.")).toBeInTheDocument();
      expect(onReload).toHaveBeenCalledTimes(1);
      expect(onChange).not.toHaveBeenCalled();

      fireEvent.click(screen.getByRole("button", { name: "Reload request" }));
      expect(onReload).toHaveBeenCalledTimes(2);
    },
  );

  it("keeps a non-conflict failure in the form without reloading", async () => {
    const po = purchaseOrder({ policy_decision: policyDecision({ violations: [premium12] }) });
    mockFetch({
      "POST /api/v1/procurement/requests/req-1/approve": [
        jsonResponse({ error: { code: "VALIDATION_ERROR", message: "Note is too long." } }, 400),
      ],
    });
    const onReload = vi.fn();
    renderWithSession(<ProposalCard requestId="req-1" po={po} onChange={vi.fn()} onReload={onReload} />);
    fireEvent.click(screen.getByRole("checkbox"));
    fireEvent.click(approveButton());

    expect(await screen.findByText("Note is too long.")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Reload request" })).not.toBeInTheDocument();
    expect(onReload).not.toHaveBeenCalled();
  });

  it("sends exactly the acknowledged codes and the displayed cart hash", async () => {
    const po = purchaseOrder({ policy_decision: policyDecision({ violations: [premium12] }) });
    const approved = { ...po, status: "APPROVED" as const };
    const { calls } = mockFetch({
      "POST /api/v1/procurement/requests/req-1/approve": [jsonResponse({ purchase_order: approved, certificate: null })],
    });
    const onApproved = vi.fn();
    renderWithSession(<ApprovalForm requestId="req-1" po={po} onApproved={onApproved} onReject={vi.fn()} onConflict={vi.fn()} />);
    fireEvent.click(screen.getByRole("checkbox"));
    fireEvent.click(approveButton());

    await vi.waitFor(() => expect(onApproved).toHaveBeenCalled());
    expect(calls[0]!.body).toMatchObject({
      purchase_order_id: "po-1",
      cart_hash: "sha256:cart-1",
      acknowledged_review_codes: ["MARKET_PRICE_PREMIUM_EXCEEDED"],
    });
  });
});
