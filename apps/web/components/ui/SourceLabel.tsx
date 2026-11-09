import type { DataSource } from "@qm/contracts";
import { DATA_SOURCE_LABELS } from "@/lib/labels";
import { cn } from "./cn";

const STYLES: Record<DataSource, string> = {
  CHANNEL3_MARKET: "text-info border-info-line bg-info-soft",
  SANDBOX_SUPPLIER: "text-accent-strong border-accent-line bg-accent-soft",
  SYNTHETIC: "text-ink-3 border-line-strong bg-canvas",
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
        STYLES[source],
        className,
      )}
    >
      <svg viewBox="0 0 16 16" fill="currentColor" className="size-2.5" aria-hidden>
        <circle cx="8" cy="8" r="4" />
      </svg>
      <span>
        <span className="sr-only">Data source: </span>
        {children ?? DATA_SOURCE_LABELS[source]}
      </span>
    </span>
  );
}
