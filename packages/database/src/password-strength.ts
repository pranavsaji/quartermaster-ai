import { COMMON_PASSWORDS_TEXT } from "./common-passwords";

/**
 * Refuses new passwords that are guessable despite meeting the length rule: one of the 10,000
 * most common passwords, one of them dressed up with digits, symbols or l33t substitutions
 * ("P@ssw0rd2026!"), keyboard and alphabet runs, repeats, the product's own names, and the
 * person's own email or name. Sign-in never runs this; existing passwords keep working.
 */
export type WeakPasswordReason = "COMMON" | "PATTERN" | "PERSONAL";

let common: Set<string> | null = null;
const commonSet = (): Set<string> => (common ??= new Set(COMMON_PASSWORDS_TEXT.split("\n")));

/** Words a guesser tries first against this product. */
const PRODUCT_WORDS = new Set(["quartermaster", "trustrail", "paypal", "saffronsage", "saffronandsage", "demoowner"]);

const RUNS = ["qwertyuiopasdfghjklzxcvbnm", "1qaz2wsx3edc4rfv5tgb6yhn7ujm8ik9ol0p", "qazwsxedcrfvtgbyhnujmikolp", "1234567890"];
const REVERSED_RUNS = RUNS.map((r) => [...r].reverse().join(""));

const LEET: Record<string, string> = { "@": "a", "4": "a", "3": "e", "0": "o", "1": "i", "!": "i", $: "s", "5": "s", "7": "t" };

const deleet = (s: string) => s.replace(/[@43015!$7]/g, (c) => LEET[c] ?? c);
const lettersOnly = (s: string) => s.replace(/[^a-z]/g, "");
/** The word inside decoration: leading and trailing digits and symbols removed. */
const core = (s: string) => s.replace(/^[^a-z]+/, "").replace(/[^a-z]+$/, "");
const repeated = (s: string) => /^(.+?)\1+$/.test(s);

/** A keyboard or alphabet run ("qwertyuiop", "lkjhgfdsa", "abcdefghijkl", "789012345678"). */
export function isRun(s: string): boolean {
  if (s.length < 4) return false;
  if (RUNS.some((r) => r.includes(s)) || REVERSED_RUNS.some((r) => r.includes(s))) return true;
  let step: number | null = null;
  for (let i = 1; i < s.length; i++) {
    let d = s.charCodeAt(i) - s.charCodeAt(i - 1);
    // Digits wrap: "890123" counts as a run.
    if (/\d/.test(s[i]!) && /\d/.test(s[i - 1]!)) d = d === -9 ? 1 : d === 9 ? -1 : d;
    if (d !== 1 && d !== -1) return false;
    if (step !== null && step !== d) return false;
    step = d;
  }
  return true;
}

export function weakPasswordReason(password: string, context: readonly string[] = []): WeakPasswordReason | null {
  const set = commonSet();
  const p = password.normalize("NFKC").toLowerCase();
  const compact = p.replace(/\s+/g, "");
  if (set.has(p) || set.has(compact)) return "COMMON";

  if (new Set(compact).size <= 3 || repeated(compact) || isRun(compact)) return "PATTERN";

  // A common password inside decoration, possibly with l33t substitutions or repeated.
  const inner = core(compact);
  const word = deleet(inner);
  if (word.length >= 4 && (set.has(word) || set.has(inner))) return "COMMON";
  const tokens = [
    ...new Set(
      deleet(compact)
        .split(/[^a-z]+/)
        .filter(Boolean),
    ),
  ];
  if (tokens.length === 1 && tokens[0]!.length >= 4 && (set.has(tokens[0]!) || repeated(tokens[0]!))) return "COMMON";
  if (inner.length >= 6 && isRun(inner) && compact.length - inner.length <= 6) return "PATTERN";

  const letters = lettersOnly(deleet(compact));
  if (PRODUCT_WORDS.has(letters) || PRODUCT_WORDS.has(lettersOnly(compact))) return "COMMON";

  for (const raw of context) {
    const lower = raw.toLowerCase();
    const words = [lettersOnly(lower.split("@")[0] ?? ""), lettersOnly(lower), ...lower.split(/[^a-z]+/)].filter((w) => w.length >= 4);
    if (words.some((w) => letters === w || lettersOnly(compact) === w)) return "PERSONAL";
  }
  return null;
}
