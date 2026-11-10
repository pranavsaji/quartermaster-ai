import type { DataSource } from "@qm/contracts";
import { DATA_SOURCE_LABELS, lookup } from "@/lib/labels";
import { cn } from "./cn";

const STYLES: Record<DataSource, string> = {
  CHANNEL3_MARKET: "text-info border-info-line bg-info-soft",
  SANDBOX_SUPPLIER: "text-accent-strong border-accent-line bg-accent-soft",
  SYNTHETIC: "text-ink-3 border-line-strong bg-canvas",
  USER_ENTERED: "text-allow border-allow-line bg-allow-soft",
};

/**
 * Small, always-visible provenance label so nobody mistakes reference market
 * data or synthetic fixtures for real, purchasable inventory.
 */
export function SourceLabel({
  source,
  children,
  className,
}: {
  source: DataSource;
  /** Overrides the default label text. */
  children?: React.ReactNode;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded border px-1.5 py-px font-mono text-[10.5px] font-medium tracking-wide uppercase",
        lookup(STYLES, source, STYLES.SYNTHETIC),
        className,
      )}
    >
      <svg viewBox="0 0 16 16" fill="currentColor" className="size-2.5" aria-hidden>
        <circle cx="8" cy="8" r="4" />
      </svg>
      <span>
        <span className="sr-only">Data source: </span>
        {children ?? lookup(DATA_SOURCE_LABELS, source, source)}
      </span>
    </span>
  );
}
