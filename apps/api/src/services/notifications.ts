import { and, asc, eq } from "drizzle-orm";
import { DEMO_CREDENTIALS, memberships, users, type Database } from "@qm/database";

/** At most this many owners of one workspace receive each notification email. */
export const MAX_NOTIFICATION_RECIPIENTS = 5;

/** Addresses that can never receive mail: removed members (`.invalid`) and reserved test domains. */
const UNDELIVERABLE = /\.(invalid|test|example|localhost)$|@example\.(com|org|net)$/i;
/** The shared sample workspace's accounts are not real mailboxes. */
const SAMPLE_DOMAINS = new Set(Object.values(DEMO_CREDENTIALS).map((c) => c.email.split("@")[1]!.toLowerCase()));

export function isDeliverableAddress(email: string): boolean {
  const domain = email.split("@")[1]?.toLowerCase() ?? "";
  return Boolean(domain) && !UNDELIVERABLE.test(email) && !SAMPLE_DOMAINS.has(domain);
}

/**
 * The email-notification recipients of a workspace: its enabled owners with a deliverable address,
 * oldest membership first. Policy facts never come from here; it only addresses informational mail.
 */
export function ownerNotificationRecipients(db: Database) {
  return async (organizationId: string): Promise<string[]> => {
    const rows = await db
      .select({ email: users.email })
      .from(memberships)
      .innerJoin(users, eq(users.id, memberships.userId))
      .where(and(eq(memberships.organizationId, organizationId), eq(memberships.role, "OWNER"), eq(users.disabled, false)))
      .orderBy(asc(memberships.createdAt))
      .limit(MAX_NOTIFICATION_RECIPIENTS * 2);
    return rows
      .map((r) => r.email)
      .filter(isDeliverableAddress)
      .slice(0, MAX_NOTIFICATION_RECIPIENTS);
  };
}
