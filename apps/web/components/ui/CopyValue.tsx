"use client";

import { useEffect, useRef, useState } from "react";
import { truncateMiddle } from "@/lib/format";
import { cn } from "./cn";

/**
 * Shows a long identifier (cart hash, signature, capture id) truncated in the
 * middle, with the full value in the tooltip and a copy button.
 */
export function CopyValue({
  value,
  label,
  head = 14,
  tail = 8,
  className,
}: {
  value: string;
  /** What is being copied, for the button's accessible name. */
  label: string;
  head?: number;
  tail?: number;
  className?: string;
}) {
  const [status, setStatus] = useState<"idle" | "copied" | "selected">("idle");
  const codeRef = useRef<HTMLElement>(null);

  useEffect(() => {
    if (status === "copied") {
      const t = window.setTimeout(() => setStatus("idle"), 1600);
      return () => window.clearTimeout(t);
    }
    if (status === "selected" && codeRef.current) {
      // The full value is rendered now; select it so Ctrl/Cmd+C copies it.
      const range = document.createRange();
      range.selectNodeContents(codeRef.current);
      const selection = window.getSelection();
      selection?.removeAllRanges();
      selection?.addRange(range);
    }
    return undefined;
  }, [status]);

  async function copy() {
    try {
      await navigator.clipboard.writeText(value);
      setStatus("copied");
    } catch {
      // Clipboard can be unavailable (insecure context, permissions): show the full value
      // and select it instead, so the user can copy it with the keyboard.
      setStatus("selected");
    }
  }

  const copied = status === "copied";

  return (
    <span className={cn("inline-flex max-w-full items-center gap-1 align-middle", className)}>
      <code ref={codeRef} title={value} className="truncate rounded bg-ink/[0.04] px-1.5 py-0.5 font-mono text-xs text-ink-2">
        {status === "selected" ? value : truncateMiddle(value, head, tail)}
      </code>
      <button
        type="button"
        onClick={copy}
        className="rounded p-1 text-ink-3 hover:bg-ink/5 hover:text-ink"
        aria-label={copied ? `${label} copied` : `Copy ${label}`}
        title={copied ? "Copied" : "Copy"}
      >
        {copied ? (
          <svg viewBox="0 0 20 20" fill="currentColor" className="size-3.5 text-allow" aria-hidden>
            <path
              fillRule="evenodd"
              d="M16.704 4.153a.75.75 0 0 1 .143 1.052l-8 10.5a.75.75 0 0 1-1.127.075l-4.5-4.5a.75.75 0 0 1 1.06-1.06l3.894 3.893 7.48-9.817a.75.75 0 0 1 1.05-.143Z"
              clipRule="evenodd"
            />
          </svg>
        ) : (
          <svg viewBox="0 0 20 20" fill="currentColor" className="size-3.5" aria-hidden>
            <path d="M7 3.5A1.5 1.5 0 0 1 8.5 2h3.879a1.5 1.5 0 0 1 1.06.44l3.122 3.12A1.5 1.5 0 0 1 17 6.622V12.5a1.5 1.5 0 0 1-1.5 1.5h-1v-3.379a3 3 0 0 0-.879-2.121L10.5 5.379A3 3 0 0 0 8.379 4.5H7v-1Z" />
            <path d="M4.5 6A1.5 1.5 0 0 0 3 7.5v9A1.5 1.5 0 0 0 4.5 18h7a1.5 1.5 0 0 0 1.5-1.5v-5.879a1.5 1.5 0 0 0-.44-1.06L9.44 6.439A1.5 1.5 0 0 0 8.378 6H4.5Z" />
          </svg>
        )}
      </button>
      <span className="sr-only" aria-live="polite">
        {copied ? "Copied to clipboard" : null}
        {status === "selected" ? "Couldn't copy automatically. The value is selected: press Ctrl+C or Cmd+C." : null}
      </span>
    </span>
  );
}
