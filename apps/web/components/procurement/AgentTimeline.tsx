import type { AgentStepDto } from "@qm/contracts";
import { Badge } from "@/components/ui/Badge";
import { Card, CardBody, CardHeader } from "@/components/ui/Card";
import { cn } from "@/components/ui/cn";
import { EmptyState } from "@/components/ui/EmptyState";
import { Icons } from "@/components/shell/icons";
import { dateTime, duration, humanize, plural } from "@/lib/format";
import { lookup } from "@/lib/labels";
import { plainText, stepLabel } from "@/lib/plain-language";

type StepStyle = { tone: "allow" | "block" | "neutral"; ring: string; icon: keyof typeof Icons };

const STATUS: Record<AgentStepDto["status"], StepStyle> = {
  SUCCEEDED: { tone: "allow", ring: "bg-allow-soft text-allow ring-allow-line", icon: "check" },
  FAILED: { tone: "block", ring: "bg-block-soft text-block ring-block-line", icon: "x" },
  SKIPPED: { tone: "neutral", ring: "bg-canvas text-ink-3 ring-line-strong", icon: "minus" },
};

/** Ordered log of the tools the agent ran, with outcome and timing. */
export function AgentTimeline({ steps }: { steps: AgentStepDto[] }) {
  const ordered = [...steps].sort((a, b) => a.started_at.localeCompare(b.started_at));
  const total = ordered.reduce((sum, s) => sum + s.duration_ms, 0);
  return (
    <Card aria-labelledby="timeline-title">
      <CardHeader
        id="timeline-title"
        title="What Quartermaster did"
        description={ordered.length > 0 ? `${plural(ordered.length, "step")} · ${duration(total)} in all` : undefined}
      />
      <CardBody>
        {ordered.length === 0 ? (
          <EmptyState compact icon="sparkle" title="No steps yet" description="Each step appears here once research runs." />
        ) : (
          <ol className="relative">
            {ordered.map((step, i) => {
              const s = lookup<AgentStepDto["status"], StepStyle>(STATUS, step.status, STATUS.SKIPPED);
              const Icon = Icons[s.icon];
              return (
                <li key={step.id} className="relative flex gap-3 pb-4 last:pb-0">
                  {i < ordered.length - 1 ? <span aria-hidden className="absolute top-7 bottom-0 left-[13px] w-px bg-line" /> : null}
                  <span className={cn("relative z-10 grid size-7 shrink-0 place-items-center rounded-full ring-1", s.ring)}>
                    <Icon className="size-3.5" strokeWidth={2.2} />
                  </span>
                  <div className="min-w-0 flex-1 pt-0.5">
                    <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                      <span className="text-sm font-medium text-ink" title={step.tool}>
                        {stepLabel(step.tool)}
                      </span>
                      {step.status !== "SUCCEEDED" ? (
                        <Badge tone={s.tone} label={`Step ${humanize(step.status)}`}>
                          {humanize(step.status)}
                        </Badge>
                      ) : null}
                      <span className="tnum ml-auto text-xs text-ink-4" title={dateTime(step.started_at)}>
                        {duration(step.duration_ms)}
                      </span>
                    </div>
                    <p className="mt-0.5 text-xs leading-relaxed text-ink-3">{plainText(step.summary)}</p>
                  </div>
                </li>
              );
            })}
          </ol>
        )}
      </CardBody>
    </Card>
  );
}
