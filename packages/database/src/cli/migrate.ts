import { createDatabase } from "../client";
import { databaseSsl, databaseUrl, loadEnv } from "./env";

loadEnv();
const url = databaseUrl();
const handle = await createDatabase({ url, ssl: databaseSsl(), sslCa: process.env.DATABASE_CA_CERT });
try {
  await handle.migrate();
  console.log(`Migrations applied (${handle.driver}).`);
} finally {
  await handle.close();
}
