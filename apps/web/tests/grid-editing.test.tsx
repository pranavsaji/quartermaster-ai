import { act, renderHook, screen, waitFor } from "@testing-library/react";
import type { CellValueChangedEvent, ValueParserParams } from "ag-grid-community";
import type { CatalogItemDto, InventoryItemDto, SupplierDto } from "@qm/contracts";
import { describe, expect, it, vi } from "vitest";
import { moneyParser, parseWholeNumber, useInlineEditor, wholeNumberParser } from "@/components/grid/editing";
import { InventoryGrid } from "@/components/inventory/InventoryGrid";
import { inventoryInput, saveInventoryEdit } from "@/components/inventory/inventory-edits";
import { CatalogGrid } from "@/components/suppliers/CatalogGrid";
import { saveCatalogEdit, unitPriceMinor } from "@/components/suppliers/catalog-edits";
import { deliveryTerms, SuppliersGrid, supplierStatusText } from "@/components/suppliers/SuppliersGrid";
import { inventoryItem, jsonResponse, mockFetch, renderWithSession } from "./helpers";

const parse = (parser: (p: ValueParserParams) => unknown, newValue: unknown, oldValue: unknown) =>
  parser({ newValue, oldValue } as ValueParserParams);

const listing: CatalogItemDto = {
  id: "cat-1",
  supplier_id: "sup-1",
  sku: "HRS-TK32",
  title: "Kraft containers 32 oz",
  description: "Fold-top",
  category: "food_packaging",
  inventory_item_id: null,
  pack_quantity: 250,
  unit_price_minor: 8000,
  currency: "USD",
  in_stock: true,
  recurring: false,
  quarantined: false,
  quarantine_reason: null,
  updated_at: "2026-11-09T10:00:00.000Z",
};

const supplierRow: SupplierDto = {
  id: "sup-1",
  name: "Harbor Restaurant Supply",
  approved: true,
  active: false,
  checkout_eligible: true,
  lead_time_days: 2,
  tax_rate_bps: 825,
  fee_terms: [{ code: "SHIP", label: "Delivery", kind: "SHIPPING", amount_minor: 899, waived_over_minor: null }],
  website: "https://harbor.example",
  description: null,
  quarantined: false,
  catalog_items: 7,
  data_source: "SANDBOX_SUPPLIER",
};

/** A cellValueChanged event as AG Grid raises it after an edit (the row already holds the new value). */
function changed<T>(data: T, field: string, oldValue: unknown, newValue: unknown) {
  const node = { setData: vi.fn() };
  const api = { flashCells: vi.fn() };
  const event = {
    colDef: { field },
    data: { ...data, [field]: newValue },
    oldValue,
    newValue,
    node,
    api,
  } as unknown as CellValueChangedEvent<T>;
  return { event, node, api };
}

describe("parsing typed values", () => {
  it("accepts whole numbers in range only, keeping the old value otherwise", () => {
    expect(parseWholeNumber("1,200", 0, 10_000)).toBe(1200);
    expect(parseWholeNumber(7, 1, 60)).toBe(7);
    for (const bad of ["-3", "2.5", "abc", "", "61", null]) expect(parseWholeNumber(bad, 1, 60)).toBeNull();
    const parser = wholeNumberParser(0, 100);
    expect(parse(parser, 12, 5)).toBe(12);
    expect(parse(parser, -1, 5)).toBe(5);
    expect(parse(parser, "1.5", 5)).toBe(5);
  });

  it("reads dollars typed into a price cell as minor units", () => {
    const parser = moneyParser("USD");
    expect(parse(parser, "$54.50", 100)).toBe(5450);
    expect(parse(parser, "1,234", 100)).toBe(123_400);
    expect(parse(parser, "0", 100)).toBe(100);
    expect(parse(parser, "12.345", 100)).toBe(100);
    expect(parse(parser, "abc", 100)).toBe(100);
  });
});

describe("saving stock grid edits", () => {
  it("records an on-hand edit as a count guarded by the quantity seen", async () => {
    const before = inventoryItem({ id: "inv-1", on_hand: 10 });
    const { calls } = mockFetch({ "POST /api/v1/inventory/inv-1/adjustments": [jsonResponse({ item: { ...before, on_hand: 14 } })] });
    const saved = await saveInventoryEdit(before, "on_hand", 14);
    expect(saved.on_hand).toBe(14);
    expect(calls[0]!.body).toEqual({
      quantity_delta: 4,
      reason: "COUNT_CORRECTION",
      note: "Counted in the stock grid",
      expected_on_hand: 10,
    });
    expect(calls[0]!.headers["idempotency-key"]).toBeTruthy();
  });

  it("saves thresholds with the item's full details", async () => {
    const before = inventoryItem({ id: "inv-1", safety_stock: 5 });
    const { calls } = mockFetch({ "PUT /api/v1/inventory/inv-1": [jsonResponse({ item: { ...before, safety_stock: 9 } })] });
    await saveInventoryEdit(before, "safety_stock", 9);
    expect(calls[0]!.body).toEqual({ ...inventoryInput(before), safety_stock: 9 });
  });

  it("refuses columns that are not editable", async () => {
    await expect(saveInventoryEdit(inventoryItem(), "name", 3)).rejects.toThrow(/can't be edited/);
  });
});

describe("saving catalog grid edits", () => {
  it("sends the new pack price in minor units with the rest of the listing", async () => {
    const { calls } = mockFetch({
      "PUT /api/v1/suppliers/sup-1/catalog/cat-1": [jsonResponse({ item: { ...listing, unit_price_minor: 7650 } })],
    });
    const saved = await saveCatalogEdit("sup-1", listing, "unit_price_minor", 7650);
    expect(saved.unit_price_minor).toBe(7650);
    expect(calls[0]!.body).toMatchObject({ sku: "HRS-TK32", unit_price_minor: 7650, pack_quantity: 250, in_stock: true });
  });

  it("never edits a quarantined listing and checks value types", async () => {
    await expect(saveCatalogEdit("sup-1", { ...listing, quarantined: true }, "unit_price_minor", 100)).rejects.toThrow(/Quarantined/);
    await expect(saveCatalogEdit("sup-1", listing, "in_stock", "yes")).rejects.toThrow(/isn't valid/);
    expect(unitPriceMinor(listing)).toBe(32);
  });
});

describe("useInlineEditor", () => {
  const item = inventoryItem({ id: "inv-1", name: "Containers", on_hand: 10, safety_stock: 5 });

  function setup(save: (before: InventoryItemDto, field: string, value: unknown) => Promise<InventoryItemDto>, rows = [item]) {
    const onSaved = vi.fn();
    const hook = renderHook(() =>
      useInlineEditor<InventoryItemDto>({ save, onSaved, rows, describe: (r) => r.name, label: (f) => (f === "on_hand" ? "On hand" : f) }),
    );
    return { hook, onSaved };
  }

  it("saves, shows the server's row, flashes the cell and remembers the edit for undo", async () => {
    const saved = { ...item, on_hand: 14, status: "OK" as const };
    const save = vi.fn().mockResolvedValue(saved);
    const { hook, onSaved } = setup(save);
    const { event, node, api } = changed(item, "on_hand", 10, 14);
    act(() => hook.result.current.onCellValueChanged(event));
    await waitFor(() => expect(onSaved).toHaveBeenCalledWith(saved));
    expect(save).toHaveBeenCalledWith({ ...item, on_hand: 10 }, "on_hand", 14);
    expect(node.setData).toHaveBeenCalledWith(saved);
    expect(api.flashCells).toHaveBeenCalledWith({ rowNodes: [node], columns: ["on_hand"] });
    expect(hook.result.current.status).toEqual({ tone: "allow", text: "Saved on hand for Containers." });
    expect(hook.result.current.lastEdit).toMatchObject({ field: "on_hand", from: 10, to: 14 });
  });

  it("puts the old value back and explains a refusal (e.g. stock changed meanwhile)", async () => {
    const { ApiRequestError } = await import("@/lib/http");
    const refusal = new ApiRequestError({ status: 409, code: "STOCK_CHANGED", message: "Stock changed since you opened this item." });
    const { hook, onSaved } = setup(vi.fn().mockRejectedValue(refusal));
    const { event, node, api } = changed(item, "on_hand", 10, 3);
    act(() => hook.result.current.onCellValueChanged(event));
    await waitFor(() => expect(hook.result.current.status?.tone).toBe("block"));
    expect(node.setData).toHaveBeenCalledWith({ ...item, on_hand: 10 });
    expect(hook.result.current.status?.text).toBe("On hand for Containers was not saved: Stock changed since you opened this item.");
    expect(onSaved).not.toHaveBeenCalled();
    expect(api.flashCells).not.toHaveBeenCalled();
    expect(hook.result.current.lastEdit).toBeNull();
  });

  it("ignores events that did not change the value", () => {
    const save = vi.fn();
    const { hook } = setup(save);
    act(() => hook.result.current.onCellValueChanged(changed(item, "on_hand", 10, 10).event));
    expect(save).not.toHaveBeenCalled();
  });

  it("undoes the last edit by saving the previous value again", async () => {
    const after = { ...item, safety_stock: 8 };
    const save = vi
      .fn()
      .mockResolvedValueOnce(after)
      .mockResolvedValueOnce({ ...after, safety_stock: 5 });
    const { hook, onSaved } = setup(save, [after]);
    act(() => hook.result.current.onCellValueChanged(changed(item, "safety_stock", 5, 8).event));
    await waitFor(() => expect(hook.result.current.lastEdit).not.toBeNull());
    await act(() => hook.result.current.undo());
    expect(save).toHaveBeenLastCalledWith(after, "safety_stock", 5);
    expect(onSaved).toHaveBeenLastCalledWith({ ...after, safety_stock: 5 });
    expect(hook.result.current.lastEdit).toBeNull();
    expect(hook.result.current.status?.text).toBe("Undid the safety_stock change for Containers.");
  });
});

describe("editable grids", () => {
  it("marks stock cells editable for managers, with undo and CSV export", async () => {
    renderWithSession(
      <InventoryGrid items={[inventoryItem()]} canAdjust onAdjust={vi.fn()} canEdit onEdit={vi.fn()} onItemSaved={vi.fn()} />,
    );
    await waitFor(() => expect(document.querySelectorAll(".qm-editable")).toHaveLength(3));
    expect(screen.getByRole("button", { name: "Undo last edit" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "Export CSV" })).toBeEnabled();
    expect(screen.getByText(/each edit is saved and audited at once/)).toBeInTheDocument();
  });

  it("is read-only for viewers", async () => {
    renderWithSession(<InventoryGrid items={[inventoryItem()]} canAdjust={false} onAdjust={vi.fn()} />, { role: "VIEWER" });
    await waitFor(() => expect(screen.getByText("Takeaway containers 32oz")).toBeInTheDocument());
    expect(document.querySelectorAll(".qm-editable")).toHaveLength(0);
    expect(screen.queryByRole("button", { name: "Undo last edit" })).not.toBeInTheDocument();
  });

  it("lets managers edit price, pack size and availability, except on quarantined listings", async () => {
    renderWithSession(
      <CatalogGrid
        supplierId="sup-1"
        items={[listing, { ...listing, id: "cat-2", sku: "QS-BAD", quarantined: true, quarantine_reason: "instruction_override" }]}
        stockNames={new Map()}
        currency="USD"
        onEdit={vi.fn()}
        onItemSaved={vi.fn()}
      />,
    );
    await waitFor(() => expect(screen.getByText("QS-BAD")).toBeInTheDocument());
    expect(document.querySelectorAll(".qm-editable")).toHaveLength(3);
    expect(screen.getByText("Quarantined: instruction_override")).toBeInTheDocument();
    expect(screen.getAllByText("$80.00").length).toBeGreaterThan(0);
  });

  it("shows the catalog read-only without an edit handler", async () => {
    renderWithSession(<CatalogGrid supplierId="sup-1" items={[listing]} stockNames={new Map()} currency="USD" onItemSaved={vi.fn()} />, {
      role: "VIEWER",
    });
    await waitFor(() => expect(screen.getByText("HRS-TK32")).toBeInTheDocument());
    expect(document.querySelectorAll(".qm-editable")).toHaveLength(0);
    expect(screen.queryByRole("button", { name: "Edit HRS-TK32" })).not.toBeInTheDocument();
  });
});

describe("SuppliersGrid", () => {
  it("lists suppliers in a searchable, exportable grid", async () => {
    renderWithSession(<SuppliersGrid suppliers={[supplierRow]} currency="USD" />);
    expect(await screen.findByRole("link", { name: "Harbor Restaurant Supply" })).toHaveAttribute("href", "/suppliers/sup-1");
    expect(screen.getByRole("region", { name: "Suppliers" })).toBeInTheDocument();
    expect(screen.getByRole("searchbox", { name: "Search suppliers" })).toBeInTheDocument();
    expect(screen.getByText("1 row")).toBeInTheDocument();
    expect(screen.getByText("8.25%")).toBeInTheDocument();
  });

  it("describes delivery terms and status as text for search and export", () => {
    expect(deliveryTerms(supplierRow, "USD")).toBe("$8.99");
    expect(deliveryTerms({ ...supplierRow, fee_terms: [] }, "USD")).toBe("Free");
    expect(supplierStatusText(supplierRow)).toBe("Approved, Inactive");
  });
});
