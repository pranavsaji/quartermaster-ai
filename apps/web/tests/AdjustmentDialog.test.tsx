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
    expect(calls[0]!.body).toEqual({ quantity_delta: -3, reason: "WASTE" });
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
    expect(calls[0]!.body).toEqual({ quantity_delta: 3, reason: "COUNT_CORRECTION" });
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
