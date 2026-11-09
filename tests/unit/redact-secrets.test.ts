import { describe, expect, it } from "vitest";
import { Channel3Client, Channel3Error, OpenAIClient, OpenAIError, REDACTED, redactSecrets } from "@qm/integrations";

const KEY = "sk-proj-AbCdEfGhIjKlMnOpQrStUvWxYz0123456789";

describe("redactSecrets", () => {
  it.each([
    [`Incorrect API key provided: ${KEY}. You can find your API key at https://platform.openai.com/account/api-keys.`, KEY],
    ["Incorrect API key provided: sk-abc12***********************wxyz.", "sk-abc12"],
    ["upstream said Authorization: Bearer eyJhbGciOiJIUzI1NiJ9.payload", "eyJhbGciOiJIUzI1NiJ9"],
    ['{"api_key": "c3-live-123456", "detail": "bad"}', "c3-live-123456"],
    ["token=abcdef123456&x=1", "abcdef123456"],
    ["opaque 0123456789abcdef0123456789abcdef0123 trailing", "0123456789abcdef0123456789abcdef0123"],
  ])("removes the secret from %j", (text, secret) => {
    const out = redactSecrets(text);
    expect(out).not.toContain(secret);
    expect(out).toContain(REDACTED);
  });

  it("keeps ordinary reasons readable, on one line and bounded", () => {
    expect(redactSecrets("Rate limit exceeded.\nTry again later.")).toBe("Rate limit exceeded. Try again later.");
    expect(redactSecrets("token budget exhausted")).toBe("token budget exhausted");
    const long = redactSecrets("word ".repeat(100), 40);
    expect(long.length).toBeLessThanOrEqual(40);
    expect(long.endsWith("…")).toBe(true);
  });
});

const respond = (body: unknown, status: number) =>
  new Response(typeof body === "string" ? body : JSON.stringify(body), { status, headers: { "content-type": "application/json" } });

describe("provider error messages", () => {
  it("never embed a credential echoed in an OpenAI error body", async () => {
    const c = new OpenAIClient({
      apiKey: KEY,
      model: "m",
      fetch: async () => respond({ error: { message: `Incorrect API key provided: ${KEY}.` } }, 401),
    });
    const err = (await c.structured({ name: "t", system: "s", user: "u", schema: {} }).catch((e: unknown) => e)) as OpenAIError;
    expect(err).toBeInstanceOf(OpenAIError);
    expect(err.kind).toBe("http");
    expect(err.status).toBe(401);
    expect(err.message).not.toContain(KEY);
    expect(err.message).toContain("HTTP 401");
  });

  it("never embed a credential echoed in a Channel3 error body", async () => {
    const c = new Channel3Client({ apiKey: "c3", fetch: async () => respond(`forbidden for x-api-key: ${KEY}`, 403) });
    const err = (await c.search({ query: "x" }).catch((e: unknown) => e)) as Channel3Error;
    expect(err).toBeInstanceOf(Channel3Error);
    expect(err.status).toBe(403);
    expect(err.message).not.toContain(KEY);
  });

  it("redacts network error text", async () => {
    const c = new Channel3Client({
      apiKey: "c3",
      fetch: async () => {
        throw new Error(`connect ECONNREFUSED (proxy auth ${KEY})`);
      },
    });
    const err = (await c.search({ query: "x" }).catch((e: unknown) => e)) as Channel3Error;
    expect(err.message).toContain("ECONNREFUSED");
    expect(err.message).not.toContain(KEY);
  });
});
