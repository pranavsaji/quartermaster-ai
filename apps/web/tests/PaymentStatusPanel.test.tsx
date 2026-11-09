import { act, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { isSameOrNewer, PaymentStatusPanel } from "@/components/payments/PaymentStatusPanel";
import { jsonResponse, mockFetch, payment } from "./helpers";

vi.mock("@/components/session/SessionProvider", () => ({
  useSession: () => ({ can: () => true }),
}));

describe("isSameOrNewer", () => {
  it("rejects a response older than what is already shown", () => {
    const shown = payment({ status: "COMPLETED", updated_at: "2026-11-09T10:00:05.000Z" });
    expect(isSameOrNewer(payment({ status: "CAPTURE_PENDING", updated_at: "2026-11-09T10:00:01.000Z" }), shown)).toBe(false);
    expect(isSameOrNewer(payment({ status: "COMPLETED", updated_at: "2026-11-09T10:00:05.000Z" }), shown)).toBe(true);
  });
});

describe("PaymentStatusPanel polling", () => {
  afterEach(() => vi.useRealTimers());

  it("polls one request at a time while settling and ignores an out-of-order older status", async () => {
    vi.useFakeTimers();
    const pending = payment({ status: "CAPTURE_PENDING", updated_at: "2026-11-09T10:00:02.000Z" });
    const { fetchMock } = mockFetch({
      "GET /api/v1/payments/pay-1": [jsonResponse(payment({ status: "PAYER_APPROVED", updated_at: "2026-11-09T10:00:01.000Z" }))],
    });
    const onPayment = vi.fn();
    render(<PaymentStatusPanel payment={pending} delivery={null} onPayment={onPayment} />);
    expect(screen.getByText(/Checking with PayPal/)).toBeInTheDocument();

    await act(async () => vi.advanceTimersByTimeAsync(2500));
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(onPayment).not.toHaveBeenCalled();
  });

  it("stops after the attempt cap and offers a manual refresh", async () => {
    vi.useFakeTimers();
    const pending = payment({ status: "CAPTURE_PENDING" });
    const { fetchMock } = mockFetch({ "GET /api/v1/payments/pay-1": [jsonResponse(pending)] });
    render(<PaymentStatusPanel payment={pending} delivery={null} onPayment={vi.fn()} />);

    await act(async () => vi.advanceTimersByTimeAsync(10 * 60_000));
    expect(fetchMock).toHaveBeenCalledTimes(15);
    expect(screen.getByText("PayPal is still settling this payment")).toBeInTheDocument();

    await act(async () => {
      screen.getByRole("button", { name: "Refresh status" }).click();
      await vi.advanceTimersByTimeAsync(0);
    });
    expect(fetchMock).toHaveBeenCalledTimes(16);
  });
});
