/**
 * Package-size normalisation for market listings. Retail titles describe pack sizes in many
 * ways ("Pack of 150", "150 Count", "150-ct", "Case of 6 x 50"). If a size cannot be determined
 * with confidence the listing is marked non-comparable instead of guessing.
 */

export interface PackParse {
  pack_quantity: number | null;
  confidence: "HIGH" | "LOW" | "NONE";
  matched: string | null;
}

const COUNT_WORDS = "(?:count|ct|pcs|pieces|pc|pack|pk|units|containers|boxes|sets|rolls|sheets|gloves|pairs|liners|bags|lids)";

const PATTERNS: { re: RegExp; compute: (m: RegExpExecArray) => number; confidence: "HIGH" | "LOW" }[] = [
  // "Case of 6 x 50", "6 packs of 50", "6 x 50 count"
  { re: /\b(\d{1,4})\s*(?:packs?|boxes|sleeves|rolls|bags)?\s*(?:x|×|of)\s*(\d{1,5})\s*(?:count|ct|pcs|pieces|sheets|each)?\b/i, compute: (m) => Number(m[1]) * Number(m[2]), confidence: "HIGH" },
  // "Pack of 150", "Case of 300", "Set of 50", "Box of 200"
  { re: /\b(?:pack|case|set|box|bag|carton|bundle|sleeve)\s+of\s+(\d{1,6})\b/i, compute: (m) => Number(m[1]), confidence: "HIGH" },
  // "150 Count", "150-ct", "150 pcs", "150 Pack"
  { re: new RegExp(`\\b(\\d{1,6})\\s*-?\\s*${COUNT_WORDS}\\b`, "i"), compute: (m) => Number(m[1]), confidence: "HIGH" },
  // "(150)" at the end of a title
  { re: /\((\d{2,6})\)\s*$/, compute: (m) => Number(m[1]), confidence: "LOW" },
];

export function parsePackQuantity(title: string, description?: string | null): PackParse {
  for (const text of [title, description ?? ""]) {
    for (const p of PATTERNS) {
      const m = p.re.exec(text);
      if (m) {
        const qty = p.compute(m);
        if (Number.isSafeInteger(qty) && qty >= 1 && qty <= 1_000_000) {
          return { pack_quantity: qty, confidence: text === title ? p.confidence : "LOW", matched: m[0] };
        }
      }
    }
  }
  return { pack_quantity: null, confidence: "NONE", matched: null };
}

/** Volume normalisation for liquids (cooking oil, sanitiser), returned in litres. */
export function parseVolumeLitres(text: string): number | null {
  const m = /\b(\d+(?:\.\d+)?)\s*(l|liters?|litres?|ml|gal|gallons?|fl\.?\s*oz|qt|quarts?)\b/i.exec(text);
  if (!m) return null;
  const n = Number(m[1]);
  const unit = m[2]!.toLowerCase().replace(/\s|\./g, "");
  const litres =
    unit.startsWith("ml") ? n / 1000
    : unit.startsWith("gal") ? n * 3.78541
    : unit.startsWith("floz") ? n * 0.0295735
    : unit.startsWith("qt") || unit.startsWith("quart") ? n * 0.946353
    : n;
  const multi = /\b(\d{1,3})\s*(?:x|×|pack of|case of)\s*\d/i.exec(text);
  const count = multi ? Number(multi[1]) : 1;
  return Math.round(litres * count * 1000) / 1000;
}

/**
 * Units of the inventory item a listing provides. For count-based items this is the pack size;
 * for volume items (unit "liter") it is the total volume.
 */
export function usableUnits(unit: string, title: string, description?: string | null): { units: number | null; confidence: PackParse["confidence"] } {
  if (/^(l|liter|litre|liters|litres)$/i.test(unit)) {
    const v = parseVolumeLitres(title) ?? parseVolumeLitres(description ?? "");
    return { units: v, confidence: v === null ? "NONE" : "HIGH" };
  }
  const p = parsePackQuantity(title, description);
  return { units: p.pack_quantity, confidence: p.confidence };
}

export function median(values: number[]): number | null {
  const v = values.filter(Number.isFinite).sort((a, b) => a - b);
  if (v.length === 0) return null;
  const mid = Math.floor(v.length / 2);
  return v.length % 2 ? v[mid]! : (v[mid - 1]! + v[mid]!) / 2;
}

/** Removes outliers outside 1.5×IQR so a single mislabelled listing does not move the reference. */
export function withoutOutliers(values: number[]): number[] {
  if (values.length < 4) return values;
  const v = [...values].sort((a, b) => a - b);
  const q = (p: number) => {
    const idx = (v.length - 1) * p;
    const lo = Math.floor(idx);
    const hi = Math.ceil(idx);
    return v[lo]! + (v[hi]! - v[lo]!) * (idx - lo);
  };
  const q1 = q(0.25);
  const q3 = q(0.75);
  const iqr = q3 - q1;
  return v.filter((x) => x >= q1 - 1.5 * iqr && x <= q3 + 1.5 * iqr);
}
