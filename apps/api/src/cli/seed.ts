import { DEMO_CREDENTIALS, seedDemo } from "@qm/database";
import { bootstrap, loadDotEnv } from "../bootstrap";

/** Seeds the labelled demo organization. Requires DEMO_USER_PASSWORD (≥ 12 characters). */
loadDotEnv();
const password = process.env.DEMO_USER_PASSWORD;
if (!password || password.length < 12) {
  console.error("Set DEMO_USER_PASSWORD (at least 12 characters) before seeding.");
  process.exit(1);
}
if (process.argv.includes("--reset") && process.env.NODE_ENV === "production" && process.env.ALLOW_DEMO_RESET !== "true") {
  // --reset deletes the demo organisation including its audit log.
  console.error("Refusing --reset in production. Set ALLOW_DEMO_RESET=true if you really mean to delete the demo organisation.");
  process.exit(1);
}
const ctx = await bootstrap({ migrate: true });
try {
  const result = await seedDemo(ctx.db, { password, reset: process.argv.includes("--reset") });
  ctx.log.info({ created: result.created, accounts: Object.values(DEMO_CREDENTIALS).map((c) => c.email) }, "demo seed");
} finally {
  await ctx.database.close();
}
