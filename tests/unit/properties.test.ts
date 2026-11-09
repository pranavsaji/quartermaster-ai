import fc from "fast-check";
import { describe, expect, it } from "vitest";
import { decimalStringToMinor, minorToDecimalString, POLICY_DECISIONS } from "@qm/contracts";
import { normalizeInvoiceNumber, parsePackQuantity } from "@qm/quartermaster";
import {
  buildCart,
  canonicalize,
  checkCartArithmetic,
  detectPromptInjection,
  evaluatePolicy,
  fenceUntrusted,
  normalizeUntrustedText,
  type CartLine,
  type PolicyInput,
} from "@qm/trustrail";
import { baseInput } from "../helpers/fixtures";

const RUNS = { numRuns: 300 };

/** Values the canonical encoder accepts: strings, booleans, null, safe integers, arrays, plain objects. */
const key = fc.string({ maxLength: 8 }).filter((k) => k !== "__proto__");
const canonicalValue = fc.letrec((tie) => ({
  value: fc.oneof(
    { depthSize: "small", withCrossShrink: true },
    fc.string({ maxLength: 12 }),
    fc.boolean(),
    fc.constant(null),
    fc.maxSafeInteger(),
    fc.array(tie("value"), { maxLength: 4 }),
    fc.dictionary(key, tie("value"), { maxKeys: 4 }),
  ),
})).value;

/** Rebuilds every object with its keys in reverse insertion order. */
function permuteKeys(v: unknown): unknown {
  if (Array.isArray(v)) return v.map(permuteKeys);
  if (v && typeof v === "object") {
    const out: Record<string, unknown> = {};
    for (const k of Object.keys(v).reverse()) out[k] = permuteKeys((v as Record<string, unknown>)[k]);
    return out;
  }
  return v;
}

describe("property: canonical encoding", () => {
  it("is idempotent through JSON and produces valid JSON", () => {
    fc.assert(
      fc.property(canonicalValue, (v) => {
        const once = canonicalize(v);
        expect(canonicalize(JSON.parse(once))).toBe(once);
      }),
      RUNS,
    );
  });

  it("is invariant under object key permutation", () => {
    fc.assert(
      fc.property(canonicalValue, (v) => {
        expect(canonicalize(permuteKeys(v))).toBe(canonicalize(v));
      }),
      RUNS,
    );
  });

  it("rejects every non-integer number", () => {
    fc.assert(
      fc.property(
        fc.double().filter((d) => !Number.isSafeInteger(d)),
        (d) => {
          expect(() => canonicalize({ d })).toThrow(TypeError);
        },
      ),
      RUNS,
    );
  });
});

describe("property: money", () => {
  it("round-trips every safe integer through the decimal string (USD and JPY), never yielding -0", () => {
    fc.assert(
      fc.property(fc.maxSafeInteger(), fc.constantFrom("USD", "JPY"), (minor, currency) => {
        const s = minorToDecimalString(minor, currency);
        const back = decimalStringToMinor(s, currency);
        expect(back).toBe(minor);
        expect(Object.is(back, -0)).toBe(false);
      }),
      RUNS,
    );
  });

  it("round-trips decimal strings with exactly two places", () => {
    fc.assert(
      fc.property(
        fc.bigInt({ min: 0n, max: 90_071_992_547_408n }),
        fc.integer({ min: 0, max: 99 }),
        fc.boolean(),
        (whole, cents, negative) => {
          const s = `${negative && (whole > 0n || cents > 0) ? "-" : ""}${whole}.${String(cents).padStart(2, "0")}`;
          expect(minorToDecimalString(decimalStringToMinor(s, "USD"), "USD")).toBe(s);
        },
      ),
      RUNS,
    );
  });
});

describe("property: carts", () => {
  const amount = fc.integer({ min: 0, max: 1_000_000 });
  const line: fc.Arbitrary<CartLine> = fc.oneof(
    fc
      .record({ quantity: fc.integer({ min: 1, max: 10_000 }), unit: amount, sku: fc.string({ minLength: 1, maxLength: 6 }) })
      .map(({ quantity, unit, sku }): CartLine => ({
        kind: "PRODUCT",
        sku,
        description: sku,
        category: "food_packaging",
        quantity,
        unit_price_minor: unit,
        line_total_minor: quantity * unit,
      })),
    fc
      .record({ kind: fc.constantFrom("SHIPPING" as const, "FEE" as const, "TAX" as const), amount })
      .map(({ kind, amount: a }): CartLine => ({
        kind,
        sku: kind === "TAX" ? null : "X",
        description: kind,
        category: null,
        quantity: 1,
        unit_price_minor: a,
        line_total_minor: a,
      })),
  );

  it("buildCart always produces a cart that passes checkCartArithmetic", () => {
    fc.assert(
      fc.property(fc.array(line, { maxLength: 12 }), (lines) => {
        expect(checkCartArithmetic(buildCart("s", "USD", lines))).toEqual([]);
      }),
      RUNS,
    );
  });
});

describe("property: policy evaluation is total", () => {
  const PATHS = [
    "cart.total_minor",
    "cart.subtotal_minor",
    "cart.lines.0.quantity",
    "cart.lines.0.unit_price_minor",
    "cart.lines.0.line_total_minor",
    "cart.lines.0.kind",
    "cart.lines.0.sku",
    "cart.lines",
    "cart.currency",
    "budget.limit_minor",
    "budget.spent_minor",
    "budget",
    "request_budget_limit_minor",
    "mandate.per_order_limit_minor",
    "mandate.weekly_budget_minor",
    "mandate.max_quantity_multiple_of_need",
    "mandate.duplicate_window_hours",
    "mandate.approved_supplier_ids",
    "mandate",
    "supplier.tax_rate_bps",
    "supplier.fee_terms",
    "supplier",
    "catalog",
    "catalog.0.unit_price_minor",
    "market.0.reference_unit_price_minor",
    "market.0.candidate_unit_price_minor",
    "market.0.observed_at",
    "market",
    "needed_units_by_sku.TK-250",
    "pack_quantity_by_sku.TK-250",
    "prior_orders",
    "quarantined_source_ids",
    "now",
    "market_reference_max_age_hours",
  ] as const;

  const weird = fc.oneof(
    fc.double(),
    fc.integer(),
    fc.constantFrom(Number.NaN, Number.POSITIVE_INFINITY, Number.NEGATIVE_INFINITY, -0, 0.5, Number.MAX_SAFE_INTEGER + 2, -1),
    fc.string({ maxLength: 8 }),
    fc.constant(null),
    fc.constant(undefined),
    fc.boolean(),
    fc.date({ noInvalidDate: false }),
    fc.array(fc.anything(), { maxLength: 3 }),
    fc.object({ maxDepth: 1 }),
  );

  function set(target: Record<string, unknown>, path: string, value: unknown) {
    const parts = path.split(".");
    let cur: Record<string, unknown> | undefined = target;
    for (const p of parts.slice(0, -1)) {
      const next = cur?.[p];
      if (!next || typeof next !== "object") return;
      cur = next as Record<string, unknown>;
    }
    if (cur) cur[parts.at(-1)!] = value;
  }

  it("never throws and always returns a well-formed decision", () => {
    fc.assert(
      fc.property(fc.array(fc.tuple(fc.constantFrom(...PATHS), weird), { minLength: 1, maxLength: 4 }), (mutations) => {
        const input = structuredClone(baseInput()) as unknown as Record<string, unknown>;
        for (const [path, value] of mutations) set(input, path, value);
        let r!: ReturnType<typeof evaluatePolicy>;
        expect(() => (r = evaluatePolicy(input as unknown as PolicyInput))).not.toThrow();
        expect(POLICY_DECISIONS).toContain(r.decision);
        expect(r.input_digest).toMatch(/^sha256:[a-f0-9]{64}$/);
        expect(typeof r.human_approval_required).toBe("boolean");
        if (r.decision !== "ALLOW") expect(r.human_approval_required).toBe(true);
        if (r.decision === "BLOCK") expect(r.violations.some((v) => v.severity === "BLOCK")).toBe(true);
      }),
      { numRuns: 500 },
    );
  });

  it("is deterministic for any input", () => {
    fc.assert(
      fc.property(fc.array(fc.tuple(fc.constantFrom(...PATHS), weird), { maxLength: 3 }), (mutations) => {
        const make = () => {
          const input = structuredClone(baseInput()) as unknown as Record<string, unknown>;
          for (const [path, value] of mutations) set(input, path, structuredClone(value));
          return input as unknown as PolicyInput;
        };
        expect(evaluatePolicy(make())).toEqual(evaluatePolicy(make()));
      }),
      RUNS,
    );
  });
});

describe("property: untrusted text", () => {
  const unicode = fc.string({ unit: "binary", maxLength: 300 });

  it("detectPromptInjection never throws on arbitrary Unicode and reports a consistent score", () => {
    fc.assert(
      fc.property(unicode, (text) => {
        const v = detectPromptInjection(text);
        expect(v.score).toBe(v.signals.reduce((a, s) => a + s.weight, 0));
        expect(v.quarantine).toBe(v.score >= 5);
      }),
      RUNS,
    );
  });

  it("normalisation is idempotent and strips every format character", () => {
    fc.assert(
      fc.property(unicode, (text) => {
        const once = normalizeUntrustedText(text);
        expect(/\p{Cf}/u.test(once)).toBe(false);
        expect(normalizeUntrustedText(once)).toBe(once);
      }),
      RUNS,
    );
  });

  it("fenced output cannot close its boundary or carry format characters", () => {
    fc.assert(
      fc.property(fc.string({ maxLength: 20 }), unicode, (label, text) => {
        const fenced = fenceUntrusted(label, text);
        const nonce = /^<untrusted-([a-f0-9]{16}) /.exec(fenced)![1]!;
        expect(fenced.split(`untrusted-${nonce}`)).toHaveLength(3);
        const body = fenced.slice(fenced.indexOf("\n") + 1, fenced.lastIndexOf("\n"));
        expect(body).not.toMatch(/[<>]/);
        expect(/\p{Cf}/u.test(body)).toBe(false);
      }),
      RUNS,
    );
  });
});

describe("property: listings and invoices", () => {
  const titleTokens = fc.constantFrom(
    "Kraft",
    "containers",
    "8x8",
    "inch",
    "9 x 13 in",
    "6 x 50",
    "count",
    "Count",
    "ct",
    "pcs",
    "(Pack of 10)",
    "pack of",
    "case of",
    "1,000",
    "250",
    "0",
    "2.5",
    "999999999",
    "(150)",
    "each",
    ",",
    "-",
    "x",
    "×",
  );
  const title = fc.oneof(
    fc.array(titleTokens, { maxLength: 10 }).map((t) => t.join(" ")),
    fc.string({ unit: "binary", maxLength: 80 }),
  );

  it("parsePackQuantity never throws and returns a positive safe integer or null", () => {
    fc.assert(
      fc.property(title, fc.option(title), (t, d) => {
        const p = parsePackQuantity(t, d);
        if (p.pack_quantity === null) {
          expect(p).toEqual({ pack_quantity: null, confidence: "NONE", matched: null });
        } else {
          expect(Number.isSafeInteger(p.pack_quantity) && p.pack_quantity >= 1 && p.pack_quantity <= 1_000_000).toBe(true);
          expect(["HIGH", "LOW"]).toContain(p.confidence);
        }
      }),
      { numRuns: 1_000 },
    );
  });

  it("normalizeInvoiceNumber is idempotent and alphanumeric", () => {
    const invoiceish = fc.oneof(
      fc.string({ unit: "binary", maxLength: 24 }),
      fc
        .array(fc.constantFrom("INV", "INVOICE", "inv", "#", "-", "0", "00", "42", "A", " ", "Ｉｎｖ", "４２"), { maxLength: 8 })
        .map((t) => t.join("")),
    );
    fc.assert(
      fc.property(invoiceish, (n) => {
        const once = normalizeInvoiceNumber(n);
        expect(once).toMatch(/^[A-Z0-9]*$/);
        expect(normalizeInvoiceNumber(once)).toBe(once);
      }),
      { numRuns: 1_000 },
    );
  });
});
