/**
 * The one email layout Quartermaster sends: account emails (invitations, password resets) and
 * notifications (payment completed, approval needed, …). Email clients ignore stylesheets and
 * most modern CSS, so this is table-based with inline styles only, a 600 px column, a system font
 * stack, a "bulletproof" button and a plain-text twin for clients that do not render HTML.
 * Every interpolated value is escaped; links are only ever the app's own URLs.
 */
import { escapeHtml } from "./mailer";

export type EmailTone = "success" | "attention" | "blocked" | "info";

export interface EmailDetail {
  label: string;
  value: string;
}

export interface EmailContent {
  /** Shown in the inbox list after the subject; never visible in the body. */
  preheader: string;
  /** Short status line in the coloured band, e.g. "Payment completed". */
  status: string;
  tone: EmailTone;
  title: string;
  /** One or two short paragraphs. Plain text: escaped here. */
  paragraphs: string[];
  details?: EmailDetail[];
  action?: { label: string; href: string };
  /** Small print under the card. Plain text. */
  footnote?: string;
}

const C = {
  canvas: "#f4f6f9",
  surface: "#ffffff",
  line: "#e4e7ec",
  ink: "#101828",
  ink2: "#344054",
  ink3: "#5b6576",
  accent: "#2453d8",
};

const TONES: Record<EmailTone, { fg: string; bg: string; line: string }> = {
  success: { fg: "#067647", bg: "#ecfdf3", line: "#abefc6" },
  attention: { fg: "#b54708", bg: "#fffaeb", line: "#fedf89" },
  blocked: { fg: "#b42318", bg: "#fef3f2", line: "#fecdca" },
  info: { fg: "#1a3fae", bg: "#eef3ff", line: "#c7d6fb" },
};

const FONT = "-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif";

/** Money for people: "$173.20", "¥1,200". Amounts stay integer minor units until this point. */
export function formatMoney(minor: number, currency: string): string {
  const fmt = new Intl.NumberFormat("en-US", { style: "currency", currency });
  const digits = fmt.resolvedOptions().maximumFractionDigits ?? 2;
  return fmt.format(minor / 10 ** digits);
}

/** "2026-11-12" -> "Thu, Nov 12, 2026" (a calendar date, so no time zone may move it). */
export function formatDate(isoDate: string): string {
  const d = new Date(`${isoDate.slice(0, 10)}T00:00:00Z`);
  if (Number.isNaN(d.getTime())) return isoDate;
  return d.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric", year: "numeric", timeZone: "UTC" });
}

export function renderEmail(c: EmailContent): { html: string; text: string } {
  const t = TONES[c.tone];
  const e = escapeHtml;
  const details = c.details?.length
    ? `<tr><td style="padding:16px 32px 4px 32px">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse;border:1px solid ${C.line};border-radius:10px">
${c.details
  .map(
    (d, i) => `<tr>
<td style="padding:11px 16px;font:400 13px/1.4 ${FONT};color:${C.ink3};${i ? `border-top:1px solid ${C.line};` : ""}width:42%">${e(d.label)}</td>
<td style="padding:11px 16px;font:600 14px/1.4 ${FONT};color:${C.ink};text-align:right;${i ? `border-top:1px solid ${C.line};` : ""}">${e(d.value)}</td>
</tr>`,
  )
  .join("\n")}
</table></td></tr>`
    : "";
  const action = c.action
    ? `<tr><td style="padding:20px 32px 8px 32px">
<table role="presentation" cellpadding="0" cellspacing="0"><tr>
<td style="border-radius:8px;background:${C.accent}">
<a href="${e(c.action.href)}" style="display:inline-block;padding:12px 22px;font:600 14px/1 ${FONT};color:#ffffff;text-decoration:none;border-radius:8px">${e(c.action.label)}</a>
</td></tr></table></td></tr>`
    : "";
  const html = `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="color-scheme" content="light"><title>${e(c.title)}</title></head>
<body style="margin:0;padding:0;background:${C.canvas}">
<div style="display:none;max-height:0;overflow:hidden;opacity:0;color:transparent">${e(c.preheader)}</div>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:${C.canvas}"><tr><td align="center" style="padding:32px 16px">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:600px">
<tr><td style="padding:0 4px 16px 4px">
<table role="presentation" cellpadding="0" cellspacing="0"><tr>
<td style="width:28px;height:28px;border-radius:7px;background:${C.ink};text-align:center;font:700 14px/28px ${FONT};color:#ffffff">Q</td>
<td style="padding-left:10px;font:700 15px/1.2 ${FONT};color:${C.ink}">Quartermaster<br><span style="font:500 12px/1.4 ${FONT};color:${C.ink3}">Secured by TrustRail</span></td>
</tr></table></td></tr>
<tr><td style="background:${C.surface};border:1px solid ${C.line};border-radius:14px;overflow:hidden">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0">
<tr><td style="background:${t.bg};border-bottom:1px solid ${t.line};padding:12px 32px;font:600 13px/1.4 ${FONT};color:${t.fg}">&#9679;&nbsp; ${e(c.status)}</td></tr>
<tr><td style="padding:26px 32px 6px 32px;font:700 22px/1.3 ${FONT};color:${C.ink}">${e(c.title)}</td></tr>
${c.paragraphs.map((p) => `<tr><td style="padding:6px 32px;font:400 15px/1.55 ${FONT};color:${C.ink2}">${e(p)}</td></tr>`).join("\n")}
${details}
${action}
<tr><td style="padding:0 0 26px 0"></td></tr>
</table></td></tr>
${c.footnote ? `<tr><td style="padding:16px 8px 0 8px;font:400 12px/1.5 ${FONT};color:${C.ink3}">${e(c.footnote)}</td></tr>` : ""}
</table></td></tr></table>
</body></html>`;
  const text = [
    `${c.status}`,
    "",
    c.title,
    "",
    ...c.paragraphs.flatMap((p) => [p, ""]),
    ...(c.details?.length ? [...c.details.map((d) => `${d.label}: ${d.value}`), ""] : []),
    ...(c.action ? [`${c.action.label}: ${c.action.href}`, ""] : []),
    ...(c.footnote ? [c.footnote] : []),
  ]
    .join("\n")
    .trim();
  return { html, text };
}
