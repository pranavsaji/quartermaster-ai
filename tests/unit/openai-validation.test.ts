import { describe, expect, it } from "vitest";
import { z } from "zod";
import { OpenAIClient, OpenAIError } from "@qm/integrations";

const reply = (content: unknown, extra: Record<string, unknown> = {}) =>
  new Response(
    JSON.stringify({
      choices: [{ message: { content: typeof content === "string" ? content : JSON.stringify(content) }, finish_reason: "stop" }],
      usage: { prompt_tokens: 3, completion_tokens: 2 },
      ...extra,
    }),
    {
      status: 200,
      headers: { "content-type": "application/json" },
    },
  );

function client(fetchImpl: typeof fetch) {
  const logs: { event: string; data: Record<string, unknown> }[] = [];
  return { c: new OpenAIClient({ apiKey: "k", model: "m", fetch: fetchImpl, log: (event, data) => logs.push({ event, data }) }), logs };
}

const Output = z.object({ summary: z.string(), rationale: z.array(z.string()) });
const params = { name: "explain", system: "s", user: "secret prompt text", schema: {} };

describe("OpenAI response validation", () => {
  it("validates model output against the caller's schema", async () => {
    const { c } = client(async () => reply({ summary: "ok", rationale: ["a"] }));
    const r = await c.structured({ ...params, output: Output });
    expect(r.data).toEqual({ summary: "ok", rationale: ["a"] });
  });

  it("rejects output that does not match the schema, and logs without prompt content", async () => {
    const { c, logs } = client(async () => reply({ summary: 42 }));
    const err = (await c.structured({ ...params, output: Output }).catch((e: unknown) => e)) as OpenAIError;
    expect(err).toBeInstanceOf(OpenAIError);
    expect(err.kind).toBe("invalid_output");
    expect(logs).toEqual([{ event: "openai.request_failed", data: { name: "explain", kind: "invalid_output", status: 200 } }]);
    expect(JSON.stringify(logs)).not.toContain("secret prompt");
  });

  it("rejects a malformed response envelope", async () => {
    const { c } = client(async () => new Response(JSON.stringify({ choices: "nope", usage: { prompt_tokens: -1 } }), { status: 200 }));
    await expect(c.structured(params)).rejects.toMatchObject({ kind: "invalid_response" });
  });

  it("aborts an in-flight request when the caller's signal fires", async () => {
    const hang: typeof fetch = (_u, init) =>
      new Promise((_r, reject) => init?.signal?.addEventListener("abort", () => reject(new DOMException("aborted", "AbortError"))));
    const { c, logs } = client(hang);
    const controller = new AbortController();
    const pending = c.structured({ ...params, signal: controller.signal });
    controller.abort();
    await expect(pending).rejects.toMatchObject({ kind: "aborted" });
    expect(logs[0]?.data).toMatchObject({ kind: "aborted" });
  });

  it("does not call the API when the signal is already aborted", async () => {
    let calls = 0;
    const { c } = client(async () => {
      calls++;
      return reply({});
    });
    await expect(c.structured({ ...params, signal: AbortSignal.abort() })).rejects.toMatchObject({ kind: "aborted" });
    expect(calls).toBe(0);
  });

  it("reports fallbacks through the configured logger", () => {
    const { c, logs } = client(async () => reply({}));
    c.reportFallback("procurement_intent", "Model output failed validation.");
    expect(logs).toEqual([{ event: "openai.fallback", data: { name: "procurement_intent", reason: "Model output failed validation." } }]);
  });
});
