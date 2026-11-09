import { DEMO_CREDENTIALS, seedDemo } from "@qm/database";
import { bootstrap, loadDotEnv } from "../bootstrap";

/** Seeds the labelled demo organization. Requires DEMO_USER_PASSWORD (≥ 12 characters). */
loadDotEnv();
const password = process.env.DEMO_USER_PASSWORD;
if (!password || password.length < 12) {
  console.error("Set DEMO_USER_PASSWORD (at least 12 characters) before seeding.");
  process.exit(1);
}
const ctx = await bootstrap({ migrate: true });
try {
  const result = await seedDemo(ctx.db, { password, reset: process.argv.includes("--reset") });
  ctx.log.info({ created: result.created, accounts: Object.values(DEMO_CREDENTIALS).map((c) => c.email) }, "demo seed");
} finally {
  await ctx.database.close();
}
