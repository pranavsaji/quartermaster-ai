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
  { label: "Reading your request", detail: "Items, budget and timing", at: 0 },
  { label: "Forecasting demand", detail: "Reorder point, lead time and safety stock", at: 1.5 },
  { label: "Checking market prices", detail: "Public listings, for reference only", at: 3.5 },
  { label: "Comparing suppliers", detail: "Delivered cost with shipping, tax and fees", at: 7 },
  { label: "Planning carts", detail: "One cart per supplier", at: 11 },
  { label: "TrustRail check", detail: "Every cart against your spend mandate", at: 14 },
];

export function ResearchProgress({ startedAt }: { startedAt: number }) {
  const now = useNow(250);
  const elapsed = Math.max(0, (now - startedAt) / 1000);
  const activeIndex = STAGES.reduce((acc, s, i) => (elapsed >= s.at ? i : acc), 0);

  return (
    <Card aria-label="Research progress">
      <CardBody className="py-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <span className="grid size-9 place-items-center rounded-full bg-accent-soft text-accent">
              <Spinner className="size-4" />
            </span>
            <div>
              <p className="text-base font-semibold text-ink">Researching this request…</p>
              <p className="text-sm text-ink-3">Usually 5–25 seconds. You can leave this page; it keeps running.</p>
            </div>
          </div>
          {/* Not announced: a counter ticking 4x a second would flood a live region. */}
          <span className="tnum rounded-md bg-canvas px-2 py-1 font-mono text-xs text-ink-3">{elapsed.toFixed(1)} s</span>
        </div>
        <p className="sr-only" role="status">
          {STAGES[activeIndex]?.label}
        </p>
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
                  // A muted background, not reduced opacity, which would drop the 12px detail below AA contrast.
                  state === "todo" && "border-dashed border-line bg-canvas",
                )}
              >
                <p className="flex items-center gap-2 text-sm font-medium text-ink">
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
                <p className="mt-0.5 pl-4 text-xs text-ink-3">{stage.detail}</p>
              </li>
            );
          })}
        </ol>
        <p className="mt-3 text-2xs text-ink-4">Stage timing is approximate; the step log is the exact record.</p>
      </CardBody>
    </Card>
  );
}
