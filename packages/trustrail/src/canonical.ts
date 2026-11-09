import { createHash } from "node:crypto";

/**
 * Deterministic JSON encoding used for anything that is hashed or signed.
 *
 * Rules (a strict subset of RFC 8785 / JCS that is sufficient for our payloads):
 *  - object keys sorted by UTF-16 code unit order
 *  - no insignificant whitespace
 *  - only strings, booleans, null, safe integers, arrays and plain objects are allowed
 *  - `undefined` object members are omitted; floats and non-finite numbers are rejected
 *  - sparse arrays (holes) and cyclic structures are rejected with a TypeError
 *  - strings are encoded as given: there is NO Unicode normalisation (NFC/NFKC). "é" as one
 *    code point and "e" + U+0301 hash differently; callers that need equivalence must
 *    normalise before hashing
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
  return encode(value, "$", new Set());
}

/** `ancestors` holds the objects on the current path, so shared (acyclic) references stay legal. */
function encode(value: unknown, path: string, ancestors: Set<object>): string {
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
      if (ancestors.has(value)) throw new TypeError(`Canonical encoding does not support cyclic structures (at ${path})`);
      ancestors.add(value);
      try {
        if (Array.isArray(value)) {
          const parts: string[] = [];
          for (let i = 0; i < value.length; i++) {
            // `map` skips holes and would emit "[1,,3]", which is not JSON.
            if (!(i in value)) throw new TypeError(`Canonical encoding does not support sparse arrays (at ${path}[${i}])`);
            parts.push(encode(value[i], `${path}[${i}]`, ancestors));
          }
          return `[${parts.join(",")}]`;
        }
        const proto = Object.getPrototypeOf(value);
        if (proto !== Object.prototype && proto !== null) {
          throw new TypeError(`Canonical encoding only supports plain objects (at ${path})`);
        }
        const entries = Object.entries(value as Record<string, unknown>)
          .filter(([, v]) => v !== undefined)
          .sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0));
        return `{${entries.map(([k, v]) => `${JSON.stringify(k)}:${encode(v, `${path}.${k}`, ancestors)}`).join(",")}}`;
      } finally {
        ancestors.delete(value);
      }
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
