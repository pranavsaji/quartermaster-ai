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
    unsupported_requests: { type: "array", items: { type: "string" }, description: "Parts of the request that are not supply purchases from inventory." },
  },
} as const;

/** Validates and clamps model output. Unknown ids are dropped, never trusted. */
export function sanitizeIntent(raw: unknown, inventory: InventoryRef[]): InterpretedIntent | null {
  if (!raw || typeof raw !== "object") return null;
  const r = raw as Record<string, unknown>;
  const known = new Set(inventory.map((i) => i.id));
  const ids = Array.isArray(r.inventory_item_ids) ? r.inventory_item_ids.filter((x): x is string => typeof x === "string" && known.has(x)) : [];
  const mult = typeof r.demand_multiplier === "number" && Number.isFinite(r.demand_multiplier) ? r.demand_multiplier : 1;
  const budget =
    typeof r.budget_limit_minor === "number" && Number.isSafeInteger(r.budget_limit_minor) && r.budget_limit_minor > 0 ? r.budget_limit_minor : null;
  const date = typeof r.required_by === "string" && /^\d{4}-\d{2}-\d{2}$/.test(r.required_by) && !Number.isNaN(Date.parse(r.required_by)) ? r.required_by : null;
  return {
    inventory_item_ids: [...new Set(ids)],
    demand_multiplier: Math.round(Math.min(MULTIPLIER_MAX, Math.max(MULTIPLIER_MIN, mult)) * 100) / 100,
    budget_limit_minor: budget,
    required_by: date,
    notes: typeof r.notes === "string" ? r.notes.slice(0, 300) : "",
    unsupported_requests: Array.isArray(r.unsupported_requests)
      ? r.unsupported_requests.filter((x): x is string => typeof x === "string").slice(0, 10).map((s) => s.slice(0, 200))
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

function parseBudget(text: string): number | null {
  const m = /(?:\$\s?(\d{1,3}(?:,\d{3})*|\d+)(?:\.(\d{1,2}))?)|(?:\b(\d{1,6})(?:\.(\d{1,2}))?\s*(?:dollars|usd)\b)/i.exec(text);
  if (!m) return null;
  const whole = (m[1] ?? m[3] ?? "0").replace(/,/g, "");
  const frac = (m[2] ?? m[4] ?? "").padEnd(2, "0").slice(0, 2);
  const minor = Number(whole) * 100 + Number(frac || "0");
  return minor > 0 ? minor : null;
}

function parseDate(text: string, now: Date): string | null {
  const iso = /\b(\d{4}-\d{2}-\d{2})\b/.exec(text);
  if (iso) return iso[1]!;
  const day = (d: Date) => d.toISOString().slice(0, 10);
  if (/\btomorrow\b/i.test(text)) return day(new Date(now.getTime() + 86_400_000));
  const weekday = /\b(by|before|for)\s+(?:this\s+)?(monday|tuesday|wednesday|thursday|friday|saturday|sunday|the weekend|weekend)\b/i.exec(text);
  if (weekday) {
    const names = ["sunday", "monday", "tuesday", "wednesday", "thursday", "friday", "saturday"];
    const target = /weekend/i.test(weekday[2]!) ? 5 : names.indexOf(weekday[2]!.toLowerCase());
    const delta = (target - now.getUTCDay() + 7) % 7 || 7;
    return day(new Date(now.getTime() + delta * 86_400_000));
  }
  return null;
}

/** Deterministic interpreter: keyword matching against inventory plus simple pattern extraction. */
export function interpretDeterministically(instruction: string, inventory: InventoryRef[], now: Date): InterpretedIntent {
  const text = instruction.toLowerCase();
  const matched = inventory.filter((item) => {
    const terms = [item.name.toLowerCase(), item.sku.toLowerCase(), ...item.keywords.map((k) => k.toLowerCase())];
    return terms.some((t) => t.length >= 3 && text.includes(t));
  });
  const wantsAll = /\b(everything|all (low|supplies|items)|whatever (is|we're) low|restock (low|anything))\b/i.test(instruction);
  return {
    inventory_item_ids: matched.map((i) => i.id),
    demand_multiplier: Math.min(MULTIPLIER_MAX, Math.max(MULTIPLIER_MIN, Math.round(parseMultiplier(instruction) * 100) / 100)),
    budget_limit_minor: parseBudget(instruction),
    required_by: parseDate(instruction, now),
    notes: matched.length
      ? `Restock ${matched.map((m) => m.name).join(", ")}.`
      : wantsAll
        ? "Restock every item at or below its reorder point."
        : "No specific items recognised; restocking items at or below their reorder point.",
    unsupported_requests: [],
  };
}
