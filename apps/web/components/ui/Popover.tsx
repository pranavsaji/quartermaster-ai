"use client";

import { useCallback, useEffect, useId, useRef, useState, type ReactNode } from "react";
import { cn } from "./cn";

/**
 * A small disclosure popover: a trigger button that shows a panel below it. Escape, a click
 * outside or moving focus away closes it; Escape returns focus to the trigger. Used for the
 * header's environment details, grid column choices and "more actions" menus.
 *
 * It is the disclosure pattern (aria-expanded + aria-controls), not an ARIA menu, so the panel
 * holds ordinary buttons, links and checkboxes reachable with Tab.
 */
export function Popover({
  trigger,
  label,
  children,
  align = "end",
  className,
  panelClassName,
  triggerClassName,
}: {
  /** Visible content of the trigger button. */
  trigger: ReactNode;
  /** Accessible name of the trigger (and of the panel). */
  label: string;
  /** The panel; a function receives `close` for actions that should dismiss it. */
  children: ReactNode | ((close: () => void) => ReactNode);
  align?: "start" | "end";
  className?: string;
  panelClassName?: string;
  triggerClassName?: string;
}) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const panelId = useId();
  const close = useCallback(() => setOpen(false), []);

  useEffect(() => {
    if (!open) return;
    const onPointer = (e: PointerEvent) => {
      if (rootRef.current && e.target instanceof Node && !rootRef.current.contains(e.target)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "Escape") return;
      setOpen(false);
      triggerRef.current?.focus();
    };
    document.addEventListener("pointerdown", onPointer);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("pointerdown", onPointer);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  return (
    <div
      ref={rootRef}
      className={cn("relative", className)}
      onBlur={(e) => {
        if (open && e.relatedTarget instanceof Node && !e.currentTarget.contains(e.relatedTarget)) setOpen(false);
      }}
    >
      <button
        ref={triggerRef}
        type="button"
        aria-expanded={open}
        aria-controls={panelId}
        aria-label={label}
        onClick={() => setOpen((v) => !v)}
        className={triggerClassName}
      >
        {trigger}
      </button>
      <div
        id={panelId}
        role="group"
        aria-label={label}
        hidden={!open}
        className={cn(
          "absolute top-full z-30 mt-1.5 min-w-56 rounded-lg border border-line bg-surface p-1.5 text-sm shadow-[var(--shadow-pop)]",
          align === "end" ? "right-0" : "left-0",
          panelClassName,
        )}
      >
        {open ? (typeof children === "function" ? children(close) : children) : null}
      </div>
    </div>
  );
}

/** A full-width row button inside a Popover panel. */
export function PopoverItem({
  onClick,
  children,
  tone = "neutral",
  disabled,
}: {
  onClick: () => void;
  children: ReactNode;
  tone?: "neutral" | "block";
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={cn(
        "flex w-full items-center gap-2 rounded-md px-2.5 py-2 text-left text-sm font-medium transition-colors",
        "disabled:cursor-not-allowed disabled:text-ink-3",
        tone === "block" ? "text-block hover:bg-block-soft" : "text-ink-2 hover:bg-canvas hover:text-ink",
      )}
    >
      {children}
    </button>
  );
}
