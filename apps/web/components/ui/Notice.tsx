import type { ReactNode } from "react";
import { lookup, type Tone } from "@/lib/labels";
import { cn } from "./cn";

const TONES: Record<Tone, string> = {
  neutral: "border-line bg-canvas text-ink-2",
  accent: "border-accent-line bg-accent-soft text-accent-strong",
  allow: "border-allow-line bg-allow-soft text-allow",
  review: "border-review-line bg-review-soft text-review",
  block: "border-block-line bg-block-soft text-block",
  info: "border-info-line bg-info-soft text-info",
};

function Icon({ tone }: { tone: Tone }) {
  const common = { className: "mt-0.5 size-4 shrink-0", viewBox: "0 0 20 20", fill: "currentColor", "aria-hidden": true };
  if (tone === "allow") {
    return (
      <svg {...common}>
        <path
          fillRule="evenodd"
          d="M10 18a8 8 0 1 0 0-16 8 8 0 0 0 0 16Zm3.857-9.809a.75.75 0 0 0-1.214-.882l-3.483 4.79-1.88-1.88a.75.75 0 1 0-1.06 1.061l2.5 2.5a.75.75 0 0 0 1.137-.089l4-5.5Z"
          clipRule="evenodd"
        />
      </svg>
    );
  }
  if (tone === "block" || tone === "review") {
    return (
      <svg {...common}>
        <path
          fillRule="evenodd"
          d="M8.485 2.495c.673-1.167 2.357-1.167 3.03 0l6.28 10.875c.673 1.167-.17 2.625-1.516 2.625H3.72c-1.347 0-2.189-1.458-1.515-2.625L8.485 2.495ZM10 5a.75.75 0 0 1 .75.75v3.5a.75.75 0 0 1-1.5 0v-3.5A.75.75 0 0 1 10 5Zm0 9a1 1 0 1 0 0-2 1 1 0 0 0 0 2Z"
          clipRule="evenodd"
        />
      </svg>
    );
  }
  return (
    <svg {...common}>
      <path
        fillRule="evenodd"
        d="M18 10a8 8 0 1 1-16 0 8 8 0 0 1 16 0Zm-7-4a1 1 0 1 1-2 0 1 1 0 0 1 2 0ZM9 9a.75.75 0 0 0 0 1.5h.253a.25.25 0 0 1 .244.304l-.459 2.066A1.75 1.75 0 0 0 10.747 15H11a.75.75 0 0 0 0-1.5h-.253a.25.25 0 0 1-.244-.304l.459-2.066A1.75 1.75 0 0 0 9.253 9H9Z"
        clipRule="evenodd"
      />
    </svg>
  );
}

/** Inline callout for degraded modes, warnings and confirmations. */
export function Notice({
  tone = "info",
  title,
  children,
  action,
  className,
  live = false,
}: {
  tone?: Tone;
  title?: ReactNode;
  children?: ReactNode;
  action?: ReactNode;
  className?: string;
  /** Announce to assistive tech when it appears. */
  live?: boolean;
}) {
  return (
    <div
      role={live ? (tone === "block" ? "alert" : "status") : undefined}
      className={cn("flex gap-2.5 rounded-lg border px-3.5 py-3 text-[13px]", lookup(TONES, tone, TONES.neutral), className)}
    >
      <Icon tone={tone} />
      <div className="min-w-0 flex-1">
        {title ? <p className="font-semibold">{title}</p> : null}
        {children ? <div className={cn("text-ink-2", title ? "mt-0.5" : undefined)}>{children}</div> : null}
      </div>
      {action ? <div className="shrink-0 self-center">{action}</div> : null}
    </div>
  );
}
