import type { AgentStepDto } from "@qm/contracts";
import { Badge } from "@/components/ui/Badge";
import { Card, CardBody, CardHeader } from "@/components/ui/Card";
import { cn } from "@/components/ui/cn";
import { EmptyState } from "@/components/ui/EmptyState";
import { Icons } from "@/components/shell/icons";
import { dateTime, duration, humanize } from "@/lib/format";

const STATUS: Record<AgentStepDto["status"], { tone: "allow" | "block" | "neutral"; ring: string; icon: keyof typeof Icons }> = {
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
        title="Agent steps"
        description={ordered.length > 0 ? `${ordered.length} steps · ${duration(total)} total` : undefined}
      />
      <CardBody>
        {ordered.length === 0 ? (
          <EmptyState compact title="No steps yet" description="Steps appear once research runs." />
        ) : (
          <ol className="relative">
            {ordered.map((step, i) => {
              const s = STATUS[step.status];
              const Icon = Icons[s.icon];
              return (
                <li key={step.id} className="relative flex gap-3 pb-4 last:pb-0">
                  {i < ordered.length - 1 ? (
                    <span aria-hidden className="absolute top-7 bottom-0 left-[13px] w-px bg-line" />
                  ) : null}
                  <span className={cn("relative z-10 grid size-7 shrink-0 place-items-center rounded-full ring-1", s.ring)}>
                    <Icon className="size-3.5" strokeWidth={2.2} />
                  </span>
                  <div className="min-w-0 flex-1 pt-0.5">
                    <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                      <span className="text-[13.5px] font-medium text-ink">{humanize(step.tool)}</span>
                      <code className="font-mono text-[11px] text-ink-4">{step.tool}</code>
                      {step.status !== "SUCCEEDED" ? (
                        <Badge tone={s.tone} label={`Step ${humanize(step.status)}`}>
                          {humanize(step.status)}
                        </Badge>
                      ) : null}
                      <span className="tnum ml-auto text-[12px] text-ink-4" title={dateTime(step.started_at)}>
                        {duration(step.duration_ms)}
                      </span>
                    </div>
                    <p className="mt-0.5 text-[13px] leading-relaxed text-ink-3">{step.summary}</p>
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
