import { randomUUID } from "node:crypto";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { eq } from "drizzle-orm";
import { budgetAccounts, createDatabase, organizations, type DatabaseHandle } from "@qm/database";
import { currentAccount, reserve } from "../../apps/api/src/services/budget";

/**
 * Runs only against a real PostgreSQL server (TEST_DATABASE_URL), where transactions execute on
 * separate connections in parallel. Embedded PGlite serialises everything, so it cannot prove
 * that row-level locking prevents overspend; this test does.
 */
const url = process.env.TEST_DATABASE_URL;

describe.skipIf(!url)("budget reservations under real parallelism (PostgreSQL)", () => {
  let handle: DatabaseHandle;
  let orgId: string;

  beforeAll(async () => {
    handle = await createDatabase({ url: url!, maxConnections: 12 });
    await handle.migrate();
    const [org] = await handle.db
      .insert(organizations)
      .values({ name: `concurrency-${randomUUID()}`, timezone: "UTC", currency: "USD" })
      .returning();
    orgId = org!.id;
  });

  afterAll(async () => {
    if (orgId) await handle.db.delete(organizations).where(eq(organizations.id, orgId));
    await handle?.close();
  });

  it("lets exactly as many reservations succeed as the budget allows", async () => {
    const now = new Date();
    const attempts = 12;
    const results = await Promise.allSettled(
      Array.from({ length: attempts }, () =>
        handle.db.transaction(async (tx) => {
          const account = await currentAccount(tx, {
            organizationId: orgId,
            timeZone: "UTC",
            currency: "USD",
            weeklyLimitMinor: 50_000,
            now,
            lock: true,
          });
          // Widen the race window while holding the lock.
          await new Promise((r) => setTimeout(r, 20));
          return reserve(tx, account, {
            organizationId: orgId,
            intentId: randomUUID(),
            purchaseOrderId: randomUUID(),
            amountMinor: 10_000,
            now: new Date(),
          });
        }),
      ),
    );
    const ok = results.filter((r) => r.status === "fulfilled").length;
    expect(ok).toBe(5);
    const [account] = await handle.db.select().from(budgetAccounts).where(eq(budgetAccounts.organizationId, orgId));
    expect(account!.reservedMinor).toBe(50_000);
  });

  it("fails closed even if a caller forgets to lock", async () => {
    const [account] = await handle.db.select().from(budgetAccounts).where(eq(budgetAccounts.organizationId, orgId));
    await expect(
      handle.db.transaction((tx) =>
        reserve(tx, account!, {
          organizationId: orgId,
          intentId: randomUUID(),
          purchaseOrderId: randomUUID(),
          amountMinor: 1,
          now: new Date(),
        }),
      ),
    ).rejects.toThrow(/budget/i);
  });
});
