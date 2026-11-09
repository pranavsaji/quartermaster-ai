import fc from "fast-check";
import { describe, expect, it } from "vitest";
import { applyBps, decimalStringToMinor, floatToMinor, minorToDecimalString, POLICY_DECISIONS } from "@qm/contracts";
import { legacyNormalizeInvoiceNumber, normalizeInvoiceNumber, parsePackQuantity } from "@qm/quartermaster";
import {
  buildCart,
  canonicalize,
  checkCartArithmetic,
  cleanUntrustedText,
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

  /** Reference: exact rational rounding, half up (towards +∞), entirely in BigInt. */
  const bpsReference = (minor: bigint, bps: bigint): bigint => {
    const twice = 2n * minor * bps + 10_000n; // 2·(minor·bps/10 000 + ½) scaled by 10 000
    const den = 20_000n;
    // floor division for possibly negative numerators
    const q = twice / den;
    return twice % den !== 0n && twice < 0n ? q - 1n : q;
  };

  it("applyBps equals a BigInt reference implementation for every safe amount and rate", () => {
    const amount = fc.oneof(fc.maxSafeInteger(), fc.integer({ min: -1_000_000, max: 1_000_000 }));
    fc.assert(
      fc.property(amount, fc.integer({ min: 0, max: 10_000 }), (minor, bps) => {
        const expected = bpsReference(BigInt(minor), BigInt(bps));
        if (expected > BigInt(Number.MAX_SAFE_INTEGER) || expected < BigInt(Number.MIN_SAFE_INTEGER)) {
          expect(() => applyBps(minor, bps)).toThrow();
          return;
        }
        const actual = applyBps(minor, bps);
        expect(BigInt(actual)).toBe(expected);
        expect(Object.is(actual, -0)).toBe(false);
      }),
      { numRuns: 2_000 },
    );
  });

  it("floatToMinor recovers the cents of every decimal price with up to 15 significant digits", () => {
    fc.assert(
      fc.property(fc.integer({ min: -(10 ** 15) + 1, max: 10 ** 15 - 1 }), (cents) => {
        const price = Number(minorToDecimalString(cents, "USD"));
        expect(floatToMinor(price, "USD")).toBe(cents);
      }),
      RUNS,
    );
  });

  it("floatToMinor rounds every written half-cent away from zero", () => {
    fc.assert(
      fc.property(fc.integer({ min: 0, max: 10 ** 13 }), fc.boolean(), (cents, negative) => {
        // "<cents/100>5", e.g. 100 → "1.005": exactly half a cent above `cents`.
        const text = `${negative ? "-" : ""}${minorToDecimalString(cents, "USD")}5`;
        const expected = cents + 1;
        expect(floatToMinor(Number(text), "USD")).toBe(negative ? -expected : expected);
      }),
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

  // Type confusion. Every leaf and container of a compliant input (which is ALLOWed) is replaced
  // by a value of a type the field does not have: "false" for false, "100000" for 100000, a
  // string for an array, an array for an object, null or a missing field. None of them may turn
  // into an ALLOW, except on the few fields that provably do not take part in the decision.
  const NEUTRAL = new Set([
    "mandate.id",
    "mandate.organization_id",
    "mandate.version",
    "mandate.certificate_ttl_minutes",
    "market.0.candidate_unit_price_minor",
    // Pack sizes are read only for SKUs on the cart; these two are catalog entries not ordered.
    "pack_quantity_by_sku.WINE-12",
    "pack_quantity_by_sku.DESCALE-SUB",
  ]);
  /** Types a field may legitimately have, where the base value does not show them all. */
  const ALLOWED_TYPES: Record<string, string[]> = {
    request_budget_limit_minor: ["null", "number"],
    market_reference_max_age_hours: ["undefined", "number"],
    "supplier.fee_terms.0.waived_over_minor": ["null", "number"],
    "market.0.reference_unit_price_minor": ["null", "number"],
    "market.0.observed_at": ["null", "string"],
    "cart.lines.0.recurring": ["undefined", "boolean"],
  };
  const typeOf = (v: unknown) => (v === null ? "null" : Array.isArray(v) ? "array" : v instanceof Date ? "date" : typeof v);
  const allowedTypes = (path: string, base: unknown) =>
    ALLOWED_TYPES[path] ?? (/^cart\.lines\.\d+\.(?:sku|category)$/.test(path) ? ["null", "string"] : [typeOf(base)]);

  /** Every path of the base input, leaves and containers alike, plus optional fields it omits. */
  function pathsOf(value: unknown, prefix = ""): [string, unknown][] {
    const out: [string, unknown][] = prefix ? [[prefix, value]] : [];
    if (value && typeof value === "object" && !(value instanceof Date)) {
      for (const [k, v] of Object.entries(value)) out.push(...pathsOf(v, prefix ? `${prefix}.${k}` : k));
    }
    return out;
  }

  /** Values of other types than the field allows, each one a plausible coercion mistake. */
  function confusions(base: unknown, allowed: string[]): unknown[] {
    const candidates: unknown[] = [
      String(base instanceof Date ? base.toISOString() : typeof base === "object" ? JSON.stringify(base) : base),
      "",
      "true",
      "false",
      typeof base === "number" ? -base : 1,
      0,
      true,
      false,
      null,
      undefined,
      [],
      [base],
      {},
      base instanceof Date ? base.getTime() : new Date(NOW_ISO),
    ];
    return candidates.filter((c) => !allowed.includes(typeOf(c)));
  }
  const NOW_ISO = "2026-11-10T18:00:00Z";

  function mutated(path: string, value: unknown): PolicyInput {
    const input = structuredClone(baseInput()) as unknown as Record<string, unknown>;
    const parts = path.split(".");
    let cur: Record<string, unknown> = input;
    for (const p of parts.slice(0, -1)) cur = cur[p] as Record<string, unknown>;
    if (value === undefined) delete cur[parts.at(-1)!];
    else cur[parts.at(-1)!] = value;
    return input as unknown as PolicyInput;
  }

  const CONFUSABLE = [
    ...pathsOf(baseInput()),
    ["market_reference_max_age_hours", 72] as [string, unknown],
    ["cart.lines.0.recurring", false] as [string, unknown],
  ].filter(([path]) => !NEUTRAL.has(path));

  it("never ALLOWs a cart whose facts have the wrong type (exhaustive over every field)", () => {
    expect(evaluatePolicy(baseInput()).decision).toBe("ALLOW");
    const allowed: string[] = [];
    let cases = 0;
    for (const [path, base] of CONFUSABLE) {
      for (const value of confusions(base, allowedTypes(path, base))) {
        cases++;
        const r = evaluatePolicy(mutated(path, value));
        if (r.decision === "ALLOW") allowed.push(`${path} = ${JSON.stringify(value) ?? "undefined"}`);
      }
    }
    expect(cases).toBeGreaterThan(500);
    expect(allowed).toEqual([]);
  });

  it("never ALLOWs under several simultaneous type confusions", () => {
    const mutation = fc
      .constantFrom(...CONFUSABLE)
      .chain(([path, base]) => fc.constantFrom(...confusions(base, allowedTypes(path, base))).map((value) => [path, value] as const));
    fc.assert(
      fc.property(fc.array(mutation, { minLength: 1, maxLength: 3 }), (mutations) => {
        let input = baseInput();
        for (const [path, value] of mutations) {
          const next = structuredClone(input) as unknown as Record<string, unknown>;
          const parts = path.split(".");
          let cur: Record<string, unknown> | undefined = next;
          for (const p of parts.slice(0, -1)) {
            const child: unknown = cur?.[p];
            cur = child && typeof child === "object" ? (child as Record<string, unknown>) : undefined;
          }
          if (cur) {
            if (value === undefined) delete cur[parts.at(-1)!];
            else cur[parts.at(-1)!] = value;
          }
          input = next as unknown as PolicyInput;
        }
        expect(evaluatePolicy(input).decision).not.toBe("ALLOW");
      }),
      RUNS,
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

  it("cleanUntrustedText is idempotent on entity-free text, keeps letters and strips format characters", () => {
    fc.assert(
      fc.property(unicode, (text) => {
        const clean = cleanUntrustedText(text);
        expect(/\p{Cf}/u.test(clean)).toBe(false);
        if (!clean.includes("&")) expect(cleanUntrustedText(clean)).toBe(clean);
        // Only NFKC, whitespace and invisible characters change: no homoglyph folding.
        // Hangul fillers are letters that render as nothing; they are stripped as invisible.
        const letters = (s: string) =>
          [...s.normalize("NFKD")].filter((c) => /\p{L}/u.test(c) && !/[\u115F\u1160\u3164\uFFA0]/.test(c)).join("");
        if (!text.includes("&")) expect(letters(clean)).toBe(letters(text));
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

  it("normalizeInvoiceNumber is idempotent, alphanumeric, with hyphens only between digit groups", () => {
    const invoiceish = fc.oneof(
      fc.string({ unit: "binary", maxLength: 24 }),
      fc
        .array(
          fc.constantFrom(
            "INV",
            "INVOICE",
            "inv",
            "No.",
            "NUMBER",
            "nr",
            "NOVA",
            "#",
            "-",
            "/",
            "0",
            "00",
            "42",
            "A",
            " ",
            "Ｉｎｖ",
            "４２",
            "№",
            "٤٢", // Arabic-Indic 42
            "४०", // Devanagari 40
            "Б", // Cyrillic letter
          ),
          { maxLength: 8 },
        )
        .map((t) => t.join("")),
    );
    fc.assert(
      fc.property(invoiceish, (n) => {
        const once = normalizeInvoiceNumber(n);
        expect(once).toMatch(/^(?:[A-Z0-9]|(?<=\d)-(?=\d))*$/);
        expect(normalizeInvoiceNumber(once)).toBe(once);
        expect(legacyNormalizeInvoiceNumber(legacyNormalizeInvoiceNumber(n))).toBe(legacyNormalizeInvoiceNumber(n));
      }),
      { numRuns: 1_000 },
    );
  });

  it("normalizeInvoiceNumber keeps numbers with distinct digit sequences apart", () => {
    // Removing separators can only merge groups; the digit sequence, read group by group, is kept.
    const groups = fc.array(fc.stringMatching(/^[1-9]\d{0,3}$/), { minLength: 1, maxLength: 3 });
    fc.assert(
      fc.property(groups, groups, fc.constantFrom("-", "/", " ", "."), (a, b, sep) => {
        fc.pre(a.join(",") !== b.join(","));
        expect(normalizeInvoiceNumber(`INV ${a.join(sep)}`)).not.toBe(normalizeInvoiceNumber(`INV ${b.join(sep)}`));
      }),
      { numRuns: 500 },
    );
  });
});
