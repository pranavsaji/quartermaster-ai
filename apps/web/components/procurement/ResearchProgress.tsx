"use client";

import { Card, CardBody } from "@/components/ui/Card";
import { cn } from "@/components/ui/cn";
import { Spinner } from "@/components/ui/Spinner";
import { useNow } from "@/lib/hooks";

/**
 * The research call is a single request that typically takes 5–25 s. We don't
 * get streaming progress, so this shows the pipeline stages advancing on a
 * typical schedule and is explicit that the real result is what counts.
 */
const STAGES: { label: string; detail: string; at: number }[] = [
  { label: "Interpreting the instruction", detail: "Structured intent with schema validation", at: 0 },
  { label: "Forecasting demand", detail: "Reorder point, lead time and safety stock", at: 1.5 },
  { label: "Researching the market", detail: "Channel3 reference prices (not purchasable here)", at: 3.5 },
  { label: "Comparing sandbox suppliers", detail: "Delivered unit cost incl. shipping, tax and fees", at: 7 },
  { label: "Planning carts", detail: "One proposal per supplier", at: 11 },
  { label: "TrustRail policy evaluation", detail: "Deterministic checks against your spend mandate", at: 14 },
];

export function ResearchProgress({ startedAt }: { startedAt: number }) {
  const now = useNow(250);
  const elapsed = Math.max(0, (now - startedAt) / 1000);
  const activeIndex = STAGES.reduce((acc, s, i) => (elapsed >= s.at ? i : acc), 0);

  return (
    <Card aria-live="polite" aria-busy="true">
      <CardBody className="py-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <span className="grid size-9 place-items-center rounded-full bg-accent-soft text-accent">
              <Spinner className="size-4" />
            </span>
            <div>
              <p className="text-[15px] font-semibold text-ink">Quartermaster is researching this request…</p>
              <p className="text-[13px] text-ink-3">This usually takes 5–25 seconds. You can leave this page; it keeps running.</p>
            </div>
          </div>
          <span className="tnum rounded-md bg-canvas px-2 py-1 font-mono text-[12px] text-ink-3">{elapsed.toFixed(1)} s</span>
        </div>
        <ol className="mt-5 grid grid-cols-1 gap-2 sm:grid-cols-2 xl:grid-cols-3">
          {STAGES.map((stage, i) => {
            const state = i < activeIndex ? "done" : i === activeIndex ? "active" : "todo";
            return (
              <li
                key={stage.label}
                className={cn(
                  "rounded-lg border px-3 py-2.5 transition-colors",
                  state === "active" && "border-accent-line bg-accent-soft/60",
                  state === "done" && "border-line bg-surface",
                  state === "todo" && "border-dashed border-line bg-surface opacity-60",
                )}
              >
                <p className="flex items-center gap-2 text-[13px] font-medium text-ink">
                  <span
                    aria-hidden
                    className={cn(
                      "size-2 rounded-full",
                      state === "done" && "bg-allow",
                      state === "active" && "animate-pulse bg-accent motion-reduce:animate-none",
                      state === "todo" && "bg-ink-4",
                    )}
                  />
                  {stage.label}
                  <span className="sr-only">{state === "done" ? " (typically complete)" : state === "active" ? " (in progress)" : ""}</span>
                </p>
                <p className="mt-0.5 pl-4 text-[12px] text-ink-3">{stage.detail}</p>
              </li>
            );
          })}
        </ol>
        <p className="mt-3 text-[11.5px] text-ink-4">Stage timing is indicative; the step log below is the authoritative record.</p>
      </CardBody>
    </Card>
  );
}
