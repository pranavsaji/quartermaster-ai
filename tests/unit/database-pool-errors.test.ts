import { createRequire } from "node:module";
import path from "node:path";
import { afterEach, describe, expect, it, vi } from "vitest";
import { createDatabase } from "@qm/database";

// The same `pg` module instance packages/database loads.
const pg = createRequire(path.resolve("packages/database/package.json"))("pg") as {
  Pool: { prototype: { on: (event: string | symbol, fn: (...a: never[]) => void) => unknown } };
};

afterEach(() => vi.restoreAllMocks());

describe("PostgreSQL pool errors", () => {
  it("reports idle-connection errors instead of swallowing them", async () => {
    const listeners: ((err: Error) => void)[] = [];
    const on = vi.spyOn(pg.Pool.prototype, "on").mockImplementation(function (
      this: unknown,
      event: string | symbol,
      fn: (...a: never[]) => void,
    ) {
      if (event === "error") listeners.push(fn as (err: Error) => void);
      return this;
    });
    const seen: Error[] = [];
    const handle = await createDatabase({ url: "postgres://127.0.0.1:1/none", onPoolError: (err) => seen.push(err) });
    expect(on).toHaveBeenCalledWith("error", expect.any(Function));
    listeners[0]!(new Error("terminating connection due to administrator command"));
    expect(seen.map((e) => e.message)).toEqual(["terminating connection due to administrator command"]);
    await handle.close();
  });
});
