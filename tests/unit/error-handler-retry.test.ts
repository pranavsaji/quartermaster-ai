import { Writable } from "node:stream";
import { describe, expect, it } from "vitest";
import { unavailable } from "../../apps/api/src/errors";
import { errorHandler, RETRY_AFTER_SECONDS } from "../../apps/api/src/http/middleware/errors";
import { createLogger } from "../../apps/api/src/logger";
import { AgentBudgetExceeded } from "../../apps/api/src/services/agent/runtime";

type Handler = ReturnType<typeof errorHandler>;
type Request = Parameters<Handler>[1];
type Response = Parameters<Handler>[2];

function run(err: unknown) {
  const log = createLogger("silent", new Writable({ write: (_c, _e, done) => done() }));
  const sent: { status?: number; headers: Record<string, string>; body?: { error: Record<string, unknown> } } = { headers: {} };
  const res = {
    set(name: string, value: string) {
      sent.headers[name.toLowerCase()] = value;
      return this;
    },
    status(s: number) {
      sent.status = s;
      return this;
    },
    json(b: { error: Record<string, unknown> }) {
      sent.body = b;
      return this;
    },
  } as unknown as Response;
  errorHandler(log)(err, { correlationId: "corr-1", path: "/x" } as unknown as Request, res, () => undefined);
  return sent;
}

describe("retryable 503s", () => {
  it("send the agent deadline as a typed 503 with Retry-After and fixed text", () => {
    const sent = run(new AgentBudgetExceeded("deadline"));
    expect(sent.status).toBe(503);
    expect(sent.headers["retry-after"]).toBe(String(RETRY_AFTER_SECONDS));
    expect(sent.body!.error).toMatchObject({
      code: "AGENT_DEADLINE_EXCEEDED",
      message: "The agent reached its deadline before finishing. Try again.",
      details: { retryable: true },
    });
  });

  it("omit Retry-After for a 503 that is not marked retryable", () => {
    const sent = run(unavailable("PAYPAL_NOT_CONFIGURED", "PayPal sandbox is not configured on this server."));
    expect(sent.status).toBe(503);
    expect(sent.headers["retry-after"]).toBeUndefined();
  });
});
