import type { DbOrTx } from "@qm/database";
import type { AppContext } from "../context";

/** The authenticated user a service call acts for. */
export interface Actor {
  id: string;
  organizationId: string;
  ip?: string;
  userAgent?: string;
}

/**
 * An error raised inside a transaction whose evidence (findings, audit, status) must survive the
 * rollback. The follow-up runs in its own transaction after the original one has rolled back.
 */
export class DeferredFailure extends Error {
  constructor(
    readonly error: Error,
    readonly after: (db: DbOrTx) => Promise<void>,
  ) {
    super(error.message);
    this.name = "DeferredFailure";
  }
}

export async function withDeferredFailures<T>(ctx: AppContext, fn: () => Promise<T>): Promise<T> {
  try {
    return await fn();
  } catch (err) {
    if (err instanceof DeferredFailure) {
      try {
        await ctx.db.transaction((tx) => err.after(tx));
      } catch (followUp) {
        ctx.log.error({ err: followUp }, "failed to persist evidence for a refused operation");
      }
      throw err.error;
    }
    throw err;
  }
}

/** SQLSTATEs that mean "the transaction lost a race; running it again is safe". */
const RETRYABLE_SQLSTATES = new Set(["40001", "40P01"]);

function sqlState(err: unknown): string | undefined {
  for (let e: unknown = err, depth = 0; e && typeof e === "object" && depth < 4; e = (e as { cause?: unknown }).cause, depth++) {
    const code = (e as { code?: unknown }).code;
    if (typeof code === "string") return code;
  }
  return undefined;
}

/**
 * Runs a short, self-contained transaction and retries it when PostgreSQL aborts it for a
 * serialization failure or deadlock. `fn` must have no side effects outside the transaction.
 */
export async function retryOnConflict<T>(ctx: AppContext, label: string, fn: () => Promise<T>, attempts = 3): Promise<T> {
  for (let i = 1; ; i++) {
    try {
      return await fn();
    } catch (err) {
      const state = sqlState(err);
      if (!state || !RETRYABLE_SQLSTATES.has(state) || i >= attempts) throw err;
      ctx.log.warn({ sqlstate: state, attempt: i, op: label }, "transaction conflict; retrying");
      await new Promise((r) => setTimeout(r, 10 * 2 ** i + Math.floor(Math.random() * 10)));
    }
  }
}

/**
 * Side effects (notifications) that must only happen once the surrounding transaction has
 * committed. Collect inside the transaction, flush after it returns.
 */
export class AfterCommit {
  private readonly tasks: (() => Promise<unknown> | void)[] = [];
  add(task: () => Promise<unknown> | void): void {
    this.tasks.push(task);
  }
  flush(ctx: AppContext): void {
    for (const task of this.tasks.splice(0)) {
      Promise.resolve()
        .then(task)
        .catch((err: unknown) => ctx.log.warn({ err }, "post-commit task failed"));
    }
  }
}
