import { createDatabase } from "../client";
import { DEMO_CREDENTIALS, seedDemo } from "../seed";
import { databaseSsl, databaseUrl, loadEnv } from "./env";

loadEnv();
const password = process.env.DEMO_USER_PASSWORD;
if (!password || password.length < 12) {
  console.error("Set DEMO_USER_PASSWORD (at least 12 characters) before seeding.");
  process.exit(1);
}
const handle = await createDatabase({ url: databaseUrl(), ssl: databaseSsl(), sslCa: process.env.DATABASE_CA_CERT });
try {
  await handle.migrate();
  const result = await seedDemo(handle.db, { password, reset: process.argv.includes("--reset") });
  console.log(result.created ? "Demo organization seeded." : "Demo organization already exists (use --reset to recreate).");
  console.log(`Sign in as ${Object.values(DEMO_CREDENTIALS).map((c) => `${c.email} (${c.role})`).join(", ")}.`);
} finally {
  await handle.close();
}
