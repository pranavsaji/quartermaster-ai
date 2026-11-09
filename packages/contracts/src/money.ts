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
  return sign ? -minor : minor;
}

/** Converts a floating price from an external source (e.g. Channel3 `19.99`) to minor units. */
export function floatToMinor(value: number, currency: string): number {
  if (!Number.isFinite(value)) throw new Error(`Invalid price ${value}`);
  const exp = currencyExponent(currency);
  return Math.round(value * 10 ** exp);
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

/** Basis-point percentage of an amount, rounded half-up. 825 bps = 8.25%. */
export function applyBps(minor: number, bps: number): number {
  assertMinor(minor);
  return Math.round((minor * bps) / 10_000);
}
