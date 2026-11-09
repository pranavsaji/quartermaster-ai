import type { InventoryItemDto } from "@qm/contracts";
import { render, screen, waitFor } from "@testing-library/react";
import { beforeAll, describe, expect, it, vi } from "vitest";
import { ActionCell, suppressControlKeys } from "@/components/grid/ActionCell";
import { InventoryGrid } from "@/components/inventory/InventoryGrid";

beforeAll(() => {
  // jsdom has no layout APIs; AG Grid only needs them to exist.
  vi.stubGlobal(
    "ResizeObserver",
    class {
      observe() {}
      unobserve() {}
      disconnect() {}
    },
  );
});

function cellWith(...controls: string[]) {
  const cell = document.createElement("div");
  cell.className = "ag-cell";
  cell.tabIndex = -1;
  cell.innerHTML = controls.map((label) => `<button>${label}</button>`).join("");
  document.body.append(cell);
  return { cell, buttons: Array.from(cell.querySelectorAll("button")) };
}

const keydown = (target: HTMLElement, key: string, shiftKey = false) => {
  const event = new KeyboardEvent("keydown", { key, shiftKey, bubbles: true });
  Object.defineProperty(event, "target", { value: target });
  return suppressControlKeys({ event, editing: false } as never);
};

describe("grid cell controls", () => {
  it("lets Enter/Space reach a focused button instead of the grid", () => {
    const { cell, buttons } = cellWith("Receive", "Delay");
    expect(keydown(buttons[0]!, "Enter")).toBe(true);
    expect(keydown(buttons[0]!, " ")).toBe(true);
    // On the cell itself the grid keeps its own keyboard handling.
    expect(keydown(cell, "Enter")).toBe(false);
    expect(keydown(buttons[0]!, "ArrowRight")).toBe(false);
  });

  it("tabs between controls inside a cell before the grid moves on", () => {
    const { buttons } = cellWith("Receive", "Delay", "Invoice");
    expect(keydown(buttons[0]!, "Tab")).toBe(true);
    expect(keydown(buttons[2]!, "Tab")).toBe(false);
    expect(keydown(buttons[1]!, "Tab", true)).toBe(true);
    expect(keydown(buttons[0]!, "Tab", true)).toBe(false);
  });

  it("moves focus to the first control when the grid focuses the cell", () => {
    const eGridCell = document.createElement("div");
    eGridCell.tabIndex = -1;
    document.body.append(eGridCell);
    render(
      <ActionCell eGridCell={eGridCell}>
        <button type="button">Adjust</button>
      </ActionCell>,
      { container: eGridCell },
    );
    eGridCell.focus();
    expect(screen.getByRole("button", { name: "Adjust" })).toHaveFocus();
  });
});

describe("InventoryGrid", () => {
  it("renders with the registered AG Grid modules only (no missing-module errors)", async () => {
    const errors = vi.spyOn(console, "error").mockImplementation(() => undefined);
    const warnings = vi.spyOn(console, "warn").mockImplementation(() => undefined);
    const item: InventoryItemDto = {
      id: "i-1",
      sku: "OIL-20L",
      name: "Fryer oil 20 L",
      category: "cooking_ingredients",
      unit: "jug",
      on_hand: 3,
      inbound_confirmed: 0,
      committed: 0,
      available: 3,
      avg_daily_usage: 1.2,
      lead_time_days: 2,
      safety_stock: 2,
      coverage_days: 7,
      reorder_point: 5,
      days_of_cover: 2.5,
      status: "LOW",
      preferred_supplier_id: null,
      data_source: "SYNTHETIC",
    } as InventoryItemDto;
    render(<InventoryGrid items={[item]} canAdjust onAdjust={vi.fn()} />);

    await waitFor(() => expect(screen.getByRole("button", { name: "Adjust Fryer oil 20 L" })).toBeInTheDocument());
    const agMessages = [...errors.mock.calls, ...warnings.mock.calls]
      .flat()
      .map(String)
      .filter((m) => /AG Grid/.test(m));
    expect(agMessages).toEqual([]);
  });
});
