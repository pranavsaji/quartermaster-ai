import { cn } from "./cn";

export function Skeleton({ className }: { className?: string }) {
  return <div aria-hidden className={cn("skeleton rounded-md", className ?? "h-4 w-full")} />;
}

/** Placeholder block for a loading list/table, announced once to screen readers. */
export function SkeletonRows({ rows = 5, className }: { rows?: number; className?: string }) {
  return (
    <div role="status" aria-live="polite" className={cn("space-y-2.5", className)}>
      <span className="sr-only">Loading…</span>
      {Array.from({ length: rows }, (_, i) => (
        <Skeleton key={i} className={cn("h-9", i % 3 === 2 ? "w-4/5" : "w-full")} />
      ))}
    </div>
  );
}

export function SkeletonCard({ lines = 3 }: { lines?: number }) {
  return (
    <div role="status" className="rounded-[var(--radius-card)] border border-line bg-surface p-5">
      <span className="sr-only">Loading…</span>
      <Skeleton className="mb-4 h-4 w-40" />
      <div className="space-y-2">
        {Array.from({ length: lines }, (_, i) => (
          <Skeleton key={i} className={cn("h-3.5", i === lines - 1 ? "w-2/3" : "w-full")} />
        ))}
      </div>
    </div>
  );
}
