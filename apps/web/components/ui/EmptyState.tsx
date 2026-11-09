import type { ReactNode } from "react";
import { cn } from "./cn";

export function EmptyState({
  title,
  description,
  action,
  icon,
  className,
  compact = false,
}: {
  title: string;
  description?: ReactNode;
  action?: ReactNode;
  icon?: ReactNode;
  className?: string;
  compact?: boolean;
}) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center text-center",
        compact ? "px-4 py-6" : "rounded-lg border border-dashed border-line-strong px-6 py-10",
        className,
      )}
    >
      {icon ? <div className="mb-3 text-ink-4">{icon}</div> : null}
      <p className="text-sm font-medium text-ink-2">{title}</p>
      {description ? <p className="mt-1 max-w-md text-[13px] text-ink-3">{description}</p> : null}
      {action ? <div className="mt-4">{action}</div> : null}
    </div>
  );
}
