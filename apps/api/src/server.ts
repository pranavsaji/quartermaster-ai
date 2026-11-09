import { bootstrap, loadDotEnv } from "./bootstrap";
import { createApp } from "./http/app";
import { startSweeper } from "./jobs/sweeper";
import { createShutdown, type SweeperHandle } from "./lifecycle";

loadDotEnv();
const ctx = await bootstrap();
const app = createApp(ctx);
const sweeper: SweeperHandle = startSweeper(ctx);

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
server.requestTimeout = 120_000;

const { shutdown } = createShutdown({
  server,
  log: ctx.log,
  sweeper,
  closeDatabase: () => ctx.database.close(),
  graceMs: ctx.config.shutdownGraceMs,
  exit: (code) => process.exit(code),
});

process.on("SIGTERM", () => void shutdown("SIGTERM"));
process.on("SIGINT", () => void shutdown("SIGINT"));
// The process state is unknown after either of these: log, drain what we can, exit non-zero.
process.on("uncaughtException", (err) => {
  ctx.log.fatal({ err }, "uncaught exception");
  void shutdown("uncaughtException", 1);
});
process.on("unhandledRejection", (err) => {
  ctx.log.fatal({ err }, "unhandled rejection");
  void shutdown("unhandledRejection", 1);
});
