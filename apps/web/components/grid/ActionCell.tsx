"use client";

import type { ColDef, SuppressKeyboardEventParams } from "ag-grid-community";
import { forwardRef, useEffect, useRef, type ButtonHTMLAttributes, type ReactNode } from "react";
import { cn } from "@/components/ui/cn";

const FOCUSABLE = "a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex='-1'])";

function focusablesIn(el: Element | null): HTMLElement[] {
  return el ? Array.from(el.querySelectorAll<HTMLElement>(FOCUSABLE)) : [];
}

/**
 * Keyboard access to buttons and links inside AG Grid cells. Arrow keys move
 * between cells as usual; when a cell with controls gets focus, focus moves to
 * its first control, Enter/Space activate it natively (the grid would otherwise
 * swallow them), and Tab/Shift+Tab move between controls within the cell before
 * the grid moves on.
 */
export function suppressControlKeys<T>({ event }: SuppressKeyboardEventParams<T>): boolean {
  const target = event.target instanceof HTMLElement ? event.target : null;
  const cell = target?.closest(".ag-cell");
  if (!target || !cell || target === cell) return false;
  if (event.key === "Enter" || event.key === " ") return true;
  // A <select> in a cell keeps its own arrow keys (changing the option) rather than moving the grid.
  if (target instanceof HTMLSelectElement && event.key.startsWith("Arrow")) return true;
  if (event.key === "Tab") {
    const controls = focusablesIn(cell);
    const index = controls.indexOf(target);
    return event.shiftKey ? index > 0 : index >= 0 && index < controls.length - 1;
  }
  return false;
}

/** Column settings for any column whose cells render buttons or links. */
export function controlColumn<T>(): Partial<ColDef<T>> {
  return { suppressKeyboardEvent: suppressControlKeys };
}

/** Wraps a cell renderer's controls and hands focus to the first one when the grid focuses the cell. */
export function ActionCell({ eGridCell, className, children }: { eGridCell: HTMLElement; className?: string; children: ReactNode }) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const onFocus = (e: FocusEvent) => {
      if (e.target === eGridCell) focusablesIn(ref.current)[0]?.focus();
    };
    eGridCell.addEventListener("focus", onFocus);
    return () => eGridCell.removeEventListener("focus", onFocus);
  }, [eGridCell]);

  return (
    <div ref={ref} className={cn("qm-actions flex h-full items-center gap-1.5", className)}>
      {children}
    </div>
  );
}

/**
 * The one button style for actions inside a grid row: quiet text buttons, so a row of
 * actions reads as a set and never competes with the page's primary button.
 */
export const RowAction = forwardRef<HTMLButtonElement, ButtonHTMLAttributes<HTMLButtonElement>>(function RowAction(
  { className, type = "button", ...rest },
  ref,
) {
  return (
    <button
      ref={ref}
      type={type}
      className={cn(
        "inline-flex h-7 items-center rounded-md px-2 text-[12.5px] font-medium text-accent-strong transition-colors",
        "hover:bg-accent-soft focus-visible:ring-3 focus-visible:ring-accent/25 focus-visible:outline-none",
        "disabled:cursor-not-allowed disabled:text-ink-4 disabled:hover:bg-transparent",
        className,
      )}
      {...rest}
    />
  );
});
