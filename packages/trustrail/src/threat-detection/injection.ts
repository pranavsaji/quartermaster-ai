import { randomBytes } from "node:crypto";
import type { Severity } from "@qm/contracts";

/**
 * Heuristic detector for instructions embedded in untrusted commercial content
 * (supplier listings, market search results, invoice notes).
 *
 * Design rules:
 *  - Detection never grants anything. It can only raise suspicion, quarantine a source and
 *    keep its text away from the language model. Policy enforcement does not depend on it.
 *  - Text is normalised first (Unicode NFKC, removal of invisible/format characters, homoglyph
 *    folding, letter-spacing collapse) and matched again with diacritics and leetspeak folded,
 *    so trivial obfuscation does not bypass the rules.
 *  - Rules require an instruction-shaped phrase (verb + qualified object), not a single keyword,
 *    so ordinary product copy ("remove the cap", "lid can act as a tray") is not quarantined.
 *  - Every pattern uses bounded quantifiers only; detection is linear in the input length.
 *  - An optional model-based classifier may only escalate a verdict, never downgrade it.
 *  - Source code uses \u escapes for every invisible or confusable character.
 */

export interface InjectionSignal {
  rule: string;
  weight: number;
  excerpt: string;
}

export interface InjectionVerdict {
  suspicious: boolean;
  quarantine: boolean;
  score: number;
  severity: Severity;
  signals: InjectionSignal[];
  normalized_length: number;
}

interface Rule {
  id: string;
  weight: number;
  pattern: RegExp;
}

/** A gap of up to N words, allowing "$25", "4.99" or "20%" but never crossing a sentence end. */
const gap = (n: number) => String.raw`(?:[\w\s'%-]|\$(?=\d)|[.,](?=\d)){0,${n}}`;

const OVERRIDE_VERBS = "ignore|disregard|forget|override|bypass|skip";
const OVERRIDE_NOUNS = "instructions?|rules?|prompts?|polic(?:y|ies)|guidelines?|guidance|directions?|directives?|commands?|orders?|constraints?|mandates?|limits?";
const BUDGET_OBJECTS =
  "budgets?|spend(?:ing)? (?:limits?|caps?|mandates?|thresholds?)|budget (?:limits?|caps?|thresholds?)|approval (?:limits?|thresholds?)|(?:purchase|purchasing|order|credit) limits?|limits? on (?:spending|purchases|orders)|mandates?";

const RULES: Rule[] = [
  {
    id: "override_instructions",
    weight: 6,
    pattern: new RegExp(String.raw`\b(${OVERRIDE_VERBS})\b[\w\s,'-]{0,40}\b(previous|prior|above|earlier|all|any|your|the|system|these|those|my|our)\b[\w\s,'-]{0,30}\b(${OVERRIDE_NOUNS})\b`, "i"),
  },
  {
    // French, Spanish, German and Portuguese overrides; matched on the diacritic-folded variant.
    id: "override_instructions_multilingual",
    weight: 6,
    pattern:
      /\b(ignorez|ignore[rz]?|oubliez|oublie|ignora|ignore|ignorar|olvida|olvide|olvidar|omite|descarta|ignoriere|ignorieren|vergiss|vergessen|esqueca|esquece)\b[\w\s,'-]{0,40}\b(instructions?|consignes?|regles?|directives?|instrucciones|instruccion|reglas|indicaciones|anweisungen|regeln|instrucoes|regras)\b/i,
  },
  {
    id: "role_hijack",
    weight: 5,
    pattern:
      /\b(you are now|act as (?:an? |the |your )?(?:ai|assistant|admin(?:istrator)?|system|agent|approver|owner|manager|buyer|procurement (?:agent|assistant))|pretend (?:to be|you are)|from now on,? you|new (?:system )?instructions?|developer mode|jailbreak|DAN mode)\b/i,
  },
  { id: "system_prompt_reference", weight: 4, pattern: /\b(system prompt|system message|hidden instructions?|\[\/?(system|inst|assistant)\]|<\/?(system|assistant|instructions?)>|###\s*(system|instruction))/i },
  { id: "agent_addressing", weight: 3, pattern: /\b(attention|note|message|instruction)s?\s+(to|for)\s+(the\s+)?(ai|assistant|agent|llm|model|bot|procurement (agent|assistant))\b|\b(dear|hey|hello)\s+(ai|assistant|agent|llm|model|bot)\b/i },
  {
    // Qualified budget nouns only: "remove the cap" on a bottle is product copy, not an attack.
    id: "budget_manipulation",
    weight: 5,
    pattern: new RegExp(String.raw`\b(increase|raise|ignore|remove|disable|exceed|double|override|lift|bypass|waive)\b[\w\s'-]{0,25}\b(${BUDGET_OBJECTS})\b`, "i"),
  },
  { id: "approval_manipulation", weight: 5, pattern: /\b(auto[- ]?approve|pre[- ]?approved|already (been )?approved|approval (is )?(not )?(required|needed)|skip (the )?(approval|review|verification)|no (need for|human) (approval|review))\b/i },
  {
    id: "fee_injection",
    weight: 4,
    pattern: new RegExp(String.raw`\b(add|include|append|apply|charge)\b${gap(30)}\b(fee|surcharge|service charge|handling charge|processing charge|convenience charge|tip|gratuity|donation)\b`, "i"),
  },
  {
    // A charge aimed at "this order" / "the total" is an instruction, not a published term.
    id: "fee_targets_order",
    weight: 2,
    pattern:
      /\b(fee|surcharge|service charge|handling charge|processing charge|convenience charge|tip|gratuity|donation)s?\b[\w\s$.,%'-]{0,20}\b(to|on|onto)\s+(this|the|your|every|each|all)\s+(orders?|carts?|invoices?|totals?|purchases?|checkouts?)\b/i,
  },
  { id: "fee_mandate", weight: 4, pattern: /\b(fee|surcharge|service charge|handling charge|processing charge|convenience charge|tip|gratuity)s?\b[\w\s$.,'-]{0,40}\b(must|shall|should|will|is to|needs to)\s+be\s+(added|included|applied|charged|appended)\b/i },
  { id: "payment_redirect", weight: 6, pattern: /\b(send|transfer|wire|pay|remit)\b[\w\s'-]{0,30}\b(to|via)\b[\w\s'-]{0,20}\b(account|wallet|paypal\.me|iban|routing|bitcoin|crypto|gift ?cards?|venmo|zelle)\b/i },
  { id: "credential_request", weight: 6, pattern: /\b(api[_ -]?key|secret|password|access[_ -]?token|private key|client[_ -]?secret|credentials?)\b[\w\s'-]{0,20}\b(send|share|reveal|print|output|provide|include)\b|\b(send|share|reveal|print|output|provide)\b[\w\s'-]{0,20}\b(api[_ -]?key|secret|password|access[_ -]?token|private key|client[_ -]?secret|credentials?)\b/i },
  { id: "tool_invocation", weight: 4, pattern: /\b(call|invoke|execute|run|use)\b[\w\s'-]{0,15}\b(function|tool|capture|refund|checkout|payment api|api)\b[\w\s'-]{0,25}\b(now|immediately|automatically|without)\b/i },
  { id: "priority_claim", weight: 2, pattern: /\b(mandatory|required by law|must be added|non[- ]?negotiable|this (supersedes|overrides))\b/i },
  { id: "quantity_manipulation", weight: 3, pattern: /\b(order|buy|purchase)\b[\w\s'-]{0,15}\b(\d{2,}x|ten times|maximum quantity|as many as possible|entire stock|all (available )?(units|stock))\b/i },
  { id: "exfiltration_link", weight: 3, pattern: /\b(visit|open|go to|navigate to|click)\b[\w\s'-]{0,20}(https?:\/\/|www\.)/i },
];

/**
 * Characters that render as nothing (or as whitespace) and are used to split keywords or to
 * smuggle text: every Unicode format character (\p{Cf}: zero-width space/joiners, bidi
 * embeddings, overrides and isolates U+2066–2069, word joiner, BOM, soft hyphen, U+180E, the
 * tag block U+E0000–E007F, …), the combining grapheme joiner U+034F, variation selectors
 * (U+FE00–FE0F, U+E0100–E01EF), Hangul and Khmer fillers, and C0/C1 controls other than
 * whitespace.
 */
const INVISIBLE = /[\p{Cf}͏︀-️\u{E0100}-\u{E01EF}ᅟᅠㅤﾠ឴឵\u0000-\u0008\u000E-\u001F\u007F-\u009F]/gu;

/** Unicode tag characters U+E0020–E007E mirror printable ASCII and are invisible ("ASCII smuggling"). */
const TAG_CHARS = /[\u{E0020}-\u{E007E}]/gu;

/** Cross-script confusables that NFKC does not fold, mapped to the Latin letter they imitate. */
const HOMOGLYPH_PAIRS: [number, string][] = [
  // Cyrillic lower case
  [0x0430, "a"], [0x0432, "b"], [0x0435, "e"], [0x043a, "k"], [0x043c, "m"], [0x043d, "h"], [0x043e, "o"], [0x0440, "p"], [0x0441, "c"],
  [0x0442, "t"], [0x0443, "y"], [0x0445, "x"], [0x0455, "s"], [0x0456, "i"], [0x0457, "i"], [0x0458, "j"], [0x04bb, "h"], [0x04cf, "l"],
  [0x0501, "d"], [0x051b, "q"], [0x051d, "w"], [0x0461, "w"], [0x0475, "v"],
  // Cyrillic upper case
  [0x0410, "A"], [0x0412, "B"], [0x0415, "E"], [0x041a, "K"], [0x041c, "M"], [0x041d, "H"], [0x041e, "O"], [0x0420, "P"], [0x0421, "C"],
  [0x0422, "T"], [0x0423, "Y"], [0x0425, "X"], [0x0405, "S"], [0x0406, "I"], [0x0407, "I"], [0x0408, "J"], [0x04c0, "I"],
  // Greek
  [0x03b1, "a"], [0x03b5, "e"], [0x03b9, "i"], [0x03ba, "k"], [0x03bd, "v"], [0x03bf, "o"], [0x03c1, "p"], [0x03c4, "t"], [0x03c5, "u"],
  [0x03c7, "x"], [0x0391, "A"], [0x0392, "B"], [0x0395, "E"], [0x0396, "Z"], [0x0397, "H"], [0x0399, "I"], [0x039a, "K"], [0x039c, "M"],
  [0x039d, "N"], [0x039f, "O"], [0x03a1, "P"], [0x03a4, "T"], [0x03a5, "Y"], [0x03a7, "X"],
  // Armenian
  [0x0585, "o"], [0x057d, "u"], [0x0570, "h"], [0x0578, "n"], [0x0581, "g"], [0x0566, "q"], [0x0561, "w"],
  // Latin look-alikes: script g, dotless i/j, small capitals
  [0x0261, "g"], [0x0131, "i"], [0x0237, "j"], [0x1d00, "a"], [0x0299, "b"], [0x1d04, "c"], [0x1d05, "d"], [0x1d07, "e"], [0x0262, "g"],
  [0x029c, "h"], [0x026a, "i"], [0x1d0a, "j"], [0x1d0b, "k"], [0x029f, "l"], [0x1d0d, "m"], [0x0274, "n"], [0x1d0f, "o"], [0x1d18, "p"],
  [0x0280, "r"], [0xa731, "s"], [0x1d1b, "t"], [0x1d1c, "u"], [0x1d20, "v"], [0x1d21, "w"], [0x028f, "y"], [0x1d22, "z"],
];
const HOMOGLYPHS = new Map<string, string>(HOMOGLYPH_PAIRS.map(([cp, ascii]) => [String.fromCodePoint(cp), ascii]));

const LEET: Record<string, string> = { "0": "o", "1": "i", "3": "e", "4": "a", "5": "s", "7": "t", "@": "a", $: "s" };

/** Counts invisible characters (including tag characters) in raw text. */
export function countInvisibleCharacters(text: string): number {
  return (String(text ?? "").match(INVISIBLE) ?? []).length;
}

export function normalizeUntrustedText(text: string): string {
  let t = String(text ?? "").normalize("NFKC").replace(INVISIBLE, "");
  t = [...t].map((ch) => HOMOGLYPHS.get(ch) ?? ch).join("");
  // Collapse letter-spaced words ("i g n o r e", "i.g.n.o.r.e"): runs of 3+ single letters joined
  // by exactly one separator. A wider gap (two spaces, " / ") stays a word boundary, so
  // "i g n o r e  a l l" becomes "ignore all", not "ignoreall".
  t = t.replace(/(?<![\p{L}\p{N}])\p{L}(?:[ ._-]\p{L}){2,}(?![\p{L}\p{N}])/gu, (m) => m.replace(/[ ._-]/g, ""));
  return t.replace(/\s+/g, " ").trim();
}

/** Removes diacritics ("précédentes" → "precedentes") for matching only. */
function foldDiacritics(text: string): string {
  return text.normalize("NFD").replace(/\p{M}/gu, "").normalize("NFC");
}

function deLeet(text: string): string {
  // Fold leetspeak only inside tokens that mix letters with digits/symbols ("1gn0re"), so pure
  // numbers and prices like "$4.99" are untouched. This variant is matched in addition to the
  // original text, never instead of it.
  return text.replace(/[A-Za-z013457@$]+/g, (token) =>
    /[A-Za-z]/.test(token) && /[013457@$]/.test(token) ? [...token].map((c) => LEET[c] ?? c).join("") : token,
  );
}

/** Decodes Unicode tag characters back to the ASCII they smuggle. */
function decodeTagCharacters(text: string): string {
  return [...text.matchAll(TAG_CHARS)].map((m) => String.fromCharCode(m[0].codePointAt(0)! - 0xe0000)).join("");
}

function excerptAround(text: string, index: number, length: number): string {
  const start = Math.max(0, index - 20);
  const end = Math.min(text.length, index + length + 20);
  return `${start > 0 ? "…" : ""}${text.slice(start, end)}${end < text.length ? "…" : ""}`;
}

export interface DetectOptions {
  /** Score at or above which a source is quarantined. */
  quarantineThreshold?: number;
}

/** Bounds on encoded-payload analysis: how many blobs, how long, how deep. */
const MAX_ENCODED_BLOBS = 8;
const MAX_ENCODED_LENGTH = 8_192;
const MAX_ENCODED_DEPTH = 2;

export function detectPromptInjection(rawText: string, options: DetectOptions = {}): InjectionVerdict {
  return detect(typeof rawText === "string" ? rawText : String(rawText ?? ""), options, 0);
}

function detect(raw: string, options: DetectOptions, depth: number): InjectionVerdict {
  const threshold = options.quarantineThreshold ?? 5;
  const signals: InjectionSignal[] = [];
  const normalized = normalizeUntrustedText(raw);
  const folded = foldDiacritics(normalized);
  const smuggled = decodeTagCharacters(raw);
  // Identical variants (plain ASCII text) are matched once.
  const variants = [...new Set([normalized, folded, deLeet(folded), ...(smuggled.trim() ? [normalizeUntrustedText(smuggled)] : [])])];

  for (const rule of RULES) {
    for (const variant of variants) {
      const m = rule.pattern.exec(variant);
      if (m) {
        signals.push({ rule: rule.id, weight: rule.weight, excerpt: excerptAround(variant, m.index, m[0].length) });
        break;
      }
    }
  }

  // Structural signals: hidden characters and encoded payloads are suspicious in product copy.
  const invisibleCount = countInvisibleCharacters(raw);
  const tagCount = (raw.match(TAG_CHARS) ?? []).length;
  if (tagCount > 0) {
    signals.push({ rule: "hidden_characters", weight: 5, excerpt: `${tagCount} invisible tag characters encoding "${smuggled.slice(0, 60)}"` });
  } else if (invisibleCount >= 3) {
    signals.push({ rule: "hidden_characters", weight: 3, excerpt: `${invisibleCount} invisible characters` });
  }
  if (depth < MAX_ENCODED_DEPTH) {
    let best: { score: number; excerpt: string } | null = null;
    let seen = 0;
    for (const b64 of raw.matchAll(/[A-Za-z0-9+/]{60,}={0,2}/g)) {
      if (++seen > MAX_ENCODED_BLOBS) break;
      const decoded = safeBase64Decode(b64[0].slice(0, MAX_ENCODED_LENGTH));
      // "Looks like words": anchored at a word start (\b) so a long run of letters is scanned
      // once, not once per position (the unanchored form is quadratic).
      if (!decoded || !/\b[a-z]{3,}\s+[a-z]{3}/i.test(decoded)) continue;
      const inner = detect(decoded, options, depth + 1);
      if (!best || inner.score > best.score) best = { score: inner.score, excerpt: `${b64[0].slice(0, 24)}…` };
    }
    if (best) signals.push({ rule: "encoded_payload", weight: 2 + Math.min(best.score, 6), excerpt: best.excerpt });
  }
  // An HTML comment is found with indexOf rather than /<!--[\s\S]*?-->/, which is quadratic on
  // input full of unterminated "<!--".
  const commentStart = raw.indexOf("<!--");
  const hasComment = commentStart !== -1 && raw.indexOf("-->", commentStart + 4) !== -1;
  if (hasComment || /<\s*(script|style|iframe)\b|display\s*:\s*none|font-size\s*:\s*0/i.test(raw)) {
    signals.push({ rule: "hidden_markup", weight: 3, excerpt: "markup that hides text from human readers" });
  }

  const score = signals.reduce((acc, s) => acc + s.weight, 0);
  return {
    suspicious: score >= 3,
    quarantine: score >= threshold,
    score,
    severity: severityFor(score),
    signals,
    normalized_length: normalized.length,
  };
}

function severityFor(score: number): Severity {
  if (score >= 10) return "CRITICAL";
  if (score >= 5) return "HIGH";
  if (score >= 3) return "MEDIUM";
  return "LOW";
}

function safeBase64Decode(value: string): string | null {
  try {
    const decoded = Buffer.from(value, "base64").toString("utf8");
    // Require mostly printable output to avoid treating random binary as text.
    const printable = decoded.replace(/[^\x20-\x7E\s]/g, "");
    return printable.length / Math.max(1, decoded.length) > 0.9 ? decoded : null;
  } catch {
    return null;
  }
}

/** Escalate-only merge of a heuristic verdict with an optional classifier verdict. */
export function mergeVerdicts(heuristic: InjectionVerdict, classifier: { injection: boolean; confidence: number; reason: string } | null): InjectionVerdict {
  if (!classifier || !classifier.injection || classifier.confidence < 0.6) return heuristic;
  const weight = classifier.confidence >= 0.85 ? 5 : 3;
  const signals = [...heuristic.signals, { rule: "model_classifier", weight, excerpt: classifier.reason.slice(0, 160) }];
  const score = heuristic.score + weight;
  return {
    ...heuristic,
    signals,
    score,
    suspicious: true,
    quarantine: heuristic.quarantine || score >= 5,
    severity: severityFor(score),
  };
}

/**
 * Wraps untrusted text for inclusion in a model prompt. The content is delimited, labelled as
 * data and stripped of anything that could close the delimiter. Invisible and format
 * characters (zero-width, bidi controls, tag characters, variation selectors) are removed by
 * the normalisation, so nothing the model sees is hidden from a human reviewer.
 */
export function fenceUntrusted(label: string, text: string, maxLength = 1500): string {
  // Angle brackets are escaped so the content cannot open or close any tag, and the boundary
  // carries a random nonce the content cannot predict.
  const clean = [...normalizeUntrustedText(text)]
    .slice(0, maxLength)
    .join("")
    .replace(INVISIBLE, "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
  const nonce = randomBytes(8).toString("hex");
  const source = String(label ?? "").replace(/[^\w:.-]/g, "_");
  return `<untrusted-${nonce} source="${source}">\n${clean}\n</untrusted-${nonce}>`;
}
