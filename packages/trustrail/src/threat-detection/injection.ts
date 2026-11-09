import { randomBytes } from "node:crypto";
import type { Severity } from "@qm/contracts";

/**
 * Heuristic detector for instructions embedded in untrusted commercial content
 * (supplier listings, market search results, invoice notes).
 *
 * Design rules:
 *  - Detection never grants anything. It can only raise suspicion, quarantine a source and
 *    keep its text away from the language model. Policy enforcement does not depend on it.
 *  - Text is normalised first (Unicode NFKC, zero-width removal, homoglyph folding, leetspeak)
 *    so trivial obfuscation does not bypass the rules.
 *  - An optional model-based classifier may only escalate a verdict, never downgrade it.
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

const RULES: Rule[] = [
  { id: "override_instructions", weight: 6, pattern: /\b(ignore|disregard|forget|override|bypass|skip)\b[\w\s,'-]{0,40}\b(previous|prior|above|earlier|all|any|your|the|system)\b[\w\s,'-]{0,30}\b(instructions?|rules?|prompts?|polic(y|ies)|guidelines?|constraints?|mandates?|limits?)\b/i },
  { id: "role_hijack", weight: 5, pattern: /\b(you are now|act as|pretend to be|from now on,? you|new (system )?instructions?|developer mode|jailbreak|DAN mode)\b/i },
  { id: "system_prompt_reference", weight: 4, pattern: /\b(system prompt|system message|hidden instructions?|\[\/?(system|inst|assistant)\]|<\/?(system|assistant|instructions?)>|###\s*(system|instruction))/i },
  { id: "agent_addressing", weight: 3, pattern: /\b(attention|note|message|instruction)s?\s+(to|for)\s+(the\s+)?(ai|assistant|agent|llm|model|bot|procurement (agent|assistant))\b|\b(dear|hey|hello)\s+(ai|assistant|agent|llm|model|bot)\b/i },
  { id: "budget_manipulation", weight: 5, pattern: /\b(increase|raise|ignore|remove|disable|exceed|double|override)\b[\w\s'-]{0,25}\b(budget|spend(ing)? (limit|cap|mandate)|limit|cap|threshold|mandate)\b/i },
  { id: "approval_manipulation", weight: 5, pattern: /\b(auto[- ]?approve|pre[- ]?approved|already (been )?approved|approval (is )?(not )?(required|needed)|skip (the )?(approval|review|verification)|no (need for|human) (approval|review))\b/i },
  { id: "fee_injection", weight: 4, pattern: /\b(add|include|append|apply|charge)\b[\w\s'-]{0,30}\b(fee|surcharge|service charge|handling charge|processing charge|convenience charge|tip|gratuity|donation)\b/i },
  { id: "payment_redirect", weight: 6, pattern: /\b(send|transfer|wire|pay|remit)\b[\w\s'-]{0,30}\b(to|via)\b[\w\s'-]{0,20}\b(account|wallet|paypal\.me|iban|routing|bitcoin|crypto|gift ?cards?|venmo|zelle)\b/i },
  { id: "credential_request", weight: 6, pattern: /\b(api[_ -]?key|secret|password|access[_ -]?token|private key|client[_ -]?secret|credentials?)\b[\w\s'-]{0,20}\b(send|share|reveal|print|output|provide|include)\b|\b(send|share|reveal|print|output|provide)\b[\w\s'-]{0,20}\b(api[_ -]?key|secret|password|access[_ -]?token|private key|client[_ -]?secret|credentials?)\b/i },
  { id: "tool_invocation", weight: 4, pattern: /\b(call|invoke|execute|run|use)\b[\w\s'-]{0,15}\b(function|tool|capture|refund|checkout|payment api|api)\b[\w\s'-]{0,25}\b(now|immediately|automatically|without)\b/i },
  { id: "priority_claim", weight: 2, pattern: /\b(mandatory|required by law|must be added|non[- ]?negotiable|this (supersedes|overrides))\b/i },
  { id: "quantity_manipulation", weight: 3, pattern: /\b(order|buy|purchase)\b[\w\s'-]{0,15}\b(\d{2,}x|ten times|maximum quantity|as many as possible|entire stock|all (available )?(units|stock))\b/i },
  { id: "exfiltration_link", weight: 3, pattern: /\b(visit|open|go to|navigate to|click)\b[\w\s'-]{0,20}(https?:\/\/|www\.)/i },
];

const ZERO_WIDTH = /[​-‏‪-‮⁠-⁤﻿­]/g;

const HOMOGLYPHS: Record<string, string> = {
  "а": "a", "е": "e", "о": "o", "р": "p", "с": "c", "у": "y", "х": "x",
  "і": "i", "ј": "j", "ӏ": "l", "Α": "A", "Β": "B", "Ε": "E", "Η": "H",
  "Ι": "I", "Κ": "K", "Μ": "M", "Ν": "N", "Ο": "O", "Ρ": "P", "Τ": "T",
  "Χ": "X", "ο": "o", "α": "a",
};

const LEET: Record<string, string> = { "0": "o", "1": "i", "3": "e", "4": "a", "5": "s", "7": "t", "@": "a", "$": "s" };

export function normalizeUntrustedText(text: string): string {
  let t = text.normalize("NFKC").replace(ZERO_WIDTH, "");
  t = [...t].map((ch) => HOMOGLYPHS[ch] ?? ch).join("");
  // Collapse "i g n o r e" style letter spacing (runs of single letters separated by spaces or dots).
  t = t.replace(/\b(?:[A-Za-z][\s._-]){3,}[A-Za-z]\b/g, (m) => m.replace(/[\s._-]/g, ""));
  return t.replace(/\s+/g, " ").trim();
}

function deLeet(text: string): string {
  // Only fold digits/symbols that sit inside words, so prices like "$4.99" are untouched.
  return text.replace(/(?<=[A-Za-z])[013457@$]+(?=[A-Za-z])|(?<=\s|^)[@$](?=[A-Za-z])/g, (m) =>
    [...m].map((c) => LEET[c] ?? c).join(""),
  );
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

export function detectPromptInjection(rawText: string, options: DetectOptions = {}): InjectionVerdict {
  const threshold = options.quarantineThreshold ?? 5;
  const signals: InjectionSignal[] = [];
  const raw = rawText ?? "";
  const normalized = normalizeUntrustedText(raw);
  const variants = [normalized, deLeet(normalized)];

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
  const zeroWidthCount = (raw.match(ZERO_WIDTH) ?? []).length;
  if (zeroWidthCount >= 3) {
    signals.push({ rule: "hidden_characters", weight: 3, excerpt: `${zeroWidthCount} invisible characters` });
  }
  const b64 = /[A-Za-z0-9+/]{60,}={0,2}/.exec(raw);
  if (b64) {
    const decoded = safeBase64Decode(b64[0]);
    if (decoded && /[a-z]{3,}\s+[a-z]{3,}/i.test(decoded)) {
      const inner = detectPromptInjection(decoded, options);
      signals.push({ rule: "encoded_payload", weight: 2 + Math.min(inner.score, 6), excerpt: `${b64[0].slice(0, 24)}…` });
    }
  }
  if (/<!--[\s\S]*?-->|<\s*(script|style|iframe)\b|display\s*:\s*none|font-size\s*:\s*0/i.test(raw)) {
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
 * data and stripped of anything that could close the delimiter.
 */
export function fenceUntrusted(label: string, text: string, maxLength = 1500): string {
  // Angle brackets are escaped so the content cannot open or close any tag, and the boundary
  // carries a random nonce the content cannot predict.
  const clean = normalizeUntrustedText(text)
    .slice(0, maxLength)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
  const nonce = randomBytes(8).toString("hex");
  const source = label.replace(/[^\w:.-]/g, "_");
  return `<untrusted-${nonce} source="${source}">\n${clean}\n</untrusted-${nonce}>`;
}
