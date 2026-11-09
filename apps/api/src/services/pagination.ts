import { desc, sql, type SQL } from "drizzle-orm";
import type { AnyPgColumn } from "drizzle-orm/pg-core";

/**
 * Keyset pagination over (created_at, id), newest first. Cursors are opaque to clients.
 *
 * Timestamps are compared at millisecond precision on both sides (JavaScript dates carry
 * milliseconds while PostgreSQL stores microseconds), and the id breaks ties, so rows sharing a
 * timestamp are never skipped or repeated at a page boundary.
 */
export interface Cursor {
  at: Date;
  id: string;
}

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function encodeCursor(at: Date, id: string): string {
  return Buffer.from(`${at.toISOString()}|${id}`, "utf8").toString("base64url");
}

/** Returns null for a missing or malformed cursor (the first page). */
export function decodeCursor(cursor: string | undefined): Cursor | null {
  if (!cursor || cursor.length > 200) return null;
  const [iso, id] = Buffer.from(cursor, "base64url").toString("utf8").split("|");
  if (!iso || !id || !UUID.test(id)) return null;
  const at = new Date(iso);
  return Number.isNaN(at.getTime()) ? null : { at, id };
}

const ms = (column: AnyPgColumn) => sql`date_trunc('milliseconds', ${column})`;

/** WHERE fragment selecting rows strictly after the cursor in newest-first order. */
export function afterCursor(createdAt: AnyPgColumn, id: AnyPgColumn, cursor: Cursor | null): SQL | undefined {
  return cursor ? sql`(${ms(createdAt)}, ${id}) < (${cursor.at.toISOString()}::timestamptz, ${cursor.id}::uuid)` : undefined;
}

export function newestFirst(createdAt: AnyPgColumn, id: AnyPgColumn): SQL[] {
  return [desc(ms(createdAt)), desc(id)];
}

/** Splits a `limit + 1` result into a page and the cursor for the next one. */
export function toPage<T extends { id: string; createdAt: Date }>(rows: T[], limit: number): { page: T[]; nextCursor: string | null } {
  const page = rows.slice(0, limit);
  const last = page[page.length - 1];
  return { page, nextCursor: rows.length > limit && last ? encodeCursor(last.createdAt, last.id) : null };
}
