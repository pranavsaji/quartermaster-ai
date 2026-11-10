import type { CandidateDto, InvoiceDto, MarketReferenceDto } from "@qm/contracts";
import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import type { ReactElement } from "react";
import { beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { AnalyticsPage, stockCoverRows } from "@/app/(console)/analytics/AnalyticsPage";
import { InvoicesGrid, invoiceTotals } from "@/components/orders/InvoicesGrid";
import { OrdersGrid, orderTotals, type OrderRow } from "@/components/orders/OrdersGrid";
import { CandidateTable, comparisonRows } from "@/components/procurement/CandidateTable";
import { clearSharedCache } from "@/lib/shared-cache";
import { analyticsSummary, inventoryItem, jsonResponse, mockFetch, purchaseOrder, renderWithSession } from "./helpers";

// AG Charts draws on a canvas jsdom does not have: record the options each chart receives instead.
const charts: { series: { type: string }[]; data: unknown[] }[] = [];
vi.mock("ag-charts-react", () => ({
  AgCharts: ({ options }: { options: { series: { type: string }[]; data: unknown[] } }): ReactElement => {
    charts.push(options);
    return <div data-testid="chart" data-series={options.series.map((s) => s.type).join(",")} />;
  },
}));

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

const order = (overrides: Partial<OrderRow>): OrderRow => ({ ...purchaseOrder(), delivery_view: null, ...overrides }) as OrderRow;

describe("totals rows", () => {
  it("counts every order but only paid spend", () => {
    const rows = [
      order({ id: "a", status: "PAID", total_minor: 10_000 }),
      order({ id: "b", status: "FULFILLED", total_minor: 2_500 }),
      order({ id: "c", status: "PROPOSED", total_minor: 99_999 }),
    ];
    expect(orderTotals(rows)).toEqual({ orders: 3, paid: 2, paidMinor: 12_500, currency: "USD" });
    expect(orderTotals([])).toMatchObject({ orders: 0, paidMinor: 0 });
  });

  it("totals invoices and counts blocked settlements", () => {
    const inv = (id: string, total: number, allowed: boolean) =>
      ({ id, total_minor: total, settlement_allowed: allowed, currency: "USD" }) as InvoiceDto;
    expect(invoiceTotals([inv("1", 500, true), inv("2", 700, false)])).toEqual({
      invoices: 2,
      totalMinor: 1_200,
      blocked: 1,
      currency: "USD",
    });
  });

  it("pins a paid total under the orders grid that follows the search", async () => {
    const rows = [
      order({ id: "a", number: "PO-1", supplier_name: "Harbor Restaurant Supply", status: "PAID", total_minor: 17_320 }),
      order({ id: "b", number: "PO-2", supplier_name: "Coastal Foods", status: "PROPOSED", total_minor: 5_000 }),
    ];
    render(<OrdersGrid rows={rows} canManage={false} canInvoice={false} onReceive={vi.fn()} onDelay={vi.fn()} onInvoice={vi.fn()} />);
    expect(await screen.findByText("Total (paid)")).toBeInTheDocument();
    expect(screen.getByText("2 orders · 1 paid")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Export CSV" })).toBeEnabled();

    fireEvent.change(screen.getByRole("searchbox", { name: /Search purchase orders/i }), { target: { value: "Coastal" } });
    await waitFor(() => expect(screen.getByText("1 order · 0 paid")).toBeInTheDocument());
    expect(screen.getByText("1 of 2")).toBeInTheDocument();
  });

  // jsdom has no width, so AG Grid renders only its first columns: DOM checks stay on those.
  it("pins an invoice total that counts blocked settlements", async () => {
    const invoices = [
      {
        id: "i1",
        invoice_number: "INV-1",
        supplier_id: "s1",
        purchase_order_id: null,
        invoice_date: "2026-11-10",
        currency: "USD",
        total_minor: 17_320,
        status: "MATCHED",
        settlement_allowed: true,
        matches: [],
        created_at: "2026-11-10T10:00:00.000Z",
      },
    ] as unknown as InvoiceDto[];
    render(<InvoicesGrid invoices={invoices} supplierNames={new Map([["s1", "Harbor"]])} poNumbers={new Map()} />);
    expect(await screen.findByText("1 invoice · 0 blocked")).toBeInTheDocument();
    expect(screen.getByText("Total")).toBeInTheDocument();
    expect(screen.getByText("1 row")).toBeInTheDocument();
  });
});

const candidate = (overrides: Partial<CandidateDto>): CandidateDto => ({
  id: "c",
  inventory_item_id: "item-oil",
  supplier_id: "s",
  supplier_name: "Supplier",
  supplier_approved: true,
  checkout_eligible: true,
  catalog_item_id: "cat",
  sku: "SKU",
  title: "Canola oil 18 L",
  pack_quantity: 18,
  packs: 1,
  units: 18,
  item_subtotal_minor: 4_650,
  shipping_minor: 0,
  tax_minor: 0,
  fees_minor: 0,
  delivered_total_minor: 4_650,
  delivered_unit_cost_minor: 258,
  lead_time_days: 2,
  rank: 1,
  eligible: true,
  ineligible_reasons: [],
  quarantined: false,
  data_source: "SANDBOX_SUPPLIER",
  ...overrides,
});

describe("supplier comparison", () => {
  const candidates = [
    candidate({ id: "oil-harbor", supplier_name: "Harbor", delivered_unit_cost_minor: 330, item_subtotal_minor: 5_200, rank: 2 }),
    candidate({ id: "oil-coastal", supplier_name: "Coastal", delivered_unit_cost_minor: 300, rank: 1 }),
    candidate({
      id: "box-quick",
      inventory_item_id: "item-box",
      supplier_name: "QuickServe",
      delivered_unit_cost_minor: 20,
      eligible: false,
      quarantined: true,
      rank: null,
      ineligible_reasons: ["QUARANTINED_SOURCE"],
    }),
    candidate({ id: "box-harbor", inventory_item_id: "item-box", supplier_name: "Harbor", delivered_unit_cost_minor: 35, rank: 1 }),
  ];
  const names = new Map([
    ["item-oil", "Canola oil"],
    ["item-box", "Takeaway boxes"],
  ]);
  const market: MarketReferenceDto[] = [
    { inventory_item_id: "item-oil", reference_unit_price_minor: 250, sample_size: 3, observed_at: null, status: "AVAILABLE", quotes: [] },
  ];

  it("groups by item, puts eligible offers first and cheapest first, and marks each item's best", () => {
    const rows = comparisonRows(candidates, names, market);
    expect(rows.map((r) => r.id)).toEqual(["oil-coastal", "oil-harbor", "box-harbor", "box-quick"]);
    expect(rows.filter((r) => r.best).map((r) => r.id)).toEqual(["oil-coastal", "box-harbor"]);
    expect(rows.filter((r) => r.group_start).map((r) => r.id)).toEqual(["oil-coastal", "box-harbor"]);
    // Coastal: 4650 / 18 = 258.3 per unit vs a 250 reference.
    expect(rows[0]!.market_premium_pct).toBe(3.3);
    expect(rows[2]!.market_premium_pct).toBeNull();
  });

  it("never marks a best offer for an item with no eligible offer", () => {
    const rows = comparisonRows([candidates[2]!], names);
    expect(rows[0]).toMatchObject({ best: false, group_start: true });
  });

  it("labels each item's best offer and offers search and export", async () => {
    render(<CandidateTable candidates={candidates} itemNames={names} currency="USD" market={market} />);
    expect(await screen.findAllByText("Best offer")).toHaveLength(2);
    expect(screen.getByRole("button", { name: "Export CSV" })).toBeEnabled();
    expect(screen.getByText("4 rows")).toBeInTheDocument();
  });
});

describe("analytics charts", () => {
  // The analytics summary is a shared read cached across pages; each test starts uncached.
  beforeEach(() => clearSharedCache());

  it("orders stock cover from least to most and leaves out items without usage", () => {
    const rows = stockCoverRows([
      inventoryItem({ id: "a", name: "Oil", days_of_cover: 1.24, coverage_days: 3, lead_time_days: 2, status: "CRITICAL" }),
      inventoryItem({ id: "b", name: "Boxes", days_of_cover: 6, coverage_days: 3, lead_time_days: 2, status: "OK" }),
      inventoryItem({ id: "c", name: "New", days_of_cover: null }),
    ]);
    expect(rows).toEqual([
      { item: "Oil", days: 1.2, target: 5, status: "CRITICAL" },
      { item: "Boxes", days: 6, target: 5, status: "OK" },
    ]);
  });

  it("draws spend by supplier, the decisions donut and stock cover", async () => {
    charts.length = 0;
    mockFetch({
      "GET /api/v1/analytics/summary": [
        jsonResponse(
          analyticsSummary({
            spend_by_supplier: [{ supplier: "Harbor Restaurant Supply", captured_minor: 17_320, orders: 1 }],
            decisions_by_kind: [
              { decision: "ALLOW", count: 3 },
              { decision: "REVIEW_REQUIRED", count: 0 },
              { decision: "BLOCK", count: 2 },
            ],
          }),
        ),
      ],
      "GET /api/v1/inventory": [jsonResponse({ items: [inventoryItem({ days_of_cover: 2, status: "LOW" })] })],
    });
    renderWithSession(<AnalyticsPage />);
    const supplierCard = await screen.findByLabelText("Spend by supplier");
    expect(within(supplierCard).getByText("Harbor Restaurant Supply")).toBeInTheDocument();
    await waitFor(() => expect(within(screen.getByLabelText("Days of stock cover")).getByTestId("chart")).toBeInTheDocument());
    const donut = charts.find((c) => c.series[0]?.type === "donut");
    // Zero-count decisions are left out of the donut rather than drawn as empty sectors.
    expect(donut?.data).toHaveLength(2);
    expect(charts.some((c) => c.series.map((s) => s.type).join() === "bar,line")).toBe(true);
  });

  it("shows empty states when there is nothing to chart", async () => {
    mockFetch({
      "GET /api/v1/analytics/summary": [jsonResponse(analyticsSummary())],
      "GET /api/v1/inventory": [jsonResponse({ items: [] })],
    });
    renderWithSession(<AnalyticsPage />);
    expect(await screen.findByText("No captured spend yet")).toBeInTheDocument();
    expect(screen.getByText("No usage recorded yet")).toBeInTheDocument();
  });
});
