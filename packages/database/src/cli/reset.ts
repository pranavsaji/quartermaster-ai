import { rmSync } from "node:fs";
import path from "node:path";
import { REPO_ROOT, databaseUrl, loadEnv } from "./env";

loadEnv();
const url = databaseUrl();
if (!url.startsWith("pglite://")) {
  console.error("db:reset only removes the local embedded database. Drop PostgreSQL databases with your own tooling.");
  process.exit(1);
}
const dir = url.slice("pglite://".length);
if (!path.resolve(dir).startsWith(path.join(REPO_ROOT, ".data"))) {
  console.error(`Refusing to delete ${dir}: outside the repository .data directory.`);
  process.exit(1);
}
rmSync(dir, { recursive: true, force: true });
console.log(`Removed ${dir}. Run pnpm db:seed to recreate.`);
