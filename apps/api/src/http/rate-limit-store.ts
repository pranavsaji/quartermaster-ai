import { eq, sql } from "drizzle-orm";
import type { Options, Store, ClientRateLimitInfo } from "express-rate-limit";
import { rateLimitHits, type Database } from "@qm/database";

/**
 * express-rate-limit store backed by PostgreSQL, so limits hold across API instances and
 * restarts. Windows are fixed and timed by the database clock, which every instance shares.
 */
export class DatabaseRateLimitStore implements Store {
  windowMs = 60_000;
  readonly localKeys = false;

  constructor(
    private readonly db: Database,
    readonly prefix: string,
  ) {}

  init(options: Options): void {
    this.windowMs = options.windowMs;
  }

  private key(key: string): string {
    return `${this.prefix}:${key}`.slice(0, 512);
  }

  async increment(key: string): Promise<ClientRateLimitInfo> {
    const expired = sql`${rateLimitHits.resetAt} <= now()`;
    const [row] = await this.db
      .insert(rateLimitHits)
      .values({ key: this.key(key), hits: 1, resetAt: sql`now() + ${this.windowMs} * interval '1 millisecond'` })
      .onConflictDoUpdate({
        target: rateLimitHits.key,
        set: {
          hits: sql`case when ${expired} then 1 else ${rateLimitHits.hits} + 1 end`,
          resetAt: sql`case when ${expired} then excluded.reset_at else ${rateLimitHits.resetAt} end`,
        },
      })
      .returning({ hits: rateLimitHits.hits, resetAt: rateLimitHits.resetAt });
    return { totalHits: row?.hits ?? 1, resetTime: row?.resetAt };
  }

  async decrement(key: string): Promise<void> {
    await this.db
      .update(rateLimitHits)
      .set({ hits: sql`greatest(${rateLimitHits.hits} - 1, 0)` })
      .where(eq(rateLimitHits.key, this.key(key)));
  }

  async resetKey(key: string): Promise<void> {
    await this.db.delete(rateLimitHits).where(eq(rateLimitHits.key, this.key(key)));
  }
}

/**
 * Store options for a limiter. With the database store, a store error lets the request through
 * (and is logged by express-rate-limit) rather than turning a counter outage into an API outage.
 */
export function limiterStore(
  ctx: { config: { rateLimits: { store: "memory" | "database" } }; db: Database },
  name: string,
): Partial<Options> {
  return ctx.config.rateLimits.store === "database" ? { store: new DatabaseRateLimitStore(ctx.db, name), passOnStoreError: true } : {};
}
