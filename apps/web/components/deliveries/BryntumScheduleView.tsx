"use client";

/**
 * The Bryntum Scheduler itself. Loaded only in the browser (see DeliverySchedule), because
 * Bryntum renders into the DOM directly.
 *
 * Renderers return DomConfig objects with `text` (set as textContent) or HTML-encoded strings:
 * supplier names and PO data come from outside input, and Bryntum inserts renderer strings as
 * HTML.
 */
import "@bryntum/scheduler/scheduler.css";
import "@bryntum/scheduler/svalbard-light.css";
import "@bryntum/scheduler/fontawesome/css/fontawesome.css";
import "@bryntum/scheduler/fontawesome/css/solid.css";
import { StringHelper, type EventModel } from "@bryntum/scheduler";
import { BryntumScheduler, type BryntumSchedulerProps } from "@bryntum/scheduler-react";
import { useMemo, useRef, useState } from "react";
import { Button } from "@/components/ui/Button";
import { expectedDayFromEnd, initialSpan, rescheduleError, type Schedule } from "@/lib/delivery-schedule";
import { date, humanize, money } from "@/lib/format";
import type { DeliveryStatus } from "@qm/contracts";

export interface DropRequest {
  eventId: string;
  newExpected: string;
  /** Accept (keep the bar where it was dropped) or reject (put it back). */
  finalize: (accept: boolean) => void;
}

export interface ScheduleViewProps {
  schedule: Schedule;
  today: string;
  readOnly: boolean;
  onDropRequest: (request: DropRequest) => void;
}

type Mode = "2w" | "month";
const PRESETS: Record<Mode, string> = { "2w": "weekAndDayLetter", month: "weekAndMonth" };

const field = (record: EventModel, name: string): unknown => record.get(name) as unknown;

export default function BryntumScheduleView({ schedule, today, readOnly, onDropRequest }: ScheduleViewProps) {
  const ref = useRef<BryntumScheduler>(null);
  const [mode, setMode] = useState<Mode>("2w");
  const span = useMemo(() => initialSpan(today, "2w"), [today]);

  const show = (next: Mode) => {
    const scheduler = ref.current?.instance;
    setMode(next);
    if (!scheduler) return;
    const s = initialSpan(today, next);
    scheduler.viewPreset = PRESETS[next];
    scheduler.setTimeSpan(s.start, s.end);
  };

  const props = useMemo<BryntumSchedulerProps>(
    () => ({
      viewPreset: PRESETS["2w"],
      startDate: span.start,
      endDate: span.end,
      rowHeight: 52,
      barMargin: 8,
      eventStyle: "rounded",
      readOnly,
      zoomOnMouseWheel: false,
      createEventOnDblClick: false,
      columns: [
        {
          text: "Supplier",
          field: "name",
          width: 230,
          renderer: ({ record }: { record: { getData: (f: string) => unknown } }) => ({
            className: "qm-sched-supplier",
            children: [
              { tag: "span", className: "qm-sched-name", text: String(record.getData("name") ?? "") },
              record.getData("approved") ? null : { tag: "span", className: "qm-sched-badge", text: "Not approved" },
            ],
          }),
        },
      ],
      eventRenderer: ({ eventRecord }) => StringHelper.encodeHtml(String(field(eventRecord, "poNumber") ?? eventRecord.name)),
      eventDragFeature: {
        constrainDragToResource: true,
        validatorFn: ({ endDate, eventRecords }: { endDate: Date; eventRecords: EventModel[] }) => {
          const rec = eventRecords[0];
          if (!rec) return false;
          const error = rescheduleError(
            { status: field(rec, "status") as DeliveryStatus, expected_date: String(field(rec, "expectedDate")) },
            expectedDayFromEnd(endDate),
            today,
          );
          return error ? { valid: false, message: error } : { valid: true, message: `Expected ${date(expectedDayFromEnd(endDate))}` };
        },
      },
      eventResizeFeature: false,
      eventDragCreateFeature: false,
      eventEditFeature: false,
      eventMenuFeature: false,
      scheduleMenuFeature: false,
      cellMenuFeature: false,
      timeRangesFeature: { showCurrentTimeLine: true },
      resourceTimeRangesFeature: true,
      eventTooltipFeature: {
        template: ({ eventRecord }: { eventRecord: EventModel }) => {
          const total = field(eventRecord, "totalMinor");
          const reason = field(eventRecord, "delayReason");
          const original = String(field(eventRecord, "originalExpectedDate") ?? "");
          const expected = String(field(eventRecord, "expectedDate") ?? "");
          return {
            className: "qm-sched-tip",
            children: [
              { tag: "strong", text: String(field(eventRecord, "poNumber") ?? "") },
              { tag: "div", text: humanize(String(field(eventRecord, "status") ?? "")) },
              { tag: "div", text: `Expected ${date(expected)}` },
              original && original !== expected ? { tag: "div", text: `Originally ${date(original)}` } : null,
              typeof total === "number"
                ? { tag: "div", text: `Total ${money(total, String(field(eventRecord, "currency") ?? "USD"))}` }
                : null,
              reason ? { tag: "div", text: `Delay: ${String(reason)}` } : null,
            ],
          };
        },
      },
      onBeforeEventDropFinalize: ({ context }) => {
        const rec = context.eventRecords[0];
        if (!rec) return;
        context.async = true;
        onDropRequest({
          eventId: String(rec.id),
          newExpected: expectedDayFromEnd(context.endDate),
          finalize: (accept) => (context.finalize as (ok: boolean) => void)(accept),
        });
      },
    }),
    [span, readOnly, today, onDropRequest],
  );

  return (
    <div>
      <div className="mb-2 flex flex-wrap items-center gap-2" role="toolbar" aria-label="Schedule view">
        <Button size="sm" variant={mode === "2w" ? "primary" : "secondary"} aria-pressed={mode === "2w"} onClick={() => show("2w")}>
          2 weeks
        </Button>
        <Button
          size="sm"
          variant={mode === "month" ? "primary" : "secondary"}
          aria-pressed={mode === "month"}
          onClick={() => show("month")}
        >
          Month
        </Button>
        <Button size="sm" variant="ghost" onClick={() => ref.current?.instance.zoomIn()}>
          Zoom in
        </Button>
        <Button size="sm" variant="ghost" onClick={() => ref.current?.instance.zoomOut()}>
          Zoom out
        </Button>
        <Button
          size="sm"
          variant="ghost"
          onClick={() => ref.current?.instance.scrollToDate(new Date(), { block: "center", animate: true })}
        >
          Today
        </Button>
      </div>
      <div className="qm-scheduler h-[520px] overflow-hidden rounded-xl border border-line">
        <BryntumScheduler
          ref={ref}
          {...props}
          resources={schedule.resources}
          events={schedule.events}
          resourceTimeRanges={schedule.ranges}
        />
      </div>
    </div>
  );
}
