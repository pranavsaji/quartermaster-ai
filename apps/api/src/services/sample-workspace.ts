import { findSampleWorkspace, seedDemo } from "@qm/database";
import type { AppContext } from "../context";

/**
 * Whether the sample workspace, last (re)created at `lastReset`, is due for its daily reset at
 * `hourUtc`: the most recent scheduled instant at or before `now` came after the last reset. A
 * sweeper that was down at the scheduled hour catches up on its next run.
 */
export function sampleResetDue(now: Date, hourUtc: number, lastReset: Date): boolean {
  const scheduled = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(), hourUtc));
  if (scheduled.getTime() > now.getTime()) scheduled.setUTCDate(scheduled.getUTCDate() - 1);
  return lastReset.getTime() < scheduled.getTime();
}

/**
 * The nightly reset of the shared sample workspace (SAMPLE_RESET_HOUR_UTC), run by the sweeper.
 * It touches only the organisation the seed flagged `is_sample` (never one found by name, and it
 * never creates one), recreates it from the seed in one transaction, and keeps the published
 * accounts' passwords. Returns the number of failures (0 or 1), already reported to the tracker.
 */
export async function resetSampleWorkspaceIfDue(ctx: AppContext, now: Date): Promise<number> {
  const hour = ctx.config.security.sampleResetHourUtc;
  if (hour === null) return 0;
  try {
    const org = await findSampleWorkspace(ctx.db);
    if (!org || !sampleResetDue(now, hour, org.createdAt)) return 0;
    const result = await seedDemo(ctx.db, { reset: true, now });
    ctx.log.info({ organization_id: result.organizationId }, "shared sample workspace reset");
    return 0;
  } catch (err) {
    await ctx.errors.capture({
      source: "job",
      level: "error",
      code: "SAMPLE_RESET_FAILED",
      message: "The sample workspace reset failed",
      err,
    });
    return 1;
  }
}
