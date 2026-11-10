import { fireEvent, screen, waitFor } from "@testing-library/react";
import type { SupplierDto } from "@qm/contracts";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { DeliveriesPage } from "@/app/(console)/deliveries/DeliveriesPage";
import type { DropRequest, ScheduleViewProps } from "@/components/deliveries/BryntumScheduleView";
import { buildSchedule, dayStart, expectedDayFromEnd, initialSpan, isoDay, rescheduleError, statusColor } from "@/lib/delivery-schedule";
import { delivery, jsonResponse, mockFetch, purchaseOrder, renderWithSession } from "./helpers";

// jsdom cannot render Bryntum; the page is tested against a stand-in that exposes the props.
let lastView: ScheduleViewProps | null = null;
vi.mock("@/components/deliveries/DeliverySchedule", () => ({
  DeliverySchedule: (props: ScheduleViewProps) => {
    lastView = props;
    return <div data-testid="bryntum">{props.schedule.events.length} deliveries</div>;
  },
}));

const supplier = (overrides: Partial<SupplierDto> = {}): SupplierDto => ({
  id: "sup-1",
  name: "Harbor Foodservice",
  approved: true,
  active: true,
  checkout_eligible: true,
  lead_time_days: 2,
  tax_rate_bps: 0,
  fee_terms: [],
  website: null,
  description: null,
  quarantined: false,
  catalog_items: 3,
  data_source: "SANDBOX_SUPPLIER",
  ...overrides,
});

describe("buildSchedule", () => {
  const orders = [
    purchaseOrder({ id: "po-1", number: "PO-1001", created_at: "2026-11-09T10:00:00.000Z", total_minor: 17320 }),
    purchaseOrder({ id: "po-2", number: "PO-1002", supplier_id: "sup-2", created_at: "2026-11-20T10:00:00.000Z" }),
  ];
  const suppliers = [supplier(), supplier({ id: "sup-2", name: "Coastal Foods", approved: false })];

  it("puts one row per supplier with deliveries and one bar per delivery", () => {
    const s = buildSchedule({
      deliveries: [
        delivery({ id: "d1", expected_date: "2026-11-12" }),
        delivery({ id: "d2", purchase_order_id: "po-2", supplier_id: "sup-2", expected_date: "2026-11-15" }),
      ],
      orders,
      suppliers,
      canManage: true,
      timeZone: "America/New_York",
    });
    expect(s.resources).toEqual([
      { id: "sup-2", name: "Coastal Foods", approved: false, deliveries: 1 },
      { id: "sup-1", name: "Harbor Foodservice", approved: true, deliveries: 1 },
    ]);
    const d1 = s.events.find((e) => e.id === "d1")!;
    // From the day the order was placed to the end of the expected day.
    expect(isoDay(d1.startDate)).toBe("2026-11-09");
    expect(isoDay(d1.endDate)).toBe("2026-11-13");
    expect(d1).toMatchObject({ resourceId: "sup-1", poNumber: "PO-1001", totalMinor: 17320, draggable: true, eventColor: "blue" });
    // An order placed after its expected date still gets a one-day bar.
    const d2 = s.events.find((e) => e.id === "d2")!;
    expect(isoDay(d2.startDate)).toBe("2026-11-14");
  });

  it("shades a delayed delivery's original day and locks finished or read-only bars", () => {
    const s = buildSchedule({
      deliveries: [
        delivery({
          id: "late",
          status: "DELAYED",
          original_expected_date: "2026-11-12",
          expected_date: "2026-11-14",
          delay_reason: "Truck",
        }),
        delivery({ id: "done", status: "DELIVERED" }),
      ],
      orders,
      suppliers,
      canManage: true,
    });
    expect(s.ranges).toHaveLength(1);
    expect(s.ranges[0]).toMatchObject({ id: "original-late", resourceId: "sup-1", timeRangeColor: "orange" });
    expect(isoDay(s.ranges[0]!.startDate)).toBe("2026-11-12");
    expect(s.events.find((e) => e.id === "late")).toMatchObject({ draggable: true, eventColor: "orange", delayReason: "Truck" });
    expect(s.events.find((e) => e.id === "done")).toMatchObject({ draggable: false, eventColor: "green" });
    const readOnly = buildSchedule({ deliveries: [delivery()], orders, suppliers, canManage: false });
    expect(readOnly.events[0]!.draggable).toBe(false);
  });

  it("falls back for unknown orders and suppliers", () => {
    const s = buildSchedule({
      deliveries: [delivery({ purchase_order_id: "gone", supplier_id: "x" })],
      orders: [],
      suppliers: [],
      canManage: true,
    });
    expect(s.resources[0]!.name).toBe("Unknown supplier");
    expect(s.events[0]).toMatchObject({ poNumber: "—", totalMinor: null });
    expect(statusColor("CANCELLED")).toBe("gray");
  });
});

describe("drag rules and dates", () => {
  it("only moves open deliveries later, never into the past", () => {
    const open = { status: "SCHEDULED" as const, expected_date: "2026-11-12" };
    expect(rescheduleError(open, "2026-11-14", "2026-11-10")).toBeNull();
    expect(rescheduleError(open, "2026-11-12", "2026-11-10")).toMatch(/later/);
    expect(rescheduleError(open, "2026-11-11", "2026-11-10")).toMatch(/later/);
    expect(rescheduleError({ status: "DELAYED", expected_date: "2026-11-01" }, "2026-11-05", "2026-11-10")).toMatch(/past/);
    expect(rescheduleError({ status: "DELIVERED", expected_date: "2026-11-12" }, "2026-11-20", "2026-11-10")).toMatch(/Only scheduled/);
  });

  it("converts between calendar days and Bryntum's exclusive end dates", () => {
    expect(isoDay(dayStart("2026-03-08"))).toBe("2026-03-08");
    expect(expectedDayFromEnd(dayStart("2026-11-15"))).toBe("2026-11-14");
    const two = initialSpan("2026-11-10", "2w");
    expect([isoDay(two.start), isoDay(two.end)]).toEqual(["2026-11-07", "2026-11-21"]);
    const month = initialSpan("2026-11-10", "month");
    expect([isoDay(month.start), isoDay(month.end)]).toEqual(["2026-11-03", "2026-12-08"]);
  });
});

describe("DeliveriesPage", () => {
  beforeEach(() => {
    vi.useFakeTimers({ toFake: ["Date"] });
    vi.setSystemTime(new Date("2026-11-10T15:00:00.000Z"));
    lastView = null;
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  const routes = (deliveries = [delivery()]) => ({
    "GET /api/v1/deliveries": [jsonResponse({ items: deliveries })],
    "GET /api/v1/purchase-orders": [jsonResponse({ items: [purchaseOrder({ status: "PAID" })], next_cursor: null })],
    "GET /api/v1/suppliers": [jsonResponse({ items: [supplier()] })],
  });

  async function drop(newExpected: string) {
    await waitFor(() => expect(lastView).not.toBeNull());
    const finalize = vi.fn();
    const request: DropRequest = { eventId: "del-1", newExpected, finalize };
    lastView!.onDropRequest(request);
    return finalize;
  }

  it("asks for a reason, records the delay and keeps the bar where it was dropped", async () => {
    const { calls } = mockFetch({
      ...routes(),
      "POST /api/v1/deliveries/del-1/delay": [
        jsonResponse({ delivery: delivery({ status: "DELAYED", expected_date: "2026-11-15", delay_reason: "Supplier short-staffed" }) }),
      ],
    });
    renderWithSession(<DeliveriesPage />, { role: "MANAGER" });
    expect(await screen.findByTestId("bryntum")).toHaveTextContent("1 deliveries");
    expect(lastView!.readOnly).toBe(false);
    const finalize = await drop("2026-11-15");

    expect(await screen.findByRole("dialog", { name: "Report delay for PO-1001" })).toBeInTheDocument();
    expect(screen.getByLabelText(/New expected date/)).toHaveValue("2026-11-15");
    fireEvent.change(screen.getByLabelText(/Reason/), { target: { value: "Supplier short-staffed" } });
    fireEvent.click(screen.getByRole("button", { name: "Report delay" }));

    await waitFor(() => expect(finalize).toHaveBeenCalledWith(true));
    expect(calls.find((c) => c.method === "POST")!.body).toEqual({ new_expected_date: "2026-11-15", reason: "Supplier short-staffed" });
    expect(await screen.findByText(/PO-1001 now expected/)).toBeInTheDocument();
    expect(finalize).toHaveBeenCalledTimes(1);
  });

  it("puts the bar back when the API refuses or the dialog is cancelled", async () => {
    mockFetch({
      ...routes(),
      "POST /api/v1/deliveries/del-1/delay": [
        jsonResponse({ error: { code: "FORBIDDEN", message: "Synthetic delivery actions are disabled." } }, 403),
      ],
    });
    renderWithSession(<DeliveriesPage />, { role: "OWNER" });
    const finalize = await drop("2026-11-16");
    fireEvent.change(await screen.findByLabelText(/Reason/), { target: { value: "Late truck" } });
    fireEvent.click(screen.getByRole("button", { name: "Report delay" }));
    expect(await screen.findByText("Synthetic delivery actions are disabled.")).toBeInTheDocument();
    expect(finalize).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole("button", { name: "Cancel" }));
    await waitFor(() => expect(finalize).toHaveBeenCalledWith(false));
  });

  it("rejects a drop the API would refuse without opening the dialog", async () => {
    mockFetch(routes());
    renderWithSession(<DeliveriesPage />, { role: "MANAGER" });
    const finalize = await drop("2026-11-11");
    expect(finalize).toHaveBeenCalledWith(false);
    expect(await screen.findByText(/Drag it later/)).toBeInTheDocument();
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("is read-only for viewers and lists deliveries as a table too", async () => {
    mockFetch(
      routes([delivery({ status: "DELAYED", original_expected_date: "2026-11-12", expected_date: "2026-11-14", delay_reason: "Storm" })]),
    );
    renderWithSession(<DeliveriesPage />, { role: "VIEWER" });
    await screen.findByTestId("bryntum");
    expect(lastView!.readOnly).toBe(true);
    expect(lastView!.schedule.events[0]!.draggable).toBe(false);
    expect(screen.getByText("Deliveries as a list")).toBeInTheDocument();
    expect(screen.getByRole("cell", { name: "Storm" })).toBeInTheDocument();
    expect(screen.getByText(/\(was /)).toBeInTheDocument();
  });

  it("shows an empty state before any order is paid", async () => {
    mockFetch(routes([]));
    renderWithSession(<DeliveriesPage />);
    expect(await screen.findByText("No deliveries yet")).toBeInTheDocument();
    expect(screen.getByText("Approve and pay an order to see its delivery here.")).toBeInTheDocument();
    expect(screen.queryByTestId("bryntum")).not.toBeInTheDocument();
  });
});
