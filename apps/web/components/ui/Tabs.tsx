"use client";

import { useRef, type HTMLAttributes, type KeyboardEvent, type ReactNode } from "react";
import { cn } from "./cn";

export interface TabItem<K extends string> {
  key: K;
  label: ReactNode;
  /** Shown as a pill after the label, e.g. 42 or "100+". */
  count?: ReactNode;
}

const tabId = (idBase: string, key: string) => `${idBase}-tab-${key}`;
const panelId = (idBase: string, key: string) => `${idBase}-panel-${key}`;

/** Props for the element that renders the active tab's content. */
export function tabPanelProps(idBase: string, key: string): HTMLAttributes<HTMLDivElement> {
  return { id: panelId(idBase, key), role: "tabpanel", "aria-labelledby": tabId(idBase, key), tabIndex: 0 };
}

/**
 * WAI-ARIA tablist with arrow-key navigation. The caller renders the active
 * panel with `tabPanelProps(idBase, value)`, which wires aria-controls/labelledby.
 */
export function Tabs<K extends string>({
  items,
  value,
  onChange,
  label,
  idBase,
}: {
  items: TabItem<K>[];
  value: K;
  onChange: (key: K) => void;
  label: string;
  /** Shared with `tabPanelProps` so each tab and its panel reference each other. */
  idBase: string;
}) {
  const refs = useRef<Array<HTMLButtonElement | null>>([]);

  function onKeyDown(e: KeyboardEvent<HTMLButtonElement>, index: number) {
    let next = index;
    if (e.key === "ArrowRight") next = (index + 1) % items.length;
    else if (e.key === "ArrowLeft") next = (index - 1 + items.length) % items.length;
    else if (e.key === "Home") next = 0;
    else if (e.key === "End") next = items.length - 1;
    else return;
    e.preventDefault();
    const item = items[next];
    if (item) {
      onChange(item.key);
      refs.current[next]?.focus();
    }
  }

  return (
    <div role="tablist" aria-label={label} className="flex gap-1 overflow-x-auto border-b border-line">
      {items.map((item, i) => {
        const selected = item.key === value;
        return (
          <button
            key={item.key}
            ref={(el) => {
              refs.current[i] = el;
            }}
            id={tabId(idBase, item.key)}
            role="tab"
            type="button"
            aria-selected={selected}
            aria-controls={selected ? panelId(idBase, item.key) : undefined}
            tabIndex={selected ? 0 : -1}
            onClick={() => onChange(item.key)}
            onKeyDown={(e) => onKeyDown(e, i)}
            className={cn(
              "-mb-px flex items-center gap-2 border-b-2 px-3 py-2.5 text-sm font-medium whitespace-nowrap transition-colors",
              selected ? "border-accent text-ink" : "border-transparent text-ink-3 hover:text-ink",
            )}
          >
            {item.label}
            {item.count !== undefined ? (
              <span
                className={cn(
                  "tnum rounded-full px-1.5 text-2xs",
                  selected ? "bg-accent-soft text-accent-strong" : "bg-ink/[0.05] text-ink-3",
                )}
              >
                {item.count}
              </span>
            ) : null}
          </button>
        );
      })}
    </div>
  );
}
