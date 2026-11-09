import { Writable } from "node:stream";
import { describe, expect, it } from "vitest";
import { AppError, badGateway, badRequest } from "../../apps/api/src/errors";
import { errorHandler, publicServerErrorDetails } from "../../apps/api/src/http/middleware/errors";
import { createLogger } from "../../apps/api/src/logger";

type Handler = ReturnType<typeof errorHandler>;
type Request = Parameters<Handler>[1];
type Response = Parameters<Handler>[2];

function run(err: unknown) {
  const logged: Record<string, unknown>[] = [];
  const log = createLogger(
    "info",
    new Writable({
      write(chunk, _e, done) {
        logged.push(JSON.parse(String(chunk)) as Record<string, unknown>);
        done();
      },
    }),
  );
  const sent: { status?: number; body?: { error: Record<string, unknown> } } = {};
  const res = {
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
  return { sent, logged };
}

describe("error handler", () => {
  it("never returns upstream error text in 5xx details, but logs it", () => {
    const { sent, logged } = run(
      badGateway("PAYPAL_REFUND_FAILED", "PayPal did not confirm the refund.", {
        message: "connect ECONNREFUSED 10.0.0.3:5432",
        retryable: true,
        cause: { stack: "..." },
      }),
    );
    expect(sent.status).toBe(502);
    expect(sent.body!.error).toEqual({
      code: "PAYPAL_REFUND_FAILED",
      message: "PayPal did not confirm the refund.",
      details: { retryable: true },
      correlation_id: "corr-1",
    });
    expect(JSON.stringify(sent.body)).not.toContain("ECONNREFUSED");
    expect(JSON.stringify(logged)).toContain("ECONNREFUSED");
  });

  it("returns 4xx details verbatim", () => {
    const { sent } = run(badRequest("Request validation failed", [{ path: "email", message: "Invalid email" }]));
    expect(sent.body!.error.details).toEqual([{ path: "email", message: "Invalid email" }]);
  });

  it("hides unknown errors behind a generic 500", () => {
    const { sent } = run(Object.assign(new Error('relation "users" does not exist'), { code: "42P01" }));
    expect(sent.status).toBe(500);
    expect(sent.body!.error).toMatchObject({ code: "INTERNAL", message: "An unexpected error occurred." });
    expect(JSON.stringify(sent.body)).not.toContain("does not exist");
  });

  it("reduces server error details to scalar non-string fields", () => {
    expect(publicServerErrorDetails({ retryable: false, attempts: 2, gone: null, text: "x", nested: {} })).toEqual({
      retryable: false,
      attempts: 2,
      gone: null,
    });
    expect(publicServerErrorDetails({ message: "x" })).toBeUndefined();
    expect(publicServerErrorDetails("raw text")).toBeUndefined();
    expect(publicServerErrorDetails(["a"])).toBeUndefined();
    expect(new AppError(503, "X", "m").details).toBeUndefined();
  });
});
