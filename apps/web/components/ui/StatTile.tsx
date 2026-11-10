import Link from "next/link";
import type { ReactNode } from "react";
import { lookup, type Tone } from "@/lib/labels";
import { cn } from "./cn";
import { Skeleton } from "./Skeleton";

const ACCENTS: Record<Tone, string> = {
  neutral: "text-ink",
  accent: "text-accent-strong",
  allow: "text-allow",
  review: "text-review",
  block: "text-block",
  info: "text-info",
};

/** KPI tile: label, big tabular number, optional context line and link. */
export function StatTile({
  label,
  value,
  sub,
  tone = "neutral",
  href,
  loading = false,
  children,
}: {
  label: string;
  value: ReactNode;
  sub?: ReactNode;
  tone?: Tone;
  href?: string;
  loading?: boolean;
  children?: ReactNode;
}) {
  const body = (
    <>
      <p className="text-xs font-medium text-ink-3">{label}</p>
      {loading ? (
        <Skeleton className="mt-2 h-7 w-24" />
      ) : (
        <p className={cn("tnum mt-1.5 text-2xl leading-8 font-semibold tracking-[-0.02em]", lookup(ACCENTS, tone, ACCENTS.neutral))}>
          {value}
        </p>
      )}
      {sub && !loading ? <p className="mt-1 text-xs text-ink-3">{sub}</p> : null}
      {children}
    </>
  );
  const cls = "block rounded-[var(--radius-card)] border border-line bg-surface p-4 shadow-[var(--shadow-card)] transition-colors";
  if (href) {
    return (
      <Link href={href} className={cn(cls, "hover:border-line-strong hover:bg-canvas/40")}>
        {body}
      </Link>
    );
  }
  return <div className={cls}>{body}</div>;
}
