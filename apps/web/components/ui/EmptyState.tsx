import type { ReactNode } from "react";
import { Icons, type IconName } from "@/components/shell/icons";
import { cn } from "./cn";

/**
 * The one empty-state pattern: a quiet icon, a short title, one line of context and an optional
 * call to action. Grid overlays (DataGrid's "no rows") render the same shape in HTML.
 */
export function EmptyState({
  title,
  description,
  action,
  className,
  compact = false,
  icon = "inbox",
}: {
  title: string;
  description?: ReactNode;
  action?: ReactNode;
  className?: string;
  compact?: boolean;
  icon?: IconName;
}) {
  const Icon = Icons[icon];
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center text-center",
        compact ? "px-4 py-6" : "rounded-lg border border-dashed border-line-strong px-6 py-10",
        className,
      )}
    >
      <span aria-hidden className="mb-2.5 grid size-9 place-items-center rounded-full bg-canvas text-ink-4 ring-1 ring-line">
        <Icon className="size-[18px]" />
      </span>
      <p className="text-sm font-medium text-ink-2">{title}</p>
      {description ? <p className="mt-0.5 max-w-md text-xs text-ink-3">{description}</p> : null}
      {action ? <div className="mt-4">{action}</div> : null}
    </div>
  );
}
