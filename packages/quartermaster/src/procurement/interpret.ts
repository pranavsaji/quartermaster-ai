import { isCalendarDate } from "@qm/contracts";

/**
 * Turns a natural-language procurement instruction into a structured intent.
 *
 * The language-model interpreter lives in the API layer (it needs credentials); this module
 * provides the shared output contract, validation of model output against known inventory, and
 * a deterministic fallback used whenever the model is unavailable or returns invalid output.
 */

export interface InventoryRef {
  id: string;
  sku: string;
  name: string;
  category: string;
  keywords: string[];
}

export interface InterpretedIntent {
  inventory_item_ids: string[];
  demand_multiplier: number;
  budget_limit_minor: number | null;
  required_by: string | null;
  notes: string;
  unsupported_requests: string[];
}

export const MULTIPLIER_MIN = 0.5;
export const MULTIPLIER_MAX = 3;

/** JSON schema for model structured output. Kept in sync with `InterpretedIntent`. */
export const INTENT_JSON_SCHEMA = {
  type: "object",
  additionalProperties: false,
  required: ["inventory_item_ids", "demand_multiplier", "budget_limit_minor", "required_by", "notes", "unsupported_requests"],
  properties: {
    inventory_item_ids: { type: "array", items: { type: "string" }, description: "Ids from the provided inventory list only." },
    demand_multiplier: { type: "number", description: "1 = normal demand. 1.25 = 25% busier than normal." },
    budget_limit_minor: { type: ["integer", "null"], description: "Spending cap in cents if the owner stated one." },
    required_by: { type: ["string", "null"], description: "YYYY-MM-DD if the owner stated a date." },
    notes: { type: "string", description: "One sentence summarising the owner's intent." },
    unsupported_requests: {
      type: "array",
      items: { type: "string" },
      description: "Parts of the request that are not supply purchases from inventory.",
    },
  },
} as const;

/** Real-calendar-date check, shared with the request schemas (single implementation in contracts). */
export { isCalendarDate };

/** Validates and clamps model output. Unknown ids are dropped, never trusted. */
export function sanitizeIntent(raw: unknown, inventory: InventoryRef[]): InterpretedIntent | null {
  if (!raw || typeof raw !== "object") return null;
  const r = raw as Record<string, unknown>;
  const known = new Set(inventory.map((i) => i.id));
  const ids = Array.isArray(r.inventory_item_ids)
    ? r.inventory_item_ids.filter((x): x is string => typeof x === "string" && known.has(x))
    : [];
  const mult = typeof r.demand_multiplier === "number" && Number.isFinite(r.demand_multiplier) ? r.demand_multiplier : 1;
  const budget =
    typeof r.budget_limit_minor === "number" && Number.isSafeInteger(r.budget_limit_minor) && r.budget_limit_minor > 0
      ? r.budget_limit_minor
      : null;
  const date = typeof r.required_by === "string" && isCalendarDate(r.required_by) ? r.required_by : null;
  return {
    inventory_item_ids: [...new Set(ids)],
    demand_multiplier: Math.round(Math.min(MULTIPLIER_MAX, Math.max(MULTIPLIER_MIN, mult)) * 100) / 100,
    budget_limit_minor: budget,
    required_by: date,
    notes: typeof r.notes === "string" ? r.notes.slice(0, 300) : "",
    unsupported_requests: Array.isArray(r.unsupported_requests)
      ? r.unsupported_requests
          .filter((x): x is string => typeof x === "string")
          .slice(0, 10)
          .map((s) => s.slice(0, 200))
      : [],
  };
}

const BUSY_PATTERNS: [RegExp, number][] = [
  [/\b(\d{1,3})\s*%\s*(more|busier|higher|increase|extra)\b/i, NaN],
  [/\b(double|twice)\b/i, 2],
  [/\b(very|extremely|really)\s+busy\b|\bslammed\b|\bholiday rush\b/i, 1.5],
  [/\bbusy\b|\brush\b|\bpacked\b|\bbig event\b|\bcatering\b/i, 1.25],
  [/\bquiet\b|\bslow\b/i, 0.8],
];

function parseMultiplier(text: string): number {
  for (const [re, value] of BUSY_PATTERNS) {
    const m = re.exec(text);
    if (!m) continue;
    if (Number.isNaN(value)) return 1 + Number(m[1]) / 100;
    return value;
  }
  return 1;
}

/**
 * "$1,500", "$1500", "$2500.50", "$2k", "1200 dollars", "2,500 USD". The whole-number
 * alternation tries comma-grouped thousands first and the trailing negative lookahead stops a
 * partial match ("$1500" must never be read as "$150"); ambiguous forms ("$1,2345",
 * "$10.555") are rejected instead of truncated. The thousands suffix "k" counts only when it
 * stands alone (followed by whitespace, punctuation or the end): "$30 K-Cup pods" is $30, not
 * $30,000, and "$5 kits" is $5.
 */
const BUDGET_RE =
  /\$\s?(\d{1,3}(?:,\d{3})+|\d+)(?:\.(\d{1,2}))?(?:\s?([kK])(?![\p{L}\p{N}_-]))?(?![\d,.]?\d)|\b(\d{1,3}(?:,\d{3})+|\d+)(?:\.(\d{1,2}))?(?![\d,.]?\d)\s*(?:dollars|usd|bucks)\b/iu;

const BUDGET_RE_GLOBAL = new RegExp(BUDGET_RE.source, "giu");

/**
 * Words that mark an amount as a spending cap: "under $500", "keep it below $1,200", "budget of
 * $300", "cap it at $2k", "without exceeding $900" — or, after it, "$500 max", "2,500 USD tops".
 * The cue must be in the same clause: at most a few words, no sentence end, between it and the
 * amount.
 */
const CUE_BEFORE =
  /\b(?:under|below|beneath|less\s+than|at\s+most|no\s+more\s+than|not\s+more\s+than|max(?:imum)?|budget(?:ed)?|cap(?:ped)?|ceiling|without\s+(?:exceeding|going\s+over)|(?:not|never)\s+(?:to\s+)?(?:exceed|go\s+over)|up\s+to|limit(?:ed)?|within|spend(?:ing)?)\b[^$\d.;!?]{0,16}$/i;
const CUE_AFTER = /^[^\w$]{0,3}(?:max(?:imum)?|tops|limit|budget|cap|ceiling|or\s+less|at\s+most)\b/i;

function amountOf(m: RegExpExecArray): number | null {
  const whole = (m[1] ?? m[4] ?? "0").replace(/,/g, "");
  const frac = (m[2] ?? m[5] ?? "").padEnd(2, "0");
  const thousands = m[3] ? 1000 : 1;
  const minor = (Number(whole) * 100 + Number(frac || "0")) * thousands;
  return Number.isSafeInteger(minor) && minor > 0 ? minor : null;
}

/**
 * The spending cap stated in an instruction, in minor units, or null.
 *
 * A lone amount is the cap ("spend $2k on oil"). With several amounts, only the ones a budget
 * cue marks count ("Restock 2 cases of the $30 gloves, keep it under $500" → $500, not the
 * gloves' price); several cued amounts yield the smallest, and several amounts none of which is
 * cued yield null rather than a guess.
 */
export function parseBudget(text: string): number | null {
  const s = String(text ?? "");
  const found = [...s.matchAll(BUDGET_RE_GLOBAL)];
  if (found.length === 0) return null;
  if (found.length === 1) return amountOf(found[0]!);
  const cued = found
    .filter((m) => CUE_BEFORE.test(s.slice(Math.max(0, m.index - 40), m.index)) || CUE_AFTER.test(s.slice(m.index + m[0].length)))
    .map(amountOf)
    .filter((v): v is number => v !== null);
  return cued.length > 0 ? Math.min(...cued) : null;
}

/**
 * The calendar date of `now` in `timeZone`, as a UTC-midnight Date so calendar arithmetic is
 * DST-free. An unknown time zone falls back to UTC rather than failing the fallback interpreter.
 */
function localCalendarDay(now: Date, timeZone: string): Date {
  let parts: Intl.DateTimeFormatPart[];
  try {
    parts = new Intl.DateTimeFormat("en-US", { timeZone, year: "numeric", month: "2-digit", day: "2-digit" }).formatToParts(now);
  } catch {
    return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
  }
  const get = (type: string) => Number(parts.find((p) => p.type === type)?.value);
  return new Date(Date.UTC(get("year"), get("month") - 1, get("day")));
}

function parseDate(text: string, now: Date, timeZone: string): string | null {
  // First syntactically ISO date that is a real calendar date ("2026-02-30" is ignored).
  for (const iso of text.matchAll(/\b(\d{4}-\d{2}-\d{2})\b/g)) {
    if (isCalendarDate(iso[1]!)) return iso[1]!;
  }
  if (Number.isNaN(now.getTime())) return null;
  const today = localCalendarDay(now, timeZone);
  const day = (offsetDays: number) => new Date(today.getTime() + offsetDays * 86_400_000).toISOString().slice(0, 10);
  if (/\btomorrow\b/i.test(text)) return day(1);
  const weekday = /\b(by|before|for)\s+(?:this\s+)?(monday|tuesday|wednesday|thursday|friday|saturday|sunday|the weekend|weekend)\b/i.exec(
    text,
  );
  if (weekday) {
    const names = ["sunday", "monday", "tuesday", "wednesday", "thursday", "friday", "saturday"];
    const target = /weekend/i.test(weekday[2]!) ? 5 : names.indexOf(weekday[2]!.toLowerCase());
    return day((target - today.getUTCDay() + 7) % 7 || 7);
  }
  return null;
}

export interface InterpretOptions {
  /** IANA time zone used to resolve "tomorrow" and weekday names. Defaults to UTC. */
  timeZone?: string;
}

const escapeRegExp = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

/**
 * Whole-word (or whole-phrase) match of an inventory term, allowing a plural "s"/"es".
 * Substring matching made "foil pans" match canola "oil".
 */
function containsTerm(text: string, term: string): boolean {
  return new RegExp(`(?<![\\p{L}\\p{N}])${escapeRegExp(term)}(?:e?s)?(?![\\p{L}\\p{N}])`, "u").test(text);
}

/** Deterministic interpreter: keyword matching against inventory plus simple pattern extraction. */
export function interpretDeterministically(
  instruction: string,
  inventory: InventoryRef[],
  now: Date,
  options: InterpretOptions = {},
): InterpretedIntent {
  const text = instruction.toLowerCase();
  const matched = inventory.filter((item) => {
    const terms = [item.name.toLowerCase(), item.sku.toLowerCase(), ...item.keywords.map((k) => k.toLowerCase())];
    return terms.some((t) => t.trim().length >= 3 && containsTerm(text, t.trim()));
  });
  const wantsAll = /\b(everything|all (low|supplies|items)|whatever (is|we're) low|restock (low|anything))\b/i.test(instruction);
  return {
    inventory_item_ids: matched.map((i) => i.id),
    demand_multiplier: Math.min(MULTIPLIER_MAX, Math.max(MULTIPLIER_MIN, Math.round(parseMultiplier(instruction) * 100) / 100)),
    budget_limit_minor: parseBudget(instruction),
    required_by: parseDate(instruction, now, options.timeZone ?? "UTC"),
    notes: matched.length
      ? `Restock ${matched.map((m) => m.name).join(", ")}.`
      : wantsAll
        ? "Restock every item at or below its reorder point."
        : "No specific items recognised; restocking items at or below their reorder point.",
    unsupported_requests: [],
  };
}
