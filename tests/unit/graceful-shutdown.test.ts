import http from "node:http";
import type { AddressInfo } from "node:net";
import { Writable } from "node:stream";
import { describe, expect, it } from "vitest";
import { createShutdown } from "../../apps/api/src/lifecycle";
import { createLogger } from "../../apps/api/src/logger";

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

async function setup(handler: http.RequestListener, opts: { graceMs: number; sweepMs?: number }) {
  const events: string[] = [];
  const logs: Record<string, unknown>[] = [];
  const log = createLogger(
    "info",
    new Writable({
      write(c, _e, done) {
        logs.push(JSON.parse(String(c)) as Record<string, unknown>);
        done();
      },
    }),
  );
  const server = http.createServer(handler);
  await new Promise<void>((r) => server.listen(0, "127.0.0.1", r));
  const port = (server.address() as AddressInfo).port;
  let exited: (code: number) => void = () => undefined;
  const exit = new Promise<number>((r) => (exited = r));
  const lifecycle = createShutdown({
    server,
    log,
    graceMs: opts.graceMs,
    sweeper: {
      stop: async () => {
        await sleep(opts.sweepMs ?? 0);
        events.push("sweeper stopped");
      },
    },
    closeDatabase: async () => {
      events.push("database closed");
    },
    exit: (code) => {
      events.push(`exit ${code}`);
      exited(code);
    },
  });
  const get = () =>
    new Promise<{ status: number; body: string; connection?: string }>((resolve, reject) => {
      http
        .get({ host: "127.0.0.1", port, path: "/", agent: false }, (res) => {
          let body = "";
          res.on("data", (d) => (body += d));
          res.on("end", () => {
            events.push("response");
            resolve({ status: res.statusCode!, body, connection: res.headers.connection });
          });
        })
        .on("error", reject);
    });
  return { lifecycle, get, exit, events, logs };
}

describe("graceful shutdown", () => {
  it("waits for in-flight requests and the running sweep before closing the database and exiting", async () => {
    const { lifecycle, get, exit, events } = await setup(
      (_req, res) => {
        setTimeout(() => res.end("done"), 150);
      },
      { graceMs: 5_000, sweepMs: 50 },
    );
    const pending = get();
    await sleep(30);
    expect(lifecycle.inFlight).toBe(1);
    const shutdown = lifecycle.shutdown("SIGTERM");
    expect(lifecycle.shutdown("SIGTERM")).toBe(shutdown);
    expect((await pending).body).toBe("done");
    expect(await exit).toBe(0);
    expect(events).toEqual(["response", "sweeper stopped", "database closed", "exit 0"]);
  });

  it("stops accepting new connections once draining", async () => {
    const { lifecycle, get, exit } = await setup((_req, res) => setTimeout(() => res.end("x"), 100), { graceMs: 5_000 });
    const inflight = get();
    await sleep(20);
    void lifecycle.shutdown("SIGTERM");
    await expect(get()).rejects.toThrow(/ECONNREFUSED/);
    await inflight;
    await exit;
  });

  it("gives up on stuck requests after the grace period and exits with the given code", async () => {
    const { lifecycle, get, exit, logs } = await setup(() => undefined, { graceMs: 100 });
    const stuck = get().catch((e: Error) => e);
    await sleep(20);
    const started = Date.now();
    void lifecycle.shutdown("uncaughtException", 1);
    expect(await exit).toBe(1);
    expect(Date.now() - started).toBeLessThan(2_000);
    expect(await stuck).toBeInstanceOf(Error);
    expect(logs.some((l) => l.msg === "grace period elapsed; closing remaining connections" && l.in_flight === 1)).toBe(true);
  });
});
