import { createHash } from "node:crypto";

/**
 * Deterministic JSON encoding used for anything that is hashed or signed.
 *
 * Rules (a strict subset of RFC 8785 / JCS that is sufficient for our payloads):
 *  - object keys sorted by UTF-16 code unit order
 *  - no insignificant whitespace
 *  - only strings, booleans, null, safe integers, arrays and plain objects are allowed
 *  - `undefined` object members are omitted; floats and non-finite numbers are rejected
 *
 * Rejecting floats is deliberate: every amount in TrustRail is integer minor units, so a
 * float in a signed payload indicates a bug, and float serialisation is a classic source of
 * hash drift between implementations.
 */
export type CanonicalValue =
  | string
  | number
  | boolean
  | null
  | CanonicalValue[]
  | { [key: string]: CanonicalValue | undefined };

export function canonicalize(value: unknown): string {
  return encode(value, "$");
}

function encode(value: unknown, path: string): string {
  if (value === null) return "null";
  switch (typeof value) {
    case "string":
      return JSON.stringify(value);
    case "boolean":
      return value ? "true" : "false";
    case "number":
      if (!Number.isSafeInteger(value)) {
        throw new TypeError(`Canonical encoding only supports safe integers (at ${path}: ${value})`);
      }
      return Object.is(value, -0) ? "0" : String(value);
    case "object": {
      if (Array.isArray(value)) {
        return `[${value.map((v, i) => encode(v, `${path}[${i}]`)).join(",")}]`;
      }
      const proto = Object.getPrototypeOf(value);
      if (proto !== Object.prototype && proto !== null) {
        throw new TypeError(`Canonical encoding only supports plain objects (at ${path})`);
      }
      const entries = Object.entries(value as Record<string, unknown>)
        .filter(([, v]) => v !== undefined)
        .sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0));
      return `{${entries.map(([k, v]) => `${JSON.stringify(k)}:${encode(v, `${path}.${k}`)}`).join(",")}}`;
    }
    default:
      throw new TypeError(`Unsupported value of type ${typeof value} at ${path}`);
  }
}

export function sha256Hex(input: string | Buffer): string {
  return createHash("sha256").update(input).digest("hex");
}

/** `sha256:<hex>` digest of the canonical encoding of `value`. */
export function digest(value: unknown): string {
  return `sha256:${sha256Hex(canonicalize(value))}`;
}
