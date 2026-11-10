import { renderEmail, type EmailMessage } from "@qm/integrations";

/**
 * Account emails. One-time tokens travel in the URL fragment (`#token=`), which browsers never
 * send to servers or in Referer headers, so links do not end up in access logs.
 */
export function linkWithToken(appBaseUrl: string, path: string, token: string): string {
  return `${new URL(path, appBaseUrl).toString()}#token=${token}`;
}

const ROLE_LABEL = { OWNER: "an owner", MANAGER: "a manager", VIEWER: "a viewer" } as const;

const IGNORE = "If you did not expect this email, you can ignore it: nothing changes until the link is used.";

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
    html: renderEmail({
      preheader: `${who} invited you to ${args.organizationName} on Quartermaster.`,
      status: "Invitation",
      tone: "info",
      title: `Join ${args.organizationName} on Quartermaster`,
      paragraphs: [
        `${who} invited you to ${args.organizationName} as ${ROLE_LABEL[args.role]}.`,
        `The link works once and expires ${expires}.`,
      ],
      action: { label: "Accept invitation", href: args.url },
      footnote: IGNORE,
    }).html,
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
    html: renderEmail({
      preheader: "Choose a new password for Quartermaster.",
      status: "Password reset",
      tone: "info",
      title: "Reset your password",
      paragraphs: [why, `The link works once and expires ${expires}. Your password stays the same until you use it.`],
      action: { label: "Choose a new password", href: args.url },
      footnote: IGNORE,
    }).html,
  };
}
