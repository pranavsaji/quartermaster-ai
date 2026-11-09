import { describe, expect, it, vi } from "vitest";
import { AfterCommit, DeferredFailure, retryOnConflict, withDeferredFailures } from "../../apps/api/src/services/common";
import type { AppContext } from "../../apps/api/src/context";

function fakeCtx() {
  const log = { warn: vi.fn(), error: vi.fn(), info: vi.fn() };
  const transaction = vi.fn(async (fn: (tx: unknown) => Promise<unknown>) => fn({}));
  return { ctx: { log, db: { transaction } } as unknown as AppContext, log, transaction };
}

const pgError = (code: string, nested = false) => {
  const e = Object.assign(new Error(`sqlstate ${code}`), { code });
  return nested ? Object.assign(new Error("Failed query"), { cause: e }) : e;
};

describe("retryOnConflict", () => {
  it("retries deadlocks and serialization failures, including ones wrapped by the driver", async () => {
    const { ctx, log } = fakeCtx();
    let calls = 0;
    const result = await retryOnConflict(ctx, "op", async () => {
      calls++;
      if (calls === 1) throw pgError("40P01", true);
      if (calls === 2) throw pgError("40001");
      return "ok";
    });
    expect(result).toBe("ok");
    expect(calls).toBe(3);
    expect(log.warn).toHaveBeenCalledTimes(2);
  });

  it("does not retry other errors", async () => {
    const { ctx } = fakeCtx();
    let calls = 0;
    await expect(
      retryOnConflict(ctx, "op", async () => {
        calls++;
        throw pgError("23505");
      }),
    ).rejects.toThrow(/23505/);
    expect(calls).toBe(1);
  });

  it("gives up after the attempt limit", async () => {
    const { ctx } = fakeCtx();
    let calls = 0;
    await expect(
      retryOnConflict(
        ctx,
        "op",
        async () => {
          calls++;
          throw pgError("40P01");
        },
        2,
      ),
    ).rejects.toThrow(/40P01/);
    expect(calls).toBe(2);
  });
});

describe("withDeferredFailures", () => {
  it("persists evidence in a new transaction and rethrows the original error", async () => {
    const { ctx, transaction } = fakeCtx();
    const after = vi.fn(async () => undefined);
    const original = new Error("refused");
    await expect(withDeferredFailures(ctx, async () => Promise.reject(new DeferredFailure(original, after)))).rejects.toBe(original);
    expect(transaction).toHaveBeenCalledTimes(1);
    expect(after).toHaveBeenCalledTimes(1);
  });

  it("still rethrows the original error when persisting evidence fails, and logs it", async () => {
    const { ctx, log } = fakeCtx();
    const original = new Error("refused");
    const failing = new DeferredFailure(original, async () => Promise.reject(new Error("db down")));
    await expect(withDeferredFailures(ctx, async () => Promise.reject(failing))).rejects.toBe(original);
    expect(log.error).toHaveBeenCalled();
  });

  it("passes other errors and results through untouched", async () => {
    const { ctx } = fakeCtx();
    await expect(withDeferredFailures(ctx, async () => 7)).resolves.toBe(7);
    const plain = new Error("plain");
    await expect(withDeferredFailures(ctx, async () => Promise.reject(plain))).rejects.toBe(plain);
  });
});

describe("AfterCommit", () => {
  it("runs queued tasks once on flush and logs failures without throwing", async () => {
    const { ctx, log } = fakeCtx();
    const after = new AfterCommit();
    const ran: string[] = [];
    after.add(() => void ran.push("a"));
    after.add(async () => Promise.reject(new Error("webhook down")));
    after.flush(ctx);
    after.flush(ctx);
    await new Promise((r) => setTimeout(r, 0));
    expect(ran).toEqual(["a"]);
    expect(log.warn).toHaveBeenCalledTimes(1);
  });
});
