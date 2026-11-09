import { currencyExponent, formatMoney } from "@qm/contracts";

/** Formats integer minor units. Falls back gracefully for unknown currencies. */
export function money(minor: number | null | undefined, currency = "USD"): string {
  if (minor === null || minor === undefined || !Number.isFinite(minor)) return "—";
  try {
    return formatMoney(minor, currency);
  } catch {
    return `${(minor / 100).toFixed(2)} ${currency}`;
  }
}

/** Minor units -> dollars string for an input field ("12345" -> "123.45"). */
export function minorToInput(minor: number, currency = "USD"): string {
  const exp = safeExponent(currency);
  return (minor / 10 ** exp).toFixed(exp);
}

/** Digits with optional thousands separators in the right places ("1,234,567"), then optional decimals. */
const GROUPED_AMOUNT = /^(\d{1,3}(?:,\d{3})+|\d+)(?:\.(\d*))?$/;

/**
 * Dollars typed by a user -> integer minor units. Returns null for invalid input
 * (negative, non-numeric, or more decimals than the currency allows). Commas are
 * accepted only as thousands separators: "1,234.50" is fine, but "12,50" (a
 * decimal comma) is rejected rather than read as 1,250.
 */
export function inputToMinor(value: string, currency = "USD"): number | null {
  const exp = safeExponent(currency);
  const trimmed = value.trim().replace(/^\$\s*/, "");
  if (trimmed === "") return null;
  const match = GROUPED_AMOUNT.exec(trimmed);
  if (!match) return null;
  const whole = (match[1] ?? "0").replace(/,/g, "");
  const frac = match[2] ?? "";
  if (frac.length > exp) return null;
  const minor = Number(`${whole}${frac.padEnd(exp, "0")}`);
  return Number.isSafeInteger(minor) ? minor : null;
}

function safeExponent(currency: string): number {
  try {
    return currencyExponent(currency);
  } catch {
    return 2;
  }
}

/**
 * Minor units -> major units as a plain number, for chart scales only. Money
 * arithmetic and display stay in integer minor units (`money`).
 */
export function minorToMajor(minor: number, currency = "USD"): number {
  return minor / 10 ** safeExponent(currency);
}

/** Whole-unit money for chart axis ticks, e.g. "$1,500". */
export function moneyTick(major: number, currency = "USD"): string {
  try {
    return new Intl.NumberFormat("en-US", { style: "currency", currency, maximumFractionDigits: 0 }).format(major);
  } catch {
    return `${Math.round(major)} ${currency}`;
  }
}

/** The narrow symbol for a currency ("$", "€", "¥"), or its code if there isn't one. */
export function currencySymbol(currency = "USD"): string {
  try {
    const parts = new Intl.NumberFormat("en-US", { style: "currency", currency, currencyDisplay: "narrowSymbol" }).formatToParts(0);
    return parts.find((p) => p.type === "currency")?.value ?? currency;
  } catch {
    return currency;
  }
}

const numberFmt = new Intl.NumberFormat("en-US", { maximumFractionDigits: 2 });
export function num(value: number | null | undefined, digits?: number): string {
  if (value === null || value === undefined || !Number.isFinite(value)) return "—";
  if (digits !== undefined) {
    return new Intl.NumberFormat("en-US", { minimumFractionDigits: digits, maximumFractionDigits: digits }).format(value);
  }
  return numberFmt.format(value);
}

export function pct(value: number, digits = 0): string {
  return `${(value * 100).toFixed(digits)}%`;
}

/** "Forecast assumes 25% busier than normal" style phrasing for a demand multiplier. */
export function describeDemandMultiplier(multiplier: number): string {
  const delta = Math.round((multiplier - 1) * 100);
  if (delta === 0) return "Forecast assumes normal demand";
  if (delta > 0) return `Forecast assumes ${delta}% busier than normal`;
  return `Forecast assumes ${Math.abs(delta)}% quieter than normal`;
}

const dateFmt = new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", year: "numeric" });
const dateTimeFmt = new Intl.DateTimeFormat("en-US", {
  month: "short",
  day: "numeric",
  hour: "numeric",
  minute: "2-digit",
});
const shortDateFmt = new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric" });

function toDate(value: string | Date): Date | null {
  // Bare YYYY-MM-DD dates are calendar dates, not instants: render them in local time.
  const d = typeof value === "string" && /^\d{4}-\d{2}-\d{2}$/.test(value) ? new Date(`${value}T00:00:00`) : new Date(value);
  return Number.isNaN(d.getTime()) ? null : d;
}

export function date(value: string | null | undefined): string {
  if (!value) return "—";
  const d = toDate(value);
  return d ? dateFmt.format(d) : value;
}

export function shortDate(value: string | null | undefined): string {
  if (!value) return "—";
  const d = toDate(value);
  return d ? shortDateFmt.format(d) : value;
}

export function dateTime(value: string | null | undefined): string {
  if (!value) return "—";
  const d = toDate(value);
  return d ? dateTimeFmt.format(d) : value;
}

const relFmt = new Intl.RelativeTimeFormat("en-US", { numeric: "auto" });
export function relativeTime(value: string | null | undefined, now = Date.now()): string {
  if (!value) return "—";
  const d = toDate(value);
  if (!d) return value;
  const seconds = Math.round((d.getTime() - now) / 1000);
  const abs = Math.abs(seconds);
  if (abs < 45) return relFmt.format(seconds, "second");
  if (abs < 45 * 60) return relFmt.format(Math.round(seconds / 60), "minute");
  if (abs < 22 * 3600) return relFmt.format(Math.round(seconds / 3600), "hour");
  return relFmt.format(Math.round(seconds / 86400), "day");
}

export function duration(ms: number | null | undefined): string {
  if (ms === null || ms === undefined || !Number.isFinite(ms)) return "—";
  if (ms < 1000) return `${Math.round(ms)} ms`;
  const s = ms / 1000;
  if (s < 60) return `${s.toFixed(s < 10 ? 1 : 0)} s`;
  const m = Math.floor(s / 60);
  const rem = Math.round(s % 60);
  return `${m}m ${rem.toString().padStart(2, "0")}s`;
}

/** Countdown text like "14:32" until an ISO instant; returns null once passed. */
export function countdown(untilIso: string, now = Date.now()): string | null {
  const remaining = new Date(untilIso).getTime() - now;
  if (!Number.isFinite(remaining) || remaining <= 0) return null;
  const total = Math.floor(remaining / 1000);
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  const mm = m.toString().padStart(2, "0");
  const ss = s.toString().padStart(2, "0");
  return h > 0 ? `${h}:${mm}:${ss}` : `${mm}:${ss}`;
}

/** "sha256:abcdef…123456" for display; the full value is always kept for copy/submit. */
export function truncateMiddle(value: string, head = 14, tail = 8): string {
  if (value.length <= head + tail + 1) return value;
  return `${value.slice(0, head)}…${value.slice(-tail)}`;
}

/** SCREAMING_SNAKE -> "Screaming snake". */
export function humanize(code: string): string {
  const s = code.replace(/[_-]+/g, " ").trim().toLowerCase();
  return s.charAt(0).toUpperCase() + s.slice(1);
}

export function todayIso(offsetDays = 0): string {
  const d = new Date();
  d.setDate(d.getDate() + offsetDays);
  const y = d.getFullYear();
  const m = (d.getMonth() + 1).toString().padStart(2, "0");
  const day = d.getDate().toString().padStart(2, "0");
  return `${y}-${m}-${day}`;
}
