import { drizzle as drizzlePg } from "drizzle-orm/node-postgres";
import { drizzle as drizzlePglite } from "drizzle-orm/pglite";
import { migrate as migratePg } from "drizzle-orm/node-postgres/migrator";
import { migrate as migratePglite } from "drizzle-orm/pglite/migrator";
import type { PgDatabase, PgQueryResultHKT } from "drizzle-orm/pg-core";
import { PGlite } from "@electric-sql/pglite";
import pg from "pg";
import { fileURLToPath } from "node:url";
import path from "node:path";
import { mkdirSync } from "node:fs";
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
  /** Receives errors from idle pooled connections (e.g. the server restarting). */
  onPoolError?: (err: Error) => void;
}

/**
 * Session-level advisory lock key held while migrations run, so two processes migrating at once
 * (a pre-deploy step and a booting instance, or two instances) apply them one after the other.
 */
export const MIGRATION_LOCK_KEY = 72_411_093_157;

/** The part of a pooled client that `withAdvisoryLock` needs (pg.PoolClient satisfies it). */
export interface LockClient {
  query(sql: string, params?: unknown[]): Promise<unknown>;
  release(): void;
}

/**
 * Runs `work` while holding a PostgreSQL session advisory lock on a dedicated connection. Waits
 * for the lock (another migrator finishing first); always unlocks and releases the connection.
 */
export async function withAdvisoryLock<T>(connect: () => Promise<LockClient>, key: number, work: () => Promise<T>): Promise<T> {
  const client = await connect();
  try {
    await client.query("select pg_advisory_lock($1)", [key]);
    try {
      return await work();
    } finally {
      await client.query("select pg_advisory_unlock($1)", [key]);
    }
  } finally {
    client.release();
  }
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
    const inMemory = target === "memory" || target === "";
    if (!inMemory) mkdirSync(path.dirname(path.resolve(target)), { recursive: true });
    const client = inMemory ? new PGlite() : new PGlite(target);
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
  // Without a listener an idle client's error would crash the process. The pool discards that
  // client and later queries get a fresh one, so report it rather than rethrowing.
  pool.on("error", (err) => options.onPoolError?.(err));
  const db = drizzlePg(pool, { schema }) as unknown as Database;
  return {
    db,
    driver: "postgres",
    migrate: () =>
      withAdvisoryLock(
        () => pool.connect(),
        MIGRATION_LOCK_KEY,
        () => migratePg(db as never, { migrationsFolder }),
      ),
    close: () => pool.end(),
    ping: async () => {
      await pool.query("select 1");
      return true;
    },
  };
}
