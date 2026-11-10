import { describe, expect, it } from "vitest";
import { emptyCatalogForm, formToCatalogInput } from "@/components/suppliers/catalog-form-state";
import { emptyItemForm, formToCreateItem, formToUpdateItem, itemToForm, parseKeywords } from "@/components/inventory/item-form-state";
import {
  bpsToPercent,
  emptyFee,
  emptySupplierForm,
  feeCode,
  formToSupplierInput,
  percentToBps,
  supplierToForm,
} from "@/components/suppliers/supplier-form-state";
import { inventoryItem } from "./helpers";

describe("supplier form", () => {
  it("converts tax percentages to basis points and back", () => {
    expect(percentToBps("8.25")).toBe(825);
    expect(percentToBps("8.5%")).toBe(850);
    expect(percentToBps("0")).toBe(0);
    expect(percentToBps("8.255")).toBeNull();
    expect(percentToBps("-1")).toBeNull();
    expect(bpsToPercent(825)).toBe("8.25");
    expect(bpsToPercent(800)).toBe("8");
  });

  it("sends fees in minor units with derived, unique codes", () => {
    const form = {
      ...emptySupplierForm(),
      name: "  Bayside Produce ",
      website: "https://bayside.example",
      leadTimeDays: "3",
      taxPercent: "8.25",
      fees: [
        { ...emptyFee("SHIPPING"), label: "Cold-chain delivery", amount: "12.50", waivedOver: "150" },
        { ...emptyFee("FEE"), label: "Cold-chain delivery", amount: "1,200.00", waivedOver: "" },
      ],
    };
    const result = formToSupplierInput(form, "USD");
    expect(result).toEqual({
      ok: true,
      value: {
        name: "Bayside Produce",
        website: "https://bayside.example",
        description: null,
        lead_time_days: 3,
        tax_rate_bps: 825,
        active: true,
        checkout_eligible: true,
        fee_terms: [
          { code: "COLD_CHAIN_DELIVERY", label: "Cold-chain delivery", kind: "SHIPPING", amount_minor: 1250, waived_over_minor: 15000 },
          { code: "COLD_CHAIN_DELIVERY_2", label: "Cold-chain delivery", kind: "FEE", amount_minor: 120000, waived_over_minor: null },
        ],
      },
    });
  });

  it("keeps existing fee codes when editing", () => {
    const form = supplierToForm(
      {
        name: "Harbor",
        website: null,
        description: null,
        lead_time_days: 2,
        tax_rate_bps: 825,
        active: true,
        checkout_eligible: true,
        fee_terms: [{ code: "SHIP_STD", label: "Standard delivery", kind: "SHIPPING", amount_minor: 899, waived_over_minor: 15000 }],
      },
      "USD",
    );
    expect(form.fees[0]).toMatchObject({ code: "SHIP_STD", amount: "8.99", waivedOver: "150.00" });
    const result = formToSupplierInput({ ...form, fees: [{ ...form.fees[0]!, label: "Renamed" }] }, "USD");
    expect(result.ok && result.value.fee_terms[0]!.code).toBe("SHIP_STD");
  });

  it("reports what to fix for each field", () => {
    const result = formToSupplierInput(
      {
        ...emptySupplierForm(),
        name: "X",
        website: "bayside",
        leadTimeDays: "1.5",
        taxPercent: "45",
        fees: [{ ...emptyFee("FEE"), label: "", amount: "abc", waivedOver: "-3" }],
      },
      "USD",
    );
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(Object.keys(result.errors).sort()).toEqual(
      ["fees.0.amount", "fees.0.label", "fees.0.waivedOver", "leadTimeDays", "name", "taxPercent", "website"].sort(),
    );
  });

  it("derives a fallback fee code from the kind when the label has no letters", () => {
    expect(feeCode("€€", "SHIPPING", new Set())).toBe("SHIPPING");
    expect(feeCode("!!", "FEE", new Set(["FEE"]))).toBe("FEE_2");
  });
});

describe("catalog item form", () => {
  it("sends the pack price in minor units and an unlinked item as null", () => {
    const result = formToCatalogInput(
      { ...emptyCatalogForm(), sku: "BP-OIL-18", title: "Canola oil 18 L", packQuantity: "18", unitPrice: "46.50" },
      "USD",
    );
    expect(result).toEqual({
      ok: true,
      value: {
        sku: "BP-OIL-18",
        title: "Canola oil 18 L",
        description: "",
        category: "food_packaging",
        inventory_item_id: null,
        pack_quantity: 18,
        unit_price_minor: 4650,
        in_stock: true,
        recurring: false,
      },
    });
  });

  it("rejects a zero price, a fractional pack and a bad SKU", () => {
    const result = formToCatalogInput(
      { ...emptyCatalogForm(), sku: "has space", title: "Oil", packQuantity: "1.5", unitPrice: "0" },
      "USD",
    );
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.errors).toMatchObject({
      sku: expect.stringContaining("SKU"),
      packQuantity: "Use a whole number.",
      unitPrice: expect.stringContaining("price"),
    });
  });
});

describe("stock item form", () => {
  it("normalises keywords", () => {
    expect(parseKeywords(" Oil, fryer oil ,, OIL , canola")).toEqual(["oil", "fryer oil", "canola"]);
  });

  it("creates with on-hand stock and updates without it", () => {
    const form = {
      ...emptyItemForm(),
      sku: "ING-OIL",
      name: "Frying oil",
      unit: "liter",
      onHand: "14",
      searchQuery: "canola oil jug",
      keywords: "oil",
    };
    const created = formToCreateItem(form);
    expect(created).toMatchObject({
      ok: true,
      value: { on_hand: 14, keywords: ["oil"], lead_time_days_override: null, preferred_supplier_id: null },
    });
    const updated = formToUpdateItem({ ...form, leadTimeOverride: "4" });
    expect(updated.ok && updated.value).not.toHaveProperty("on_hand");
    expect(updated.ok && updated.value.lead_time_days_override).toBe(4);
  });

  it("prefills editable details from the item", () => {
    expect(itemToForm(inventoryItem({ lead_time_days_override: null }))).toMatchObject({
      searchQuery: "disposable takeout food containers 32 oz",
      keywords: "takeaway, containers",
      leadTimeOverride: "",
    });
    expect(
      itemToForm(inventoryItem({ search_query: "takeout boxes", keywords: ["boxes", "to-go"], lead_time_days_override: 2 })),
    ).toMatchObject({
      searchQuery: "takeout boxes",
      keywords: "boxes, to-go",
      leadTimeOverride: "2",
    });
  });

  it("asks for a market search phrase", () => {
    const result = formToCreateItem({ ...emptyItemForm(), sku: "A1", name: "Thing", searchQuery: "" });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.errors.searchQuery).toContain("market research");
  });
});
