import { drizzle as drizzlePg } from "drizzle-orm/node-postgres";
import { drizzle as drizzlePglite } from "drizzle-orm/pglite";
import { migrate as migratePg } from "drizzle-orm/node-postgres/migrator";
import { migrate as migratePglite } from "drizzle-orm/pglite/migrator";
import type { PgDatabase, PgQueryResultHKT } from "drizzle-orm/pg-core";
import { PGlite } from "@electric-sql/pglite";
import pg from "pg";
import { fileURLToPath } from "node:url";
import path from "node:path";
import * as schema from "./schema";

export type Schema = typeof schema;
export type Database = PgDatabase<PgQueryResultHKT, Schema>;
/** Either the root database or a transaction handle; both expose the same query API. */
export type Tx = Parameters<Parameters<Database["transaction"]>[0]>[0];
export type DbOrTx = Database | Tx;

export interface DatabaseHandle {
  db: Database;
  driver: "postgres" | "pglite";
  migrate: () => Promise<void>;
  close: () => Promise<void>;
  ping: () => Promise<boolean>;
}

export interface DatabaseOptions {
  /** postgres://… for PostgreSQL, `pglite://<dir>` for embedded file storage, `pglite://memory` for in-memory. */
  url: string;
  maxConnections?: number;
  /** Enable TLS with certificate verification. */
  ssl?: boolean;
  /** PEM CA bundle for providers that use a private CA. Verification is never disabled. */
  sslCa?: string;
  migrationsFolder?: string;
}

export function defaultMigrationsFolder(): string {
  if (process.env.QM_MIGRATIONS_DIR) return process.env.QM_MIGRATIONS_DIR;
  const here = path.dirname(fileURLToPath(import.meta.url));
  return path.resolve(here, "../migrations");
}

export async function createDatabase(options: DatabaseOptions): Promise<DatabaseHandle> {
  const migrationsFolder = options.migrationsFolder ?? defaultMigrationsFolder();

  if (options.url.startsWith("pglite://")) {
    const target = options.url.slice("pglite://".length);
    const client = target === "memory" || target === "" ? new PGlite() : new PGlite(target);
    await client.waitReady;
    const db = drizzlePglite(client, { schema }) as unknown as Database;
    return {
      db,
      driver: "pglite",
      migrate: () => migratePglite(db as never, { migrationsFolder }),
      close: () => client.close(),
      ping: async () => {
        await client.query("select 1");
        return true;
      },
    };
  }

  const pool = new pg.Pool({
    connectionString: options.url,
    max: options.maxConnections ?? 10,
    ssl: options.ssl ? { rejectUnauthorized: true, ...(options.sslCa ? { ca: options.sslCa } : {}) } : undefined,
    idleTimeoutMillis: 30_000,
    connectionTimeoutMillis: 10_000,
    statement_timeout: 30_000,
    application_name: "quartermaster",
  });
  pool.on("error", () => {
    /* idle client errors are surfaced on next query; avoid crashing the process */
  });
  const db = drizzlePg(pool, { schema }) as unknown as Database;
  return {
    db,
    driver: "postgres",
    migrate: () => migratePg(db as never, { migrationsFolder }),
    close: () => pool.end(),
    ping: async () => {
      await pool.query("select 1");
      return true;
    },
  };
}
