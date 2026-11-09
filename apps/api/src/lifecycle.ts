import type { SweeperHandle } from "./jobs/sweeper";
import type { Server } from "node:http";
import type { Logger } from "./logger";

export type { SweeperHandle };

export interface ShutdownDeps {
  server: Server;
  log: Logger;
  sweeper: SweeperHandle;
  closeDatabase: () => Promise<void>;
  /** How long in-flight requests (and a running sweep) may take to finish. */
  graceMs: number;
  exit: (code: number) => void;
}

const sleep = (ms: number) => new Promise<void>((r) => setTimeout(r, ms).unref());

async function within(ms: number, work: Promise<unknown>): Promise<boolean> {
  let done = false;
  await Promise.race([work.then(() => (done = true)), sleep(Math.max(0, ms))]);
  return done;
}

/**
 * Graceful drain: stop accepting connections, let in-flight requests finish (a procurement
 * research run takes ~45s) up to `graceMs`, stop the sweeper and wait for its current run,
 * close the database, then exit. Returns `shutdown(reason, exitCode)`; repeated calls share
 * the first drain.
 */
export function createShutdown(deps: ShutdownDeps) {
  const { server, log } = deps;
  let inFlight = 0;
  let draining = false;
  let idle: (() => void) | null = null;

  server.on("request", (_req, res) => {
    inFlight++;
    // Keep-alive clients must reconnect elsewhere once we are draining.
    if (draining && !res.headersSent) res.setHeader("Connection", "close");
    res.on("close", () => {
      inFlight--;
      if (inFlight === 0) idle?.();
    });
  });

  let running: Promise<void> | null = null;

  async function drain(reason: string, exitCode: number): Promise<void> {
    draining = true;
    const deadline = Date.now() + deps.graceMs;
    log.info({ reason, in_flight: inFlight, grace_ms: deps.graceMs }, "shutting down: draining in-flight requests");
    // Last resort if something below hangs (e.g. the database close).
    const backstop = setTimeout(() => deps.exit(1), deps.graceMs + 10_000).unref();

    server.close();
    server.closeIdleConnections();
    if (inFlight > 0) {
      const drained = await within(deadline - Date.now(), new Promise<void>((r) => (idle = r)));
      if (!drained) log.warn({ in_flight: inFlight }, "grace period elapsed; closing remaining connections");
    }
    server.closeAllConnections();

    if (!(await within(deadline - Date.now(), deps.sweeper.stop()))) log.warn("sweeper run did not finish within the grace period");
    try {
      await deps.closeDatabase();
    } catch (err) {
      log.error({ err }, "error closing the database");
    }
    log.info({ exit_code: exitCode }, "shutdown complete");
    clearTimeout(backstop);
    deps.exit(exitCode);
  }

  return {
    get inFlight() {
      return inFlight;
    },
    shutdown(reason: string, exitCode = 0): Promise<void> {
      running ??= drain(reason, exitCode);
      return running;
    },
  };
}
