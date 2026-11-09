import { Writable } from "node:stream";
import { describe, expect, it } from "vitest";
import { createLogger } from "../../apps/api/src/logger";
import { currentScope } from "../../apps/api/src/context";
import { correlation } from "../../apps/api/src/http/middleware/security";

type Request = Parameters<typeof correlation>[0];
type Response = Parameters<typeof correlation>[1];

function capture() {
  const lines: Record<string, unknown>[] = [];
  const stream = new Writable({
    write(chunk, _enc, done) {
      for (const line of String(chunk).split("\n").filter(Boolean)) lines.push(JSON.parse(line) as Record<string, unknown>);
      done();
    },
  });
  return { log: createLogger("info", stream), lines };
}

describe("log correlation", () => {
  it("adds the request's correlation, organization and user ids to service log lines", async () => {
    const { log, lines } = capture();
    const req = { get: (h: string) => (h === "x-correlation-id" ? "corr-12345678" : undefined), ip: "127.0.0.1" } as unknown as Request;
    const res = { setHeader: () => undefined } as unknown as Response;
    // The real correlation middleware opens the request scope; the handler runs inside it.
    await new Promise<void>((resolve) =>
      correlation(req, res, () => {
        void (async () => {
          log.info("before auth");
          const scope = currentScope()!;
          scope.organizationId = "org-1";
          scope.userId = "user-1";
          await new Promise((r) => setTimeout(r, 5));
          log.warn({ step: "after await" }, "service step");
          resolve();
        })();
      }),
    );
    expect(lines[0]).toMatchObject({ msg: "before auth", correlation_id: "corr-12345678" });
    expect(lines[0]).not.toHaveProperty("user_id");
    expect(lines[1]).toMatchObject({ msg: "service step", step: "after await", correlation_id: "corr-12345678", organization_id: "org-1", user_id: "user-1" });
  });

  it("writes plain lines outside a request", () => {
    const { log, lines } = capture();
    log.info("boot");
    expect(lines[0]).toMatchObject({ msg: "boot", service: "quartermaster-api" });
    expect(lines[0]).not.toHaveProperty("correlation_id");
  });
});
