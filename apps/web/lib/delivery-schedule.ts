/**
 * Pure data shaping for the delivery schedule (Bryntum Scheduler): suppliers become rows,
 * deliveries become bars from the day the order was placed to the expected delivery day, and a
 * delayed delivery's original date is shaded on its supplier's row. No Bryntum imports here, so
 * the mapping and the drag rules are testable without a browser.
 *
 * Dates are calendar days (YYYY-MM-DD) in the organisation's time zone. Bryntum works in local
 * Date objects, so a day is handed over as local midnight and bars end at the following midnight
 * (end dates are exclusive).
 */
import type { DeliveryDto, DeliveryStatus, PurchaseOrderDto, SupplierDto } from "@qm/contracts";
import { addDaysIso, date, todayIso } from "@/lib/format";
import { DELIVERY_STATUS_TONES, OPEN_DELIVERY_STATUSES, lookup, type Tone } from "@/lib/labels";

export interface ScheduleResource {
  id: string;
  name: string;
  approved: boolean;
  deliveries: number;
}

export interface ScheduleEvent {
  id: string;
  resourceId: string;
  /** Bar label: the PO number. */
  name: string;
  startDate: Date;
  endDate: Date;
  status: DeliveryStatus;
  poNumber: string;
  totalMinor: number | null;
  currency: string;
  expectedDate: string;
  originalExpectedDate: string;
  delayReason: string | null;
  /** Bryntum: only open deliveries can be dragged, and only by people who may manage deliveries. */
  draggable: boolean;
  resizable: false;
  /** A Bryntum named colour, from the status tone. */
  eventColor: string;
}

/** A shaded day on a supplier's row: when a delayed delivery was originally due. */
export interface ScheduleRange {
  id: string;
  resourceId: string;
  name: string;
  startDate: Date;
  endDate: Date;
  timeRangeColor: string;
}

export interface Schedule {
  resources: ScheduleResource[];
  events: ScheduleEvent[];
  ranges: ScheduleRange[];
}

/** Status tones mapped onto Bryntum's named event colours. */
const TONE_COLORS: Record<Tone, string> = {
  info: "blue",
  accent: "indigo",
  review: "orange",
  allow: "green",
  block: "red",
  neutral: "gray",
};

export function statusColor(status: DeliveryStatus): string {
  return TONE_COLORS[lookup(DELIVERY_STATUS_TONES, status, "neutral")];
}

/** Local midnight of a calendar day, which is how Bryntum's time axis reads dates. */
export function dayStart(isoDate: string): Date {
  const [y, m, d] = isoDate.split("-").map(Number);
  return new Date(y ?? 1970, (m ?? 1) - 1, d ?? 1);
}

/** The calendar day of a local Date (inverse of dayStart). */
export function isoDay(value: Date): string {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${value.getFullYear()}-${pad(value.getMonth() + 1)}-${pad(value.getDate())}`;
}

/** The expected delivery day for a bar ending at `endDate` (exclusive end: the day before). */
export function expectedDayFromEnd(endDate: Date): string {
  return addDaysIso(isoDay(endDate), -1);
}

/** The calendar day an ISO timestamp falls on in `timeZone`. */
export function dayInZone(timestamp: string, timeZone?: string): string {
  return todayIso(timeZone, new Date(timestamp));
}

export function buildSchedule(input: {
  deliveries: readonly DeliveryDto[];
  orders: readonly PurchaseOrderDto[];
  suppliers: readonly SupplierDto[];
  canManage: boolean;
  timeZone?: string;
}): Schedule {
  const orders = new Map(input.orders.map((o) => [o.id, o]));
  const suppliers = new Map(input.suppliers.map((s) => [s.id, s]));
  const counts = new Map<string, number>();
  const events: ScheduleEvent[] = [];
  const ranges: ScheduleRange[] = [];

  for (const d of input.deliveries) {
    const po = orders.get(d.purchase_order_id);
    counts.set(d.supplier_id, (counts.get(d.supplier_id) ?? 0) + 1);
    // The bar starts when the order was placed; at least one day before it is due.
    const placed = po ? dayInZone(po.created_at, input.timeZone) : null;
    const start = placed && placed < d.expected_date ? placed : addDaysIso(d.expected_date, -1);
    events.push({
      id: d.id,
      resourceId: d.supplier_id,
      name: po?.number ?? "Delivery",
      startDate: dayStart(start),
      endDate: dayStart(addDaysIso(d.expected_date, 1)),
      status: d.status,
      poNumber: po?.number ?? "—",
      totalMinor: po?.total_minor ?? null,
      currency: po?.currency ?? "USD",
      expectedDate: d.expected_date,
      originalExpectedDate: d.original_expected_date,
      delayReason: d.delay_reason,
      draggable: input.canManage && OPEN_DELIVERY_STATUSES.has(d.status),
      resizable: false,
      eventColor: statusColor(d.status),
    });
    if (d.original_expected_date !== d.expected_date) {
      ranges.push({
        id: `original-${d.id}`,
        resourceId: d.supplier_id,
        name: `${po?.number ?? "Delivery"} was due ${date(d.original_expected_date)}`,
        startDate: dayStart(d.original_expected_date),
        endDate: dayStart(addDaysIso(d.original_expected_date, 1)),
        timeRangeColor: "orange",
      });
    }
  }

  const resources = [...counts.entries()]
    .map(([id, n]) => {
      const s = suppliers.get(id);
      return { id, name: s?.name ?? "Unknown supplier", approved: s?.approved ?? false, deliveries: n };
    })
    .sort((a, b) => a.name.localeCompare(b.name));
  events.sort((a, b) => a.startDate.getTime() - b.startDate.getTime());
  return { resources, events, ranges };
}

/**
 * Whether a dragged delivery may land with `newExpected` as its expected day. Mirrors the API:
 * only open deliveries move, a delay moves the date strictly later, and never into the past.
 * Returns the reason it may not, or null.
 */
export function rescheduleError(
  delivery: Pick<DeliveryDto, "status" | "expected_date">,
  newExpected: string,
  today: string,
): string | null {
  if (!OPEN_DELIVERY_STATUSES.has(delivery.status)) return "Only scheduled, in-transit or delayed deliveries can be moved.";
  if (newExpected <= delivery.expected_date) return `Drag it later: a delay moves the delivery after ${date(delivery.expected_date)}.`;
  if (newExpected < today) return "A delivery can't be expected in the past.";
  return null;
}

/** The visible span for a view: two weeks from three days ago, or about a month from a week ago. */
export function initialSpan(today: string, mode: "2w" | "month"): { start: Date; end: Date } {
  return mode === "2w"
    ? { start: dayStart(addDaysIso(today, -3)), end: dayStart(addDaysIso(today, 11)) }
    : { start: dayStart(addDaysIso(today, -7)), end: dayStart(addDaysIso(today, 28)) };
}
