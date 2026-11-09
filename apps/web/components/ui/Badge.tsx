import type { ReactNode } from "react";
import { lookup, type Tone } from "@/lib/labels";
import { humanize } from "@/lib/format";
import { cn } from "./cn";

const TONES: Record<Tone, { box: string; dot: string }> = {
  neutral: { box: "bg-ink/[0.04] text-ink-2 ring-line-strong", dot: "bg-ink-4" },
  accent: { box: "bg-accent-soft text-accent-strong ring-accent-line", dot: "bg-accent" },
  allow: { box: "bg-allow-soft text-allow ring-allow-line", dot: "bg-allow" },
  review: { box: "bg-review-soft text-review ring-review-line", dot: "bg-review" },
  block: { box: "bg-block-soft text-block ring-block-line", dot: "bg-block" },
  info: { box: "bg-info-soft text-info ring-info-line", dot: "bg-info" },
};

export interface BadgeProps {
  tone?: Tone;
  children: ReactNode;
  /** Prefix with a coloured dot (status pills). */
  dot?: boolean;
  size?: "sm" | "md";
  className?: string;
  /** Accessible description, e.g. "TrustRail decision: Blocked". */
  label?: string;
  title?: string;
}

export function Badge({ tone = "neutral", children, dot = false, size = "sm", className, label, title }: BadgeProps) {
  const t = lookup(TONES, tone, TONES.neutral);
  return (
    <span
      role={label ? "status" : undefined}
      aria-label={label}
      title={title}
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full font-medium whitespace-nowrap ring-1 ring-inset",
        size === "sm" ? "px-2 py-0.5 text-[11.5px] leading-4" : "px-2.5 py-1 text-xs",
        t.box,
        className,
      )}
    >
      {dot ? <span aria-hidden className={cn("size-1.5 rounded-full", t.dot)} /> : null}
      {children}
    </span>
  );
}

/** Pill for an enum status: humanised text, semantic tone, aria label. */
export function StatusBadge<S extends string>({
  status,
  tones,
  labels,
  kind = "Status",
  size,
}: {
  status: S;
  tones: Record<S, Tone>;
  labels?: Partial<Record<S, string>>;
  kind?: string;
  size?: "sm" | "md";
}) {
  const text = labels?.[status] ?? humanize(status);
  return (
    <Badge tone={lookup<S, Tone>(tones, status, "neutral")} dot size={size} label={`${kind}: ${text}`}>
      {text}
    </Badge>
  );
}
