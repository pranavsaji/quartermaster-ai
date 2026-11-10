import { Icons } from "@/components/shell/icons";
import { cn } from "./cn";

/**
 * The one "Refresh" control: a quiet secondary icon button, the same on every page. It sits
 * after the page's primary action, so on a phone the primary action comes first.
 */
export function RefreshButton({
  onClick,
  loading = false,
  label = "Refresh",
  className,
}: {
  onClick: () => void;
  loading?: boolean;
  /** Accessible name and tooltip. */
  label?: string;
  className?: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={loading}
      aria-label={label}
      aria-busy={loading || undefined}
      title={label}
      className={cn(
        "grid size-9 shrink-0 place-items-center rounded-lg border border-line-strong bg-surface text-ink-3 shadow-sm transition-colors",
        "hover:bg-canvas hover:text-ink disabled:cursor-wait disabled:text-ink-4 pointer-coarse:size-11",
        className,
      )}
    >
      <Icons.refresh className={cn("size-4", loading && "animate-spin motion-reduce:animate-none")} />
    </button>
  );
}
