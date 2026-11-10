import { escapeHtml, type EmailMessage } from "@qm/integrations";

/**
 * Account emails. One-time tokens travel in the URL fragment (`#token=`), which browsers never
 * send to servers or in Referer headers, so links do not end up in access logs.
 */
export function linkWithToken(appBaseUrl: string, path: string, token: string): string {
  return `${new URL(path, appBaseUrl).toString()}#token=${token}`;
}

const ROLE_LABEL = { OWNER: "an owner", MANAGER: "a manager", VIEWER: "a viewer" } as const;

function layout(paragraphs: string[], link: { href: string; label: string }): string {
  return [
    '<div style="font-family:system-ui,-apple-system,sans-serif;font-size:15px;line-height:1.5;color:#1f2933">',
    ...paragraphs.map((p) => `<p>${p}</p>`),
    `<p><a href="${escapeHtml(link.href)}" style="display:inline-block;padding:10px 16px;background:#2457d6;color:#fff;border-radius:6px;text-decoration:none">${escapeHtml(link.label)}</a></p>`,
    '<p style="color:#64748b;font-size:13px">If you did not expect this email, you can ignore it.</p>',
    "</div>",
  ].join("");
}

export function invitationEmail(args: {
  to: string;
  organizationName: string;
  inviterName: string | null;
  role: keyof typeof ROLE_LABEL;
  url: string;
  expiresAt: Date;
}): EmailMessage {
  const who = args.inviterName ?? "An owner";
  const expires = args.expiresAt.toUTCString();
  return {
    kind: "invitation",
    to: args.to,
    subject: `Join ${args.organizationName} on Quartermaster`.slice(0, 200),
    text: `${who} invited you to ${args.organizationName} on Quartermaster as ${ROLE_LABEL[args.role]}.\n\nAccept the invitation: ${args.url}\n\nThe link works once and expires ${expires}.`,
    html: layout(
      [
        `${escapeHtml(who)} invited you to <strong>${escapeHtml(args.organizationName)}</strong> on Quartermaster as ${ROLE_LABEL[args.role]}.`,
        `The link works once and expires ${escapeHtml(expires)}.`,
      ],
      { href: args.url, label: "Accept invitation" },
    ),
  };
}

export function passwordResetEmail(args: { to: string; url: string; expiresAt: Date; issuedByOwner: boolean }): EmailMessage {
  const expires = args.expiresAt.toUTCString();
  const why = args.issuedByOwner
    ? "An owner of your workspace issued a password reset link for you."
    : "Someone asked to reset your password.";
  return {
    kind: "password_reset",
    to: args.to,
    subject: "Reset your Quartermaster password",
    text: `${why}\n\nChoose a new password: ${args.url}\n\nThe link works once and expires ${expires}. Your password stays the same until you use it.`,
    html: layout(
      [escapeHtml(why), `The link works once and expires ${escapeHtml(expires)}. Your password stays the same until you use it.`],
      { href: args.url, label: "Choose a new password" },
    ),
  };
}
