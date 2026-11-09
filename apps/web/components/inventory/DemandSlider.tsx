"use client";

import { useId } from "react";
import { describeDemandMultiplier, num } from "@/lib/format";

/** Demand multiplier slider (0.5×–3×) that always states its assumption in words. */
export function DemandSlider({
  value,
  onChange,
  disabled,
  min = 0.5,
  max = 3,
}: {
  value: number;
  onChange: (value: number) => void;
  disabled?: boolean;
  min?: number;
  max?: number;
}) {
  const id = useId();
  const assumption = describeDemandMultiplier(value);
  return (
    <div>
      <div className="flex items-baseline justify-between gap-3">
        <label htmlFor={id} className="text-[13px] font-medium text-ink-2">
          Demand multiplier
        </label>
        <span className="tnum text-[15px] font-semibold text-ink">{num(value, 2)}×</span>
      </div>
      <input
        id={id}
        type="range"
        min={min}
        max={max}
        step={0.05}
        value={value}
        disabled={disabled}
        onChange={(e) => onChange(Number(e.target.value))}
        aria-valuetext={`${num(value, 2)} times normal. ${assumption}`}
        className="mt-2 w-full accent-[var(--color-accent)] disabled:opacity-50"
      />
      <div className="tnum flex justify-between text-[11px] text-ink-4" aria-hidden>
        <span>{min}×</span>
        <span>1×</span>
        <span>2×</span>
        <span>{max}×</span>
      </div>
      <p className="mt-2 rounded-md bg-accent-soft px-2.5 py-1.5 text-[13px] font-medium text-accent-strong" aria-live="polite">
        {assumption}
      </p>
    </div>
  );
}
