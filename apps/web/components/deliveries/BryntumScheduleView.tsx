"use client";

/**
 * The Bryntum Scheduler itself. Loaded only in the browser (see DeliverySchedule), because
 * Bryntum renders into the DOM directly.
 *
 * Bryntum's prebuilt ES module (4.6 MB) is served as a static file (copied to
 * public/vendor/bryntum by scripts/copy-bryntum.mjs) and imported at runtime, instead of being
 * bundled: bundling it made the production build exceed the host's build memory. Only its
 * types are imported at compile time.
 *
 * Renderers return DomConfig objects with `text` (set as textContent) or HTML-encoded strings:
 * supplier names and PO data come from outside input, and Bryntum inserts renderer strings as
 * HTML.
 */
import "@bryntum/scheduler/scheduler.css";
import "@bryntum/scheduler/svalbard-light.css";
import "@bryntum/scheduler/fontawesome/css/fontawesome.css";
import "@bryntum/scheduler/fontawesome/css/solid.css";
import type * as Bryntum from "@bryntum/scheduler";
import type { EventModel, Scheduler, SchedulerConfig } from "@bryntum/scheduler";
import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/Button";
import { ErrorNotice } from "@/components/ui/ErrorNotice";
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

type BryntumModule = typeof Bryntum;
type Mode = "2w" | "month";
const PRESETS: Record<Mode, string> = { "2w": "weekAndDayLetter", month: "weekAndMonth" };
const BRYNTUM_URL = "/vendor/bryntum/scheduler.module.js";

let loading: Promise<BryntumModule> | null = null;
/** Imports Bryntum once per page load, from the static copy (never bundled). */
function loadBryntum(): Promise<BryntumModule> {
  loading ??= (import(/* webpackIgnore: true */ /* turbopackIgnore: true */ BRYNTUM_URL) as Promise<BryntumModule>).catch(
    (err: unknown) => {
      loading = null;
      throw err;
    },
  );
  return loading;
}

const field = (record: EventModel, name: string): unknown => record.get(name) as unknown;

interface Live {
  today: string;
  onDropRequest: ScheduleViewProps["onDropRequest"];
}

function schedulerConfig(b: BryntumModule, live: { current: Live }, today: string, readOnly: boolean): Partial<SchedulerConfig> {
  const span = initialSpan(today, "2w");
  return {
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
    eventRenderer: ({ eventRecord }: { eventRecord: EventModel }) =>
      b.StringHelper.encodeHtml(String(field(eventRecord, "poNumber") ?? eventRecord.name)),
    features: {
      eventDrag: {
        constrainDragToResource: true,
        validatorFn: ({ endDate, eventRecords }: { endDate: Date; eventRecords: EventModel[] }) => {
          const rec = eventRecords[0];
          if (!rec) return false;
          const error = rescheduleError(
            { status: field(rec, "status") as DeliveryStatus, expected_date: String(field(rec, "expectedDate")) },
            expectedDayFromEnd(endDate),
            live.current.today,
          );
          return error ? { valid: false, message: error } : { valid: true, message: `Expected ${date(expectedDayFromEnd(endDate))}` };
        },
      },
      eventResize: false,
      eventDragCreate: false,
      eventEdit: false,
      eventMenu: false,
      scheduleMenu: false,
      cellMenu: false,
      timeRanges: { showCurrentTimeLine: true },
      resourceTimeRanges: true,
      eventTooltip: {
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
    },
    listeners: {
      beforeEventDropFinalize: ({
        context,
      }: {
        context: { eventRecords: EventModel[]; endDate: Date; async: boolean; finalize: (ok: boolean) => void };
      }) => {
        const rec = context.eventRecords[0];
        if (!rec) return;
        context.async = true;
        live.current.onDropRequest({
          eventId: String(rec.id),
          newExpected: expectedDayFromEnd(context.endDate),
          finalize: (accept) => context.finalize(accept),
        });
      },
    },
  } as unknown as Partial<SchedulerConfig>;
}

export default function BryntumScheduleView({ schedule, today, readOnly, onDropRequest }: ScheduleViewProps) {
  const host = useRef<HTMLDivElement>(null);
  const instance = useRef<Scheduler | null>(null);
  // Bryntum's callbacks are created once; they read the latest props through this ref.
  const live = useRef<Live>({ today, onDropRequest });
  const initial = useRef({ schedule, today, readOnly });
  const [mode, setMode] = useState<Mode>("2w");
  const [loadError, setLoadError] = useState<Error | null>(null);

  useEffect(() => {
    live.current = { today, onDropRequest };
  }, [today, onDropRequest]);

  useEffect(() => {
    let cancelled = false;
    loadBryntum()
      .then((b) => {
        if (cancelled || !host.current) return;
        const first = initial.current;
        instance.current = new b.Scheduler({
          ...schedulerConfig(b, live, first.today, first.readOnly),
          appendTo: host.current,
          resources: first.schedule.resources,
          events: first.schedule.events,
          resourceTimeRanges: first.schedule.ranges,
        } as Partial<SchedulerConfig>);
      })
      .catch((err: unknown) => {
        if (!cancelled) setLoadError(err instanceof Error ? err : new Error("The schedule could not be loaded."));
      });
    return () => {
      cancelled = true;
      instance.current?.destroy();
      instance.current = null;
    };
  }, []);

  useEffect(() => {
    const scheduler = instance.current;
    if (!scheduler) return;
    scheduler.resources = schedule.resources as never;
    scheduler.events = schedule.events as never;
    scheduler.resourceTimeRanges = schedule.ranges as never;
  }, [schedule]);

  useEffect(() => {
    if (instance.current) instance.current.readOnly = readOnly;
  }, [readOnly]);

  const show = (next: Mode) => {
    setMode(next);
    const scheduler = instance.current;
    if (!scheduler) return;
    const s = initialSpan(today, next);
    scheduler.viewPreset = PRESETS[next];
    scheduler.setTimeSpan(s.start, s.end);
  };

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
        <Button size="sm" variant="ghost" onClick={() => instance.current?.zoomIn()}>
          Zoom in
        </Button>
        <Button size="sm" variant="ghost" onClick={() => instance.current?.zoomOut()}>
          Zoom out
        </Button>
        <Button
          size="sm"
          variant="ghost"
          onClick={() => void instance.current?.scrollToDate(new Date(), { block: "center", animate: true })}
        >
          Today
        </Button>
      </div>
      {loadError ? <ErrorNotice error={loadError} title="The schedule could not be loaded" className="mb-2" /> : null}
      <div ref={host} className="qm-scheduler h-[520px] overflow-hidden rounded-xl border border-line" />
    </div>
  );
}
