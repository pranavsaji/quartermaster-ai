import { bootstrap, loadDotEnv } from "../bootstrap";
import { sweep } from "../jobs/sweeper";

/** One-shot sweeper run for cron schedulers (Render Cron Job). */
loadDotEnv();
const ctx = await bootstrap({ migrate: false });
try {
  const report = await sweep(ctx);
  ctx.log.info({ sweep: report }, "sweep complete");
} finally {
  await ctx.database.close();
}
