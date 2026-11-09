/**
 * Parsing for numbers typed into form fields. `Number("")` is 0 and
 * `Number("1e3")` is 1000, so raw `Number(value)` silently turns a cleared field
 * into a valid-looking zero; these helpers return null instead and produce
 * field-level messages a person can act on.
 */

const DECIMAL = /^-?\d+(?:\.\d+)?$/;

/** A plain decimal number (`12`, `-3`, `1.5`), or null for blank or anything else. */
export function parseNumberInput(value: string): number | null {
  const trimmed = value.trim();
  if (!DECIMAL.test(trimmed)) return null;
  const n = Number(trimmed);
  return Number.isFinite(n) ? n : null;
}

export interface NumberRule {
  min?: number;
  max?: number;
  /** Require a whole number. */
  integer?: boolean;
}

export type NumberCheck = { ok: true; value: number } | { ok: false; error: string };

function rangeMessage({ min, max }: NumberRule): string | null {
  if (min !== undefined && max !== undefined) return `Enter a value from ${min} to ${max}.`;
  if (min !== undefined) return `Enter ${min} or more.`;
  if (max !== undefined) return `Enter ${max} or less.`;
  return null;
}

/** Parses and validates a required numeric field, with a human message on failure. */
export function checkNumber(value: string, rule: NumberRule = {}): NumberCheck {
  if (value.trim() === "") return { ok: false, error: "This field is required." };
  const n = parseNumberInput(value);
  if (n === null) return { ok: false, error: "Enter a number using digits, like 12 or 1.5." };
  if (rule.integer && !Number.isInteger(n)) return { ok: false, error: "Use a whole number." };
  if ((rule.min !== undefined && n < rule.min) || (rule.max !== undefined && n > rule.max)) {
    return { ok: false, error: rangeMessage(rule) ?? "Enter a valid number." };
  }
  return { ok: true, value: n };
}
