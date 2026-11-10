"use client";

import { useId } from "react";
import { describeDemandMultiplier, num } from "@/lib/format";

/** The track's labels: both ends and every whole multiple in between. */
export function ticks(min: number, max: number): number[] {
  const inner: number[] = [];
  for (let t = Math.ceil(min); t <= Math.floor(max); t++) if (t > min && t < max) inner.push(t);
  return [min, ...inner, max];
}

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
        <label htmlFor={id} className="text-sm font-medium text-ink-2">
          Demand multiplier
        </label>
        <span className="tnum text-base font-semibold text-ink">{num(value, 2)}×</span>
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
      {/* Each tick sits under its value on the track (1× is a fifth of the way along, not a third). */}
      <div className="tnum relative mt-0.5 h-4 text-2xs text-ink-4" aria-hidden>
        {ticks(min, max).map((t, i, all) => (
          <span
            key={t}
            className="absolute top-0"
            style={{
              left: `${((t - min) / (max - min)) * 100}%`,
              transform: i === 0 ? undefined : i === all.length - 1 ? "translateX(-100%)" : "translateX(-50%)",
            }}
          >
            {num(t)}×
          </span>
        ))}
      </div>
      {/* Not a live region: the slider's aria-valuetext already announces this as it moves. */}
      <p className="mt-2 rounded-md bg-accent-soft px-2.5 py-1.5 text-sm font-medium text-accent-strong">{assumption}</p>
    </div>
  );
}
