import { describe, expect, it } from "vitest";
import { ApiRequestError } from "@/lib/http";
import { stableStringify, withIdempotency } from "@/lib/idempotency";

const apiError = (status: number, code = "X") => new ApiRequestError({ status, code, message: "nope" });

/** Runs the action twice: the first attempt fails with `error`, the second succeeds. Returns both keys. */
async function keysAcrossRetry(action: string, error: unknown, body: unknown = { a: 1 }): Promise<[string, string]> {
  const keys: string[] = [];
  await expect(
    withIdempotency(action, body, async (key) => {
      keys.push(key);
      throw error;
    }),
  ).rejects.toBe(error);
  await withIdempotency(action, body, async (key) => {
    keys.push(key);
    return "ok";
  });
  return [keys[0]!, keys[1]!];
}

describe("withIdempotency", () => {
  it.each([
    ["a network failure", apiError(0, "NETWORK_ERROR")],
    ["a 502", apiError(502, "UPSTREAM_ERROR")],
    ["a 500", apiError(500, "INTERNAL")],
    ["a 409 request-in-progress", apiError(409, "IDEMPOTENCY_IN_PROGRESS")],
    ["a non-API error", new TypeError("Failed to fetch")],
  ])("reuses the key after %s", async (_label, error) => {
    const [first, second] = await keysAcrossRetry(`POST /retry-${String(_label)}`, error);
    expect(second).toBe(first);
  });

  it.each([
    ["a 422 validation failure", apiError(422, "VALIDATION_ERROR")],
    ["a 403", apiError(403, "FORBIDDEN")],
    ["a documented definitive 502", apiError(502, "PAYPAL_ORDER_MISMATCH")],
  ])("issues a new key after %s", async (_label, error) => {
    const [first, second] = await keysAcrossRetry(`POST /new-${String(_label)}`, error);
    expect(second).not.toBe(first);
  });

  it("retires the key after success", async () => {
    const keys: string[] = [];
    for (let i = 0; i < 2; i += 1) await withIdempotency("POST /ok", {}, async (key) => keys.push(key));
    expect(keys[1]).not.toBe(keys[0]);
  });

  it("scopes keys by action and by body, ignoring property order", async () => {
    const keyFor = async (action: string, body: unknown) => {
      let seen = "";
      await withIdempotency(action, body, async (key) => {
        seen = key;
        throw apiError(503);
      }).catch(() => undefined);
      return seen;
    };
    const original = await keyFor("POST /scoped", { x: 1, y: 2 });
    expect(await keyFor("POST /scoped", { y: 2, x: 1 })).toBe(original);
    expect(await keyFor("POST /scoped", { x: 2, y: 2 })).not.toBe(original);
    expect(await keyFor("POST /other", { x: 1, y: 2 })).not.toBe(original);
  });

  it("serialises bodies deterministically", () => {
    expect(stableStringify({ b: 1, a: [{ d: 2, c: undefined, e: null }] })).toBe('{"a":[{"d":2,"e":null}],"b":1}');
  });
});
