import type { ReactNode } from "react";
import { cn } from "./cn";

/** Collapsible section on <details>/<summary>: keyboard accessible, no JS state. */
export function Disclosure({
  summary,
  children,
  defaultOpen = false,
  className,
}: {
  summary: ReactNode;
  children: ReactNode;
  defaultOpen?: boolean;
  className?: string;
}) {
  return (
    <details open={defaultOpen} className={cn("group rounded-lg border border-line", className)}>
      <summary className="flex cursor-pointer list-none items-center justify-between gap-3 rounded-lg px-3.5 py-2.5 text-sm font-medium text-ink-2 select-none hover:bg-canvas [&::-webkit-details-marker]:hidden">
        <span className="min-w-0">{summary}</span>
        <svg
          viewBox="0 0 20 20"
          fill="currentColor"
          className="size-4 shrink-0 text-ink-3 transition-transform group-open:rotate-180"
          aria-hidden
        >
          <path
            fillRule="evenodd"
            d="M5.22 8.22a.75.75 0 0 1 1.06 0L10 11.94l3.72-3.72a.75.75 0 1 1 1.06 1.06l-4.25 4.25a.75.75 0 0 1-1.06 0L5.22 9.28a.75.75 0 0 1 0-1.06Z"
            clipRule="evenodd"
          />
        </svg>
      </summary>
      <div className="border-t border-line px-3.5 py-3">{children}</div>
    </details>
  );
}
