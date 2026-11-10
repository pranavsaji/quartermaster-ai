import { bootstrap, loadDotEnv } from "./bootstrap";
import { createApp } from "./http/app";
import { startSweeper } from "./jobs/sweeper";
import { createShutdown } from "./lifecycle";

loadDotEnv();
const ctx = await bootstrap();
const app = createApp(ctx);
const sweeper = startSweeper(ctx);

const server = app.listen(ctx.config.port, () => {
  ctx.log.info(
    {
      port: ctx.config.port,
      database: ctx.database.driver,
      paypal: ctx.paypal.configured ? ctx.config.paypal.environment : "disabled",
      channel3: ctx.channel3.enabled,
      ai: ctx.openai.enabled ? ctx.config.openai.model : "deterministic",
      signing_key: ctx.signingKey.key_id,
    },
    "Quartermaster API listening",
  );
});
server.headersTimeout = 65_000;
// Long enough for the longest permitted research run, with headroom for planning and the response.
server.requestTimeout = Math.max(120_000, ctx.config.agent.deadlineMs + 30_000);

const lifecycle = createShutdown({
  server,
  log: ctx.log,
  sweeper,
  closeDatabase: () => ctx.database.close(),
  graceMs: ctx.config.shutdownGraceMs,
  exit: (code) => process.exit(code),
});

process.on("SIGTERM", () => void lifecycle.shutdown("SIGTERM"));
process.on("SIGINT", () => void lifecycle.shutdown("SIGINT"));
// The process state is unknown after either of these: log, record and alert (bounded wait),
// drain what we can, exit non-zero.
const fatal = (code: string, err: unknown) => {
  ctx.log.fatal({ err }, code === "UNCAUGHT_EXCEPTION" ? "uncaught exception" : "unhandled rejection");
  const tracked = ctx.errors.capture({
    source: "api",
    level: "fatal",
    code,
    message: err instanceof Error ? `${err.name}: ${err.message}` : "Non-error value",
    err,
  });
  void Promise.race([tracked, new Promise((r) => setTimeout(r, 5000).unref())]).finally(
    () => void lifecycle.shutdown(code === "UNCAUGHT_EXCEPTION" ? "uncaughtException" : "unhandledRejection", 1),
  );
};
process.on("uncaughtException", (err) => fatal("UNCAUGHT_EXCEPTION", err));
process.on("unhandledRejection", (err) => fatal("UNHANDLED_REJECTION", err));
