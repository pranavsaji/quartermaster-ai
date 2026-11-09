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

/** Same rule as the API: TLS by default in production, opt out only explicitly. */
export function databaseSsl(): boolean {
  const mode = process.env.DATABASE_SSL ?? (process.env.NODE_ENV === "production" ? "require" : "disable");
  return mode === "require";
}

/**
 * `--reset` deletes the demo organisation, including its audit log. Refused in production unless
 * explicitly allowed, so a stray command cannot wipe a live deployment's history.
 */
export function assertResetAllowed(reset: boolean): void {
  if (reset && process.env.NODE_ENV === "production" && process.env.ALLOW_DEMO_RESET !== "true") {
    console.error("Refusing --reset in production. Set ALLOW_DEMO_RESET=true if you really mean to delete the demo organisation.");
    process.exit(1);
  }
}
