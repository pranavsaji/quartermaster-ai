import type { PurchaseOrderDto } from "@qm/contracts";
import { act, fireEvent, screen } from "@testing-library/react";
import { useState } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { ProposalCard } from "@/components/procurement/ProposalCard";
import { certificate, delivery, jsonResponse, mockFetch, payment, purchaseOrder, renderWithSession } from "./helpers";

/** The request page in miniature: `onChange` replaces the proposal, as RequestDetail does. */
function Harness({ initial, onReload = vi.fn() }: { initial: PurchaseOrderDto; onReload?: () => void }) {
  const [po, setPo] = useState(initial);
  return <ProposalCard requestId="req-1" po={po} onChange={setPo} onReload={onReload} />;
}

const settling = purchaseOrder({
  status: "PAYMENT_PENDING",
  payment: payment({ status: "CAPTURE_PENDING", updated_at: "2026-11-09T10:00:01.000Z" }),
});

describe("ProposalCard payment transitions", () => {
  afterEach(() => vi.useRealTimers());

  it("re-reads the purchase order when polling sees the payment settle, picking up its status and delivery", async () => {
    vi.useFakeTimers();
    const completed = payment({ status: "COMPLETED", captured_amount_minor: 12345, updated_at: "2026-11-09T10:00:05.000Z" });
    const { calls } = mockFetch({
      "GET /api/v1/payments/pay-1": [jsonResponse(completed)],
      "GET /api/v1/purchase-orders/po-1": [
        jsonResponse({ ...settling, status: "PAID", payment: completed, delivery: delivery({ expected_date: "2026-11-12" }) }),
      ],
    });
    renderWithSession(<Harness initial={settling} />);
    expect(screen.getByText("Proposal: Payment pending")).toBeInTheDocument();

    await act(async () => vi.advanceTimersByTimeAsync(2500));

    expect(calls.map((c) => `${c.method} ${new URL(c.url, "http://localhost").pathname}`)).toEqual([
      "GET /api/v1/payments/pay-1",
      "GET /api/v1/purchase-orders/po-1",
    ]);
    expect(screen.getByText("Proposal: Paid")).toBeInTheDocument();
    expect(screen.getByText("Payment: Completed")).toBeInTheDocument();
    expect(screen.getByText("Delivery: Scheduled")).toBeInTheDocument();
    expect(screen.queryByText(/Checking with PayPal/)).not.toBeInTheDocument();
  });

  it("keeps the newer payment if the re-read order still carries an older one", async () => {
    vi.useFakeTimers();
    const failed = payment({ status: "FAILED", failure_code: "DECLINED", updated_at: "2026-11-09T10:00:05.000Z" });
    mockFetch({
      "GET /api/v1/payments/pay-1": [jsonResponse(failed)],
      "GET /api/v1/purchase-orders/po-1": [jsonResponse({ ...settling, status: "APPROVED" })],
    });
    renderWithSession(<Harness initial={settling} />);

    await act(async () => vi.advanceTimersByTimeAsync(2500));

    expect(screen.getByText("Proposal: Approved")).toBeInTheDocument();
    expect(screen.getByText("Payment: Failed")).toBeInTheDocument();
  });

  it("reloads the whole request when the purchase order can't be re-read", async () => {
    vi.useFakeTimers();
    const onReload = vi.fn();
    mockFetch({
      "GET /api/v1/payments/pay-1": [jsonResponse(payment({ status: "COMPLETED", updated_at: "2026-11-09T10:00:05.000Z" }))],
      "GET /api/v1/purchase-orders/po-1": [jsonResponse({ error: { code: "INTERNAL", message: "boom" } }, 500)],
    });
    renderWithSession(<Harness initial={settling} onReload={onReload} />);

    await act(async () => vi.advanceTimersByTimeAsync(2500));

    expect(onReload).toHaveBeenCalledTimes(1);
    expect(screen.getByText("Payment: Completed")).toBeInTheDocument();
  });

  it("drops a verification result when the certificate changes", async () => {
    const cert = certificate();
    mockFetch({
      "GET /api/v1/intents/intent-1/verify": [
        jsonResponse({
          intent_id: "intent-1",
          status: "VALID",
          valid: true,
          checks: [],
          certificate: cert,
          verified_at: "2026-11-09T10:00:00.000Z",
        }),
      ],
    });
    const paid = purchaseOrder({ status: "PAID", certificate: cert });
    const { rerender } = renderWithSession(<ProposalCard requestId="req-1" po={paid} onChange={vi.fn()} onReload={vi.fn()} />);
    fireEvent.click(screen.getByRole("button", { name: "Verify" }));
    expect(await screen.findByText("Certificate is valid.")).toBeInTheDocument();

    rerender(
      <ProposalCard
        requestId="req-1"
        po={{ ...paid, certificate: { ...cert, status: "CONSUMED" } }}
        onChange={vi.fn()}
        onReload={vi.fn()}
      />,
    );
    expect(screen.queryByText("Certificate is valid.")).not.toBeInTheDocument();
    expect(screen.getByText("Certificate: Consumed")).toBeInTheDocument();
  });

  it("does not re-read the order while the payment is still settling", async () => {
    vi.useFakeTimers();
    const { calls } = mockFetch({
      "GET /api/v1/payments/pay-1": [jsonResponse(payment({ status: "CAPTURE_PENDING", updated_at: "2026-11-09T10:00:03.000Z" }))],
    });
    renderWithSession(<Harness initial={settling} />);

    await act(async () => vi.advanceTimersByTimeAsync(2500));

    expect(calls.every((c) => c.url.includes("/payments/"))).toBe(true);
  });
});
