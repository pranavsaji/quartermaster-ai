/**
 * Error text from providers (response bodies, refusals, network errors) can echo credentials:
 * OpenAI's 401 body quotes the key it was given, proxies echo headers. Before such text is put
 * into an error message it is reduced to one short line with anything secret-shaped replaced.
 * Callers must still treat the result as internal (logs), never as client-facing text.
 */
const SECRET_PATTERNS: RegExp[] = [
  // Provider-style keys, including partially masked ones ("sk-proj-abc***xyz").
  /\b(?:sk|pk|rk)[-_][A-Za-z0-9_\-*.]{4,}/gi,
  // Authorization schemes.
  /\b(?:Bearer|Basic) +[A-Za-z0-9._~+/=-]{8,}/g,
  // key=value / key: value pairs whose key names a credential.
  /\b(?:api[_-]?key|access[_-]?token|refresh[_-]?token|token|secret|password|authorization|x-api-key)\b(["']?\s*[:=]\s*["']?)[^\s"',;&]+/gi,
  // Long opaque tokens (hex, base64, JWT segments).
  /[A-Za-z0-9_\-+/=]{32,}/g,
];

export const REDACTED = "[redacted]";

/** One line, at most `max` characters, with secret-shaped substrings replaced by "[redacted]". */
export function redactSecrets(text: string, max = 160): string {
  let out = text.replace(/\s+/g, " ").trim();
  for (const p of SECRET_PATTERNS) {
    out = out.replace(p, (match: string, sep?: unknown) => {
      // Keep the credential's name ("api_key=") so the reason stays useful; drop its value.
      if (typeof sep === "string") return `${match.slice(0, match.indexOf(sep) + sep.length)}${REDACTED}`;
      return REDACTED;
    });
  }
  return out.length > max ? `${out.slice(0, max - 1)}…` : out;
}
