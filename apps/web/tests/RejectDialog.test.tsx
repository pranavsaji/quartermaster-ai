import type { PurchaseOrderDto } from "@qm/contracts";
import { fireEvent, screen, waitFor } from "@testing-library/react";
import { useState } from "react";
import { describe, expect, it, vi } from "vitest";
import { ProposalCard } from "@/components/procurement/ProposalCard";
import { jsonResponse, mockFetch, purchaseOrder, renderWithSession } from "./helpers";

/** A request page in miniature: `onReload` reloads, and the reload shows the proposal as rejected. */
function Harness({ onReload }: { onReload: () => void }) {
  const [po, setPo] = useState<PurchaseOrderDto>(purchaseOrder());
  return (
    <ProposalCard
      requestId="req-1"
      po={po}
      onChange={setPo}
      onReload={() => {
        onReload();
        setPo((p) => ({ ...p, status: "REJECTED" }));
      }}
    />
  );
}

function openAndSubmit(reason = "Too expensive") {
  fireEvent.click(screen.getByRole("button", { name: "Reject" }));
  fireEvent.change(screen.getByRole("textbox", { name: /Reason/ }), { target: { value: reason } });
  fireEvent.click(screen.getByRole("button", { name: "Reject proposal" }));
}

describe("rejecting one proposal", () => {
  it("keeps a 409 explanation on screen and reloads only when the dialog closes", async () => {
    mockFetch({
      "POST /api/v1/procurement/requests/req-1/reject": [
        jsonResponse({ error: { code: "PROPOSAL_NOT_OPEN", message: "This proposal was already approved by someone else." } }, 409),
      ],
    });
    const onReload = vi.fn();
    renderWithSession(<Harness onReload={onReload} />);

    openAndSubmit();

    expect(await screen.findByText("This proposal was already approved by someone else.")).toBeInTheDocument();
    expect(screen.getByRole("dialog")).toBeInTheDocument();
    expect(onReload).not.toHaveBeenCalled();
    expect(screen.getByRole("button", { name: "Reject proposal" })).toBeDisabled();

    fireEvent.click(screen.getByRole("button", { name: "Close" }));
    expect(onReload).toHaveBeenCalledTimes(1);
    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
    // The approval form (and its Reject button) is gone; focus lands on the card, not the page top.
    expect(screen.queryByRole("button", { name: "Reject" })).not.toBeInTheDocument();
    await waitFor(() => expect(screen.getByRole("heading", { name: "Harbor Foodservice" })).toHaveFocus());
  });

  it("closes, reloads once and focuses the card after a successful rejection", async () => {
    const { calls } = mockFetch({
      "POST /api/v1/procurement/requests/req-1/reject": [jsonResponse({ id: "req-1" })],
    });
    const onReload = vi.fn();
    renderWithSession(<Harness onReload={onReload} />);

    openAndSubmit("Found a cheaper supplier");

    await waitFor(() => expect(onReload).toHaveBeenCalledTimes(1));
    expect(calls[0]!.body).toEqual({ reason: "Found a cheaper supplier", purchase_order_id: "po-1" });
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    await waitFor(() => expect(screen.getByRole("heading", { name: "Harbor Foodservice" })).toHaveFocus());
  });

  it("cancelling without a conflict does not reload", () => {
    mockFetch({});
    const onReload = vi.fn();
    renderWithSession(<Harness onReload={onReload} />);
    fireEvent.click(screen.getByRole("button", { name: "Reject" }));
    fireEvent.click(screen.getByRole("button", { name: "Cancel" }));
    expect(onReload).not.toHaveBeenCalled();
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });
});
