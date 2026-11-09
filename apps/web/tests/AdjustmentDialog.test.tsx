import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { AdjustmentDialog, planAdjustment } from "@/components/inventory/AdjustmentDialog";
import { inventoryItem, jsonResponse, mockFetch } from "./helpers";

const item = inventoryItem({ on_hand: 10, unit: "cases" });

function setup() {
  const onSaved = vi.fn();
  const onClose = vi.fn();
  render(<AdjustmentDialog item={item} onClose={onClose} onSaved={onSaved} />);
  const reason = screen.getByRole("combobox", { name: /Reason/ });
  const quantity = () => screen.getByRole("textbox", { name: /Counted on hand|Quantity removed|Quantity received/ });
  const save = () => fireEvent.click(screen.getByRole("button", { name: "Save adjustment" }));
  return { onSaved, onClose, reason, quantity, save };
}

describe("planAdjustment", () => {
  it("applies the sign from the reason to a positive amount", () => {
    expect(planAdjustment("remove", "3", 10)).toEqual({ ok: true, delta: -3 });
    expect(planAdjustment("add", "24", 10)).toEqual({ ok: true, delta: 24 });
  });

  it("turns a counted quantity into the difference from on hand, either way", () => {
    expect(planAdjustment("count", "7", 10)).toEqual({ ok: true, delta: -3 });
    expect(planAdjustment("count", "12", 10)).toEqual({ ok: true, delta: 2 });
    expect(planAdjustment("count", "0", 10)).toEqual({ ok: true, delta: -10 });
    expect(planAdjustment("count", "10", 10)).toMatchObject({ ok: false, error: expect.stringContaining("nothing to correct") });
  });

  it("rejects signs, decimals, blanks and removing more than is on hand", () => {
    expect(planAdjustment("remove", "-3", 10).ok).toBe(false);
    expect(planAdjustment("add", "1.5", 10)).toMatchObject({ ok: false, error: "Use a whole number." });
    expect(planAdjustment("add", "1e2", 10).ok).toBe(false);
    expect(planAdjustment("remove", "", 10)).toMatchObject({ ok: false, error: "Enter a quantity." });
    expect(planAdjustment("remove", "11", 10)).toMatchObject({ ok: false, error: expect.stringContaining("at most") });
  });
});

describe("AdjustmentDialog", () => {
  it("uses a numeric keypad and never asks for a minus sign", () => {
    const { reason, quantity } = setup();
    fireEvent.change(reason, { target: { value: "WASTE" } });
    expect(quantity()).toHaveAttribute("inputmode", "numeric");
    fireEvent.change(quantity(), { target: { value: "3" } });
    expect(quantity()).toHaveAccessibleDescription("Will remove 3 cases — on hand after: 7 cases.");
  });

  it("sends a negative delta for waste typed as a positive amount", async () => {
    const { calls } = mockFetch({
      "POST /api/v1/inventory/inv-1/adjustments": [jsonResponse({ item: { ...item, on_hand: 7 }, movement: {} })],
    });
    const { reason, quantity, save, onSaved, onClose } = setup();
    fireEvent.change(reason, { target: { value: "WASTE" } });
    fireEvent.change(quantity(), { target: { value: "3" } });
    save();
    await waitFor(() => expect(onSaved).toHaveBeenCalledWith(expect.objectContaining({ on_hand: 7 })));
    expect(calls[0]!.body).toEqual({ quantity_delta: -3, reason: "WASTE", expected_on_hand: 10 });
    expect(onClose).toHaveBeenCalled();
  });

  it("sends a positive delta for a manual receipt", async () => {
    const { calls } = mockFetch({
      "POST /api/v1/inventory/inv-1/adjustments": [jsonResponse({ item: { ...item, on_hand: 15 }, movement: {} })],
    });
    const { reason, quantity, save, onSaved } = setup();
    fireEvent.change(reason, { target: { value: "MANUAL_RECEIPT" } });
    fireEvent.change(quantity(), { target: { value: "5" } });
    save();
    await waitFor(() => expect(onSaved).toHaveBeenCalled());
    expect(calls[0]!.body).toEqual({ quantity_delta: 5, reason: "MANUAL_RECEIPT" });
  });

  it("corrects a count down or up from the counted on-hand quantity", async () => {
    const { calls } = mockFetch({
      "POST /api/v1/inventory/inv-1/adjustments": [jsonResponse({ item, movement: {} })],
    });
    const { quantity, save, onSaved } = setup();
    fireEvent.change(quantity(), { target: { value: "6" } });
    expect(quantity()).toHaveAccessibleDescription("Will remove 4 cases — on hand after: 6 cases.");
    fireEvent.change(quantity(), { target: { value: "13" } });
    expect(quantity()).toHaveAccessibleDescription("Will add 3 cases — on hand after: 13 cases.");
    save();
    await waitFor(() => expect(onSaved).toHaveBeenCalled());
    expect(calls[0]!.body).toEqual({ quantity_delta: 3, reason: "COUNT_CORRECTION", expected_on_hand: 10 });
  });

  it("keeps the dialog open with the new on-hand when the stock changed underneath a count", async () => {
    const changed = { ...item, on_hand: 8, available: 8 };
    const { calls } = mockFetch({
      "POST /api/v1/inventory/inv-1/adjustments": [
        jsonResponse(
          { error: { code: "STOCK_CHANGED", message: "On-hand stock changed since you looked.", details: { on_hand: 8 } } },
          409,
        ),
        jsonResponse({ item: { ...changed, on_hand: 13 }, movement: {} }),
      ],
      "GET /api/v1/inventory": [jsonResponse({ items: [changed] })],
    });
    const onItemChanged = vi.fn();
    const onSaved = vi.fn();
    const onClose = vi.fn();
    render(<AdjustmentDialog item={item} onClose={onClose} onSaved={onSaved} onItemChanged={onItemChanged} />);
    const quantity = () => screen.getByRole("textbox", { name: /Counted on hand/ });
    fireEvent.change(quantity(), { target: { value: "13" } });
    fireEvent.click(screen.getByRole("button", { name: "Save adjustment" }));

    expect(await screen.findByText("The stock changed while you were adjusting it")).toBeInTheDocument();
    expect(screen.getByText(/it now has 8 cases on hand \(it was 10\)/)).toBeInTheDocument();
    expect(onItemChanged).toHaveBeenCalledWith(changed);
    expect(onSaved).not.toHaveBeenCalled();
    expect(onClose).not.toHaveBeenCalled();
    // The count is kept and the difference is now worked out from the new on-hand quantity.
    expect(quantity()).toHaveValue("13");
    expect(quantity()).toHaveAccessibleDescription("Will add 5 cases — on hand after: 13 cases.");
    expect(screen.queryByText("On-hand stock changed since you looked.")).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Save adjustment" }));
    await waitFor(() => expect(onSaved).toHaveBeenCalled());
    const adjustments = calls.filter((c) => c.method === "POST");
    expect(adjustments[0]!.body).toEqual({ quantity_delta: 3, reason: "COUNT_CORRECTION", expected_on_hand: 10 });
    expect(adjustments[1]!.body).toEqual({ quantity_delta: 5, reason: "COUNT_CORRECTION", expected_on_hand: 8 });
    expect(onClose).toHaveBeenCalled();
  });

  it("falls back to the on-hand quantity from the 409 when the item can't be re-read", async () => {
    mockFetch({
      "POST /api/v1/inventory/inv-1/adjustments": [
        jsonResponse({ error: { code: "STOCK_CHANGED", message: "Stock changed.", details: { on_hand: 4 } } }, 409),
      ],
      "GET /api/v1/inventory": [jsonResponse({ error: { code: "INTERNAL", message: "boom" } }, 500)],
    });
    const { reason, quantity, save } = setup();
    fireEvent.change(reason, { target: { value: "WASTE" } });
    fireEvent.change(quantity(), { target: { value: "3" } });
    save();

    expect(await screen.findByText(/it now has 4 cases on hand \(it was 10\)/)).toBeInTheDocument();
    expect(screen.getByRole("dialog")).toHaveAccessibleDescription("Currently 4 cases on hand · SKU HF-TK32");
  });

  it("announces a field error and focuses the field instead of submitting", async () => {
    const { fetchMock } = mockFetch({});
    const { reason, quantity, save } = setup();
    fireEvent.change(reason, { target: { value: "CONSUMPTION" } });
    fireEvent.change(quantity(), { target: { value: "-2" } });
    save();
    expect(screen.getByRole("alert")).toHaveTextContent("Enter a value from 1 to 1000000.");
    expect(quantity()).toHaveAttribute("aria-invalid", "true");
    await waitFor(() => expect(quantity()).toHaveFocus());
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("clears the quantity when switching between a counted total and an amount", () => {
    const { reason, quantity } = setup();
    fireEvent.change(quantity(), { target: { value: "8" } });
    fireEvent.change(reason, { target: { value: "WASTE" } });
    expect(quantity()).toHaveValue("");
    fireEvent.change(quantity(), { target: { value: "2" } });
    fireEvent.change(reason, { target: { value: "CONSUMPTION" } });
    expect(quantity()).toHaveValue("2");
  });
});
