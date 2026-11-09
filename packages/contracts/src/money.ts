/**
 * Money is always handled as integer minor units (e.g. cents) inside the system.
 * Conversion to decimal strings happens only at integration boundaries (PayPal, UI).
 */

export const SUPPORTED_CURRENCIES = ["USD"] as const;
export type Currency = (typeof SUPPORTED_CURRENCIES)[number];

const CURRENCY_EXPONENT: Record<string, number> = {
  USD: 2,
  EUR: 2,
  GBP: 2,
  CAD: 2,
  AUD: 2,
  JPY: 0,
};

export function currencyExponent(currency: string): number {
  const exp = CURRENCY_EXPONENT[currency.toUpperCase()];
  if (exp === undefined) throw new Error(`Unsupported currency: ${currency}`);
  return exp;
}

export function assertMinor(value: number, label = "amount"): void {
  if (!Number.isSafeInteger(value)) {
    throw new Error(`${label} must be a safe integer in minor units, received ${value}`);
  }
}

/** 12345 USD -> "123.45" (PayPal decimal string format). */
export function minorToDecimalString(minor: number, currency: string): string {
  assertMinor(minor);
  const exp = currencyExponent(currency);
  const negative = minor < 0;
  const abs = Math.abs(minor).toString();
  if (exp === 0) return (negative ? "-" : "") + abs;
  const padded = abs.padStart(exp + 1, "0");
  const whole = padded.slice(0, padded.length - exp);
  const frac = padded.slice(padded.length - exp);
  return `${negative ? "-" : ""}${whole}.${frac}`;
}

/** "123.45" USD -> 12345. Rejects values with more precision than the currency allows. */
export function decimalStringToMinor(value: string, currency: string): number {
  const exp = currencyExponent(currency);
  const match = /^(-)?(\d+)(?:\.(\d+))?$/.exec(value.trim());
  if (!match) throw new Error(`Invalid decimal amount: ${value}`);
  const [, sign, whole, frac = ""] = match;
  if (frac.length > exp) {
    if (/^0*$/.test(frac.slice(exp))) {
      // trailing zeros beyond precision are harmless ("10.500")
    } else {
      throw new Error(`Amount ${value} exceeds ${currency} precision`);
    }
  }
  const fracPadded = frac.slice(0, exp).padEnd(exp, "0");
  const minor = Number(`${whole}${fracPadded}`);
  assertMinor(minor);
  // "-0" / "-0.00" is zero, never IEEE negative zero (which survives === but not Object.is).
  return sign && minor !== 0 ? -minor : minor;
}

/**
 * Converts a floating price from an external source (e.g. Channel3 `19.99`) to minor units,
 * rounding half away from zero at the currency's precision.
 *
 * `Math.round(value * 100)` is wrong at decimal midpoints because the binary product drifts:
 * `1.005 * 100` is `100.49999999999999` (→ 100) and `10.075 * 100` is `1007.4999999999999`
 * (→ 1007). Instead the float is first rendered with 15 significant digits — the precision a
 * double is guaranteed to round-trip, which removes the binary noise ("1.00500000000000") — and
 * that decimal string is rounded exactly with BigInt arithmetic. Throws for non-finite input or
 * a result that is not a safe integer.
 */
export function floatToMinor(value: number, currency: string): number {
  if (typeof value !== "number" || !Number.isFinite(value)) throw new Error(`Invalid price ${value}`);
  const exp = currencyExponent(currency);
  // toPrecision(15) yields "d.ddd…", "ddd.ddd…" or "d.ddd…e±n".
  const m = /^(-)?(\d+)(?:\.(\d+))?(?:e([+-]\d+))?$/.exec(value.toPrecision(15));
  if (!m) throw new Error(`Invalid price ${value}`);
  const [, sign, whole, frac = "", e = "0"] = m;
  const digits = BigInt(whole! + frac);
  // value = digits × 10^(e − frac.length), so minor = digits × 10^(e − frac.length + exp).
  const shift = Number(e) - frac.length + exp;
  let minorBig: bigint;
  if (shift >= 0) {
    minorBig = digits * 10n ** BigInt(shift);
  } else {
    const d = 10n ** BigInt(-shift);
    minorBig = digits / d;
    if (2n * (digits % d) >= d) minorBig += 1n;
  }
  const minor = Number(minorBig);
  assertMinor(minor, "converted price");
  return sign && minor !== 0 ? -minor : minor;
}

export function formatMoney(minor: number, currency: string, locale = "en-US"): string {
  const exp = currencyExponent(currency);
  return new Intl.NumberFormat(locale, {
    style: "currency",
    currency,
    minimumFractionDigits: exp,
    maximumFractionDigits: exp,
  }).format(minor / 10 ** exp);
}

export const MAX_BPS = 10_000;

/** True for an integer basis-point rate in [0, 10 000] (0–100 %). */
export function isValidBps(bps: number): boolean {
  return Number.isInteger(bps) && bps >= 0 && bps <= MAX_BPS;
}

/**
 * Basis-point percentage of an amount, rounded half-up (towards +∞, like `Math.round`).
 * 825 bps = 8.25%. Exact for every safe-integer amount: the product is computed in BigInt, so
 * `minor * bps` can never lose precision above 2^53. This is the single tax-rounding rule shared
 * by quote building and policy evaluation.
 */
export function applyBps(minor: number, bps: number): number {
  assertMinor(minor);
  if (!isValidBps(bps)) throw new Error(`Basis points must be an integer between 0 and ${MAX_BPS}, received ${bps}`);
  const d = 10_000n;
  const n = BigInt(minor) * BigInt(bps);
  let q = n / d;
  let r = n % d;
  if (r < 0n) {
    q -= 1n;
    r += d;
  }
  if (2n * r >= d) q += 1n;
  const result = Number(q);
  assertMinor(result, "basis-point result");
  return result;
}
