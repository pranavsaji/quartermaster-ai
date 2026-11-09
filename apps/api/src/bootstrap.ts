import { existsSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createDatabase } from "@qm/database";
import { generateSigningKey, loadSigningKey, type SigningKey } from "@qm/trustrail";
import { loadConfig, type AppConfig } from "./config";
import { buildContext, type AppContext, type ContextOverrides } from "./context";
import { createLogger } from "./logger";
import { registerSigningKey } from "./services/certificates";

/** Repository root (two levels up from apps/api/{src,dist}). */
export const REPO_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../..");

export function loadDotEnv(): void {
  for (const file of [path.join(REPO_ROOT, ".env"), path.join(process.cwd(), ".env")]) {
    if (existsSync(file)) {
      process.loadEnvFile(file);
      return;
    }
  }
}

function resolveSigningKey(config: AppConfig, log: ReturnType<typeof createLogger>): SigningKey {
  // loadConfig already refuses production without a key; this only runs outside production.
  if (config.signing.privateKey) return loadSigningKey(config.signing.privateKey, config.signing.keyId);
  // Development convenience only: an ephemeral key means certificates do not survive restarts.
  log.warn("TRUSTRAIL_SIGNING_KEY not set; using an ephemeral development signing key. Run `pnpm keys:generate`.");
  return generateSigningKey(`dev_ephemeral_${Date.now().toString(36)}`);
}

export async function bootstrap(overrides: ContextOverrides & { env?: NodeJS.ProcessEnv; migrate?: boolean } = {}): Promise<AppContext> {
  const env = overrides.env ?? process.env;
  if (!env.DATABASE_URL && (env.NODE_ENV ?? "development") !== "production") {
    env.DATABASE_URL = `pglite://${path.join(REPO_ROOT, ".data", "pglite")}`;
  }
  // Bundled builds cannot resolve the migrations folder relative to the package source.
  process.env.QM_MIGRATIONS_DIR ??= path.join(REPO_ROOT, "packages", "database", "migrations");
  const config = loadConfig(env);
  const log = createLogger(config.logLevel);
  const database = await createDatabase({
    url: config.database.url,
    ssl: config.database.ssl,
    sslCa: config.database.ca,
    maxConnections: config.database.poolMax,
    onPoolError: (err) => log.error({ err }, "idle database connection failed"),
  });
  try {
    if (overrides.migrate !== false) await database.migrate();
    const signingKey = resolveSigningKey(config, log);
    await registerSigningKey(database.db, signingKey);
    return buildContext(config, log, database, signingKey, overrides);
  } catch (err) {
    // Do not leak the pool (or keep an embedded database open) when startup fails.
    await database.close().catch(() => undefined);
    throw err;
  }
}
