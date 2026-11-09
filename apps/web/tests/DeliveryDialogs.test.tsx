import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { DelayDialog, ReceiveDialog } from "@/components/orders/DeliveryDialogs";
import { delivery, jsonResponse, mockFetch, purchaseOrder } from "./helpers";

const LINE_ID = "0e7d9c1a-5b3f-4a2e-8d6c-1f2e3d4c5b6a";
const po = purchaseOrder({
  status: "PAID",
  items: [
    {
      id: LINE_ID,
      kind: "PRODUCT",
      sku: "HF-TK32",
      description: "Takeaway containers 32oz",
      category: "food_packaging",
      quantity: 4,
      unit_price_minor: 2500,
      line_total_minor: 10000,
      inventory_item_id: "inv-1",
      pack_quantity: null,
    },
  ],
});
const target = { po, delivery: delivery() };

describe("ReceiveDialog", () => {
  it("starts from the ordered quantities and sends what was received", async () => {
    const { calls } = mockFetch({
      "POST /api/v1/deliveries/del-1/receive": [jsonResponse({ delivery: delivery({ status: "DELIVERED" }), stock_movements: [] })],
    });
    const onDone = vi.fn();
    const onClose = vi.fn();
    render(<ReceiveDialog target={target} onClose={onClose} onDone={onDone} />);
    const qty = screen.getByRole("textbox", { name: "Quantity received for Takeaway containers 32oz" });
    expect(qty).toHaveValue("4");
    fireEvent.change(qty, { target: { value: "3" } });
    fireEvent.click(screen.getByRole("button", { name: "Mark received" }));

    await waitFor(() => expect(onDone).toHaveBeenCalledWith(expect.objectContaining({ status: "DELIVERED" })));
    expect(calls[0]!.body).toEqual({ lines: [{ purchase_order_item_id: LINE_ID, quantity_received: 3 }] });
    expect(onClose).toHaveBeenCalled();
  });

  it("rejects a quantity Number() would accept, announces it and focuses the line", async () => {
    const { fetchMock } = mockFetch({});
    render(<ReceiveDialog target={target} onClose={vi.fn()} onDone={vi.fn()} />);
    const qty = screen.getByRole("textbox", { name: "Quantity received for Takeaway containers 32oz" });
    fireEvent.change(qty, { target: { value: "1e2" } });
    fireEvent.click(screen.getByRole("button", { name: "Mark received" }));

    expect(qty).toHaveAttribute("aria-invalid", "true");
    expect(qty).toHaveAccessibleDescription("Enter a number using digits, like 12 or 1.5.");
    expect(screen.getByRole("alert")).toHaveTextContent("Takeaway containers 32oz: Enter a number using digits");
    await waitFor(() => expect(qty).toHaveFocus());
    expect(fetchMock).not.toHaveBeenCalled();
  });
});

describe("DelayDialog", () => {
  afterEach(() => vi.useRealTimers());

  it("uses the organisation's today for the earliest date", () => {
    // 23:30 on Nov 9 in New York is already Nov 10 in UTC.
    vi.useFakeTimers({ now: Date.parse("2026-11-10T04:30:00Z"), toFake: ["Date"] });
    mockFetch({});
    render(<DelayDialog target={target} timeZone="America/New_York" onClose={vi.fn()} onDone={vi.fn()} />);
    expect(screen.getByLabelText(/New expected date/)).toHaveAttribute("min", "2026-11-09");
  });

  it("explains each missing field and focuses the first", async () => {
    const { fetchMock } = mockFetch({});
    render(<DelayDialog target={target} timeZone="UTC" onClose={vi.fn()} onDone={vi.fn()} />);
    fireEvent.click(screen.getByRole("button", { name: "Report delay" }));
    expect(screen.getByRole("alert")).toHaveTextContent("There are 2 problems to fix");
    await waitFor(() => expect(screen.getByLabelText(/New expected date/)).toHaveFocus());
    expect(screen.getByRole("textbox", { name: /Reason/ })).toHaveAccessibleDescription("Say why the delivery is late.");
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("refuses a date before the organisation's today and sends a valid one", async () => {
    vi.useFakeTimers({ now: Date.parse("2026-11-09T12:00:00Z"), toFake: ["Date"] });
    const { calls } = mockFetch({
      "POST /api/v1/deliveries/del-1/delay": [jsonResponse({ delivery: delivery({ status: "DELAYED", expected_date: "2026-11-14" }) })],
    });
    const onDone = vi.fn();
    render(<DelayDialog target={target} timeZone="UTC" onClose={vi.fn()} onDone={onDone} />);
    const dateInput = screen.getByLabelText(/New expected date/);
    fireEvent.change(dateInput, { target: { value: "2026-11-08" } });
    fireEvent.change(screen.getByRole("textbox", { name: /Reason/ }), { target: { value: "Truck broke down" } });
    fireEvent.click(screen.getByRole("button", { name: "Report delay" }));
    expect(dateInput).toHaveAccessibleDescription("Pick today or a later date.");

    fireEvent.change(dateInput, { target: { value: "2026-11-14" } });
    fireEvent.click(screen.getByRole("button", { name: "Report delay" }));
    await waitFor(() => expect(onDone).toHaveBeenCalled());
    expect(calls[0]!.body).toEqual({ new_expected_date: "2026-11-14", reason: "Truck broke down" });
  });
});
