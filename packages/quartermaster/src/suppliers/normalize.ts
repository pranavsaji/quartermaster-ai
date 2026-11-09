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

/** An integer, optionally comma-grouped ("1,000"); never the tail of a longer number or decimal. */
const NUM = String.raw`(?<![\d.,])(\d{1,3}(?:,\d{3})+|\d{1,6})(?![\d]|[.,]\d)`;

/**
 * A number followed by a length/weight/volume unit is a dimension, not a count: "8x8 inch",
 * "9 x 13 in", "12 x 12 x 2". Matching "8x8" as a 64-pack is the classic mis-parse.
 */
const NOT_DIMENSION = String.raw`(?!\s*(?:in(?:ch(?:es)?)?\b|["”″']|cm\b|mm\b|m\b|oz\b|ft\b|feet\b|lbs?\b|l\b|ml\b|gal|qt\b|[x×]\s*\d))`;

// "6 x 50 count", "6 packs of 50", "6 sleeves x 50"; the multiplier word or count word makes it explicit.
const MULTIPACK = new RegExp(
  String.raw`(?<![\d.,])\b(\d{1,4})(?!\s*(?:in(?:ch(?:es)?)?\b|["”″']|cm\b|mm\b|oz\b|ft\b))\s*(packs?|boxes|sleeves|rolls|bags|cases)?\s*(x|×|of)\s*(\d{1,5})(?![\d]|[.,]\d)${NOT_DIMENSION}\s*(count|ct|pcs|pieces|sheets|each)?\b`,
  "gi",
);
// "Pack of 150", "Case of 300", "(Pack of 10)"; not "Case of 6 x 50" (that is a multipack).
const PACK_OF = new RegExp(String.raw`\b(?:pack|case|set|box|bag|carton|bundle|sleeve)\s+of\s+${NUM}(?!\s*[x×]\s*\d)`, "gi");
// "150 Count", "150-ct", "1,000 pcs", "150 Pack"
const COUNT = new RegExp(String.raw`${NUM}\s*-?\s*${COUNT_WORDS}\b`, "gi");
// "(150)" at the end of a title
const TRAILING_PAREN = /\((\d{2,6})\)\s*$/;
// "100 Count (Pack of 10)", "50 count each", "50 per sleeve": the pack-of is a multiplier.
const EXPLICIT_MULTIPLIER =
  /\(\s*(?:pack|case|set|box|bag|carton|bundle)\s+of\s+\d[\d,]*\s*\)|\beach\b|\bper\s+(?:pack|box|case|bag|sleeve|carton)\b/i;

const MAX_PACK = 1_000_000;
const toInt = (s: string) => Number(s.replace(/,/g, ""));
const valid = (n: number) => Number.isSafeInteger(n) && n >= 1 && n <= MAX_PACK;

interface Hit {
  qty: number;
  index: number;
  end: number;
  text: string;
}

function hits(re: RegExp, text: string, group: number): Hit[] {
  const out: Hit[] = [];
  for (const m of text.slice(0, 2_000).matchAll(re)) {
    const qty = toInt(m[group]!);
    if (valid(qty)) out.push({ qty, index: m.index, end: m.index + m[0].length, text: m[0] });
  }
  return out;
}

function parseOne(text: string): (Omit<PackParse, "confidence"> & { confidence: "HIGH" | "LOW" }) | null {
  const multi = [...text.slice(0, 2_000).matchAll(MULTIPACK)]
    .map((m) => ({
      a: Number(m[1]),
      b: Number(m[4]),
      // "6 packs of 50", "6 x 50 count", or "Case of 6 x 50" are unambiguous multipacks.
      explicit:
        !!(m[2] || m[5] || /of/i.test(m[3]!)) ||
        /\b(?:pack|case|set|box|bag|carton|bundle)\s+of\s+$/i.test(text.slice(Math.max(0, m.index - 24), m.index)),
      index: m.index,
      end: m.index + m[0].length,
      text: m[0],
    }))
    .filter((m) => valid(m.a * m.b));
  const mp = multi.find((m) => m.explicit) ?? multi[0];
  const outside = (h: Hit) => !mp || h.end <= mp.index || h.index >= mp.end;
  const packOf = hits(PACK_OF, text, 1).filter(outside);
  const counts = hits(COUNT, text, 1).filter(outside);
  const distinct = (xs: number[]) => [...new Set(xs)];

  if (mp?.explicit) {
    const qty = mp.a * mp.b;
    const conflicting = distinct([...packOf, ...counts].map((h) => h.qty)).filter((n) => n !== qty && n !== mp.a && n !== mp.b);
    return { pack_quantity: qty, confidence: conflicting.length === 0 ? "HIGH" : "LOW", matched: mp.text };
  }

  const countValues = distinct(counts.map((h) => h.qty));
  const packValues = distinct(packOf.map((h) => h.qty));
  const c = counts[0];
  const p = packOf[0];
  // Several different counts (or pack-ofs) in one title disagree with each other.
  const selfConsistent = countValues.length <= 1 && packValues.length <= 1;
  if (c && p) {
    if (c.qty === p.qty) return { pack_quantity: c.qty, confidence: selfConsistent ? "HIGH" : "LOW", matched: c.text };
    // "100 Count (Pack of 10)" is 1,000 units. Without an explicit multiplier form the two
    // figures may instead both describe the total, so the product is kept but not trusted.
    const qty = c.qty * p.qty;
    if (!valid(qty)) return { pack_quantity: c.qty, confidence: "LOW", matched: c.text };
    return {
      pack_quantity: qty,
      confidence: selfConsistent && EXPLICIT_MULTIPLIER.test(text) ? "HIGH" : "LOW",
      matched: `${c.text} … ${p.text}`,
    };
  }
  const single = c ?? p;
  if (single) {
    // A bare "12x16" next to an explicit count is probably a sheet size; the count wins, but
    // only with LOW confidence because the two readings disagree.
    const disagrees = !selfConsistent || (mp !== undefined && mp.a * mp.b !== single.qty);
    return { pack_quantity: single.qty, confidence: disagrees ? "LOW" : "HIGH", matched: single.text };
  }
  // A bare "6 x 50" with no count or pack word could just as well be a size ("12x12").
  if (mp) return { pack_quantity: mp.a * mp.b, confidence: "LOW", matched: mp.text };
  const paren = TRAILING_PAREN.exec(text);
  if (paren && valid(Number(paren[1]))) return { pack_quantity: Number(paren[1]), confidence: "LOW", matched: paren[0] };
  return null;
}

/**
 * Pack quantity from a listing title (HIGH confidence possible) or description (LOW at most).
 * Total: never throws; returns a positive safe integer or null.
 */
export function parsePackQuantity(title: string, description?: string | null): PackParse {
  const t = typeof title === "string" ? title : "";
  const fromTitle = parseOne(t);
  if (fromTitle) return fromTitle;
  const fromDescription = typeof description === "string" ? parseOne(description) : null;
  if (fromDescription) return { ...fromDescription, confidence: "LOW" };
  return { pack_quantity: null, confidence: "NONE", matched: null };
}

export interface VolumeParse {
  /** Total litres the listing provides (volume × pack count), rounded to millilitres. */
  litres: number | null;
  confidence: "HIGH" | "LOW" | "NONE";
  matched: string | null;
}

const VOLUME_UNIT = String.raw`(millilit(?:er|re)s?|ml|lit(?:er|re)s?|ltrs?|lt|l|gallons?|gal|fl\.?\s*oz|quarts?|qt)`;
/**
 * A volume: "18 L", "1.5L", "500 mL", "1 gallon", "16.9 fl oz", "1,000 ml" (grouped thousands)
 * and "1,5 L" (decimal comma, flagged as ambiguous). Never the tail of a longer number ("1,5 L"
 * is not "5 L"), and the unit must end the word ("5 lb" and "2 lids" are not litres).
 */
const VOLUME_RE = new RegExp(
  String.raw`(?<![\p{N}.,])(\d{1,3}(?:,\d{3})+(?![.,]?\d)|\d{1,6}(?:[.,]\d{1,3})?)\s*-?\s*${VOLUME_UNIT}(?![\p{L}\p{N}])`,
  "giu",
);
const CONTAINER = String.raw`(?:bottles?|jugs?|jars?|cans?|containers?|tubs?|pouches|pouch|refills?|units?|packs?|pk|pcs|pieces|count|ct)`;
/** "6 x 1 L", "6 bottles x 1 L", "4/1 gal" (foodservice case notation), immediately before a volume. */
const COUNT_BEFORE_VOLUME = new RegExp(String.raw`(?<![\p{N}.,])(\d{1,4})\s*(?:${CONTAINER}\s*)?(?:[x×*]|\/)\s*$`, "iu");
/** "1 gallon x 4", "500 ml × 12", "750ml bottles x 6", immediately after a volume and not itself a volume. */
const COUNT_AFTER_VOLUME = new RegExp(
  String.raw`^\s*(?:${CONTAINER}\s*)?[x×*]\s*(\d{1,4})(?!\p{N}|[.,]\p{N}|\s*-?\s*${VOLUME_UNIT}(?![\p{L}\p{N}]))`,
  "iu",
);
/** Pack counts anywhere: "(Pack of 2)", "Case of 6", "2-Pack", "6 bottles", "4 count", "6/case", "6 per case". */
const COUNT_ANYWHERE = [
  new RegExp(
    String.raw`\b(?:pack|case|box|carton|set|bundle|lot)\s+of\s+(\d{1,4})(?!\p{N}|[.,]\p{N}|\s*-?\s*${VOLUME_UNIT}(?![\p{L}\p{N}]))`,
    "giu",
  ),
  new RegExp(String.raw`(?<![\p{N}.,])(\d{1,4})\s*-?\s*${CONTAINER}(?![\p{L}\p{N}])`, "giu"),
  new RegExp(String.raw`(?<![\p{N}.,])(\d{1,4})\s*(?:\/|per)\s*(?:case|cs|pack|pk|box|carton)\b`, "giu"),
];

/** Litres for a number and unit; null for a number that is not usable. */
function toLitres(value: number, unit: string): number {
  const u = unit.toLowerCase().replace(/[\s.]/g, "");
  if (u === "ml" || u.startsWith("millilit")) return value / 1000;
  if (u.startsWith("gal")) return value * 3.78541;
  if (u.startsWith("floz")) return value * 0.0295735;
  if (u.startsWith("qt") || u.startsWith("quart")) return value * 0.946353;
  return value;
}

const roundMl = (litres: number) => Math.round(litres * 1000) / 1000;
/** Two readings of the same volume ("1 gal (3.78 L)") agree within 2 %. */
const sameVolume = (a: number, b: number) => Math.abs(a - b) <= 0.02 * Math.max(a, b);
const distinctBy = (xs: number[], same: (a: number, b: number) => boolean) =>
  xs.reduce<number[]>((acc, x) => (acc.some((y) => same(x, y)) ? acc : [...acc, x]), []);

interface VolumeHit {
  litres: number;
  index: number;
  end: number;
  text: string;
  decimalComma: boolean;
}

/** Volume mentions in the first 2,000 characters of a text. */
function volumeHits(text: string): VolumeHit[] {
  const out: VolumeHit[] = [];
  for (const m of text.slice(0, 2_000).matchAll(VOLUME_RE)) {
    const raw = m[1]!;
    // "1,5" / "1,25" is a decimal comma; "1,000" (or "12,500") is a grouped thousand.
    const decimalComma = /^\d+,\d{1,2}$/.test(raw);
    const value = Number(decimalComma ? raw.replace(",", ".") : raw.replace(/,/g, ""));
    const litres = toLitres(value, m[2]!);
    if (Number.isFinite(litres) && litres > 0) out.push({ litres, index: m.index, end: m.index + m[0].length, text: m[0], decimalComma });
  }
  return out;
}

/** Every pack count stated in a text, excluding the digits of volume mentions themselves. */
function packCounts(text: string, volumes: VolumeHit[]): number[] {
  const counts: number[] = [];
  const insideVolume = (i: number) => volumes.some((v) => i >= v.index && i < v.end);
  for (const v of volumes) {
    const before = COUNT_BEFORE_VOLUME.exec(text.slice(Math.max(0, v.index - 24), v.index));
    if (before) counts.push(Number(before[1]));
    const after = COUNT_AFTER_VOLUME.exec(text.slice(v.end, v.end + 24));
    if (after) counts.push(Number(after[1]));
  }
  for (const re of COUNT_ANYWHERE) {
    for (const m of text.matchAll(re)) {
      const digitsAt = m.index + m[0].indexOf(m[1]!);
      if (!insideVolume(digitsAt)) counts.push(Number(m[1]));
    }
  }
  return [...new Set(counts.filter((n) => Number.isSafeInteger(n) && n >= 1))];
}

/**
 * Total volume of a liquid listing, in litres, with a confidence.
 *
 * HIGH only when the reading is unambiguous: one volume (or several readings of the same volume,
 * such as "1 gal (3.78 L)") and at most one pack count, combined as volume × count
 * ("Olive oil 3L (Pack of 2)" → 6, "Sanitizer 1 gallon x 4" → 15.142, "6 x 1 L (6 L total)" → 6).
 * LOW when a decimal comma is involved ("1,5 L" is read as 1.5 L), when volumes or pack counts
 * disagree, or when they cannot be combined; a LOW reading is never used as a market reference.
 * Total: never throws.
 */
export function parseVolume(text: string): VolumeParse {
  const t = (typeof text === "string" ? text : "").slice(0, 2_000);
  const volumes = volumeHits(t);
  const first = volumes[0];
  if (!first) return { litres: null, confidence: "NONE", matched: null };

  const counts = packCounts(t, volumes);
  const distinctVolumes = distinctBy(
    volumes.map((v) => v.litres),
    sameVolume,
  );
  const ambiguousNumber = volumes.some((v) => v.decimalComma);
  const result = (litres: number, high: boolean, matched: string): VolumeParse => ({
    litres: roundMl(litres),
    confidence: high && !ambiguousNumber ? "HIGH" : "LOW",
    matched,
  });

  if (counts.length === 0) return result(first.litres, distinctVolumes.length === 1, first.text);
  if (counts.length > 1) return result(first.litres, false, first.text);
  const count = counts[0]!;
  if (distinctVolumes.length === 1) return result(first.litres * count, true, `${first.text} × ${count}`);
  // "6 x 1 L (6 L total)": one stated volume is the other multiplied by the count.
  if (distinctVolumes.length === 2) {
    const [a, b] = [Math.min(...distinctVolumes), Math.max(...distinctVolumes)];
    if (sameVolume(a * count, b)) return result(b, true, `${first.text} × ${count}`);
  }
  return result(first.litres, false, first.text);
}

/**
 * Volume normalisation for liquids (cooking oil, sanitiser), returned in litres: the total of
 * `parseVolume`, whatever its confidence. Use `parseVolume` when the confidence matters.
 */
export function parseVolumeLitres(text: string): number | null {
  return parseVolume(text).litres;
}

/**
 * Units of the inventory item a listing provides. For count-based items this is the pack size;
 * for volume items (unit "liter") it is the total volume.
 *
 * As for pack sizes, a volume read from the description is LOW confidence at most, and a title
 * reading is downgraded to LOW when the description states a pack count the title does not
 * ("Olive oil 3L" described as "Pack of 2" is not a reliable 3 L).
 */
export function usableUnits(
  unit: string,
  title: string,
  description?: string | null,
): { units: number | null; confidence: PackParse["confidence"] } {
  if (/^(l|liter|litre|liters|litres)$/i.test(unit)) {
    const t = typeof title === "string" ? title : "";
    const d = typeof description === "string" ? description : "";
    const fromTitle = parseVolume(t);
    if (fromTitle.litres === null) {
      const fromDescription = parseVolume(d);
      return { units: fromDescription.litres, confidence: fromDescription.litres === null ? "NONE" : "LOW" };
    }
    const titleCounts = packCounts(t, volumeHits(t));
    const descriptionCounts = packCounts(d.slice(0, 2_000), volumeHits(d)).filter((n) => n > 1 && !titleCounts.includes(n));
    return { units: fromTitle.litres, confidence: descriptionCounts.length > 0 ? "LOW" : fromTitle.confidence };
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
