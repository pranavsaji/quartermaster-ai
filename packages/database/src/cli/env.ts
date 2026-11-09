import { existsSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

/** Repository root, resolved from this file so CLIs work from any working directory. */
export const REPO_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../../..");

export function loadEnv(): void {
  const file = path.join(REPO_ROOT, ".env");
  if (existsSync(file)) process.loadEnvFile(file);
}

export function databaseUrl(): string {
  const url = process.env.DATABASE_URL;
  if (url) return url;
  return `pglite://${path.join(REPO_ROOT, ".data", "pglite")}`;
}

export function databaseSsl(): boolean {
  return process.env.DATABASE_SSL === "require";
}
