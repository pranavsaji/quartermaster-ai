import { bootstrap, loadDotEnv } from "./bootstrap";
import { createApp } from "./http/app";
import { startSweeper } from "./jobs/sweeper";

loadDotEnv();
const ctx = await bootstrap();
const app = createApp(ctx);
const stopSweeper = startSweeper(ctx);

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

let shuttingDown = false;
async function shutdown(signal: string) {
  if (shuttingDown) return;
  shuttingDown = true;
  ctx.log.info({ signal }, "shutting down");
  stopSweeper();
  server.close(async () => {
    await ctx.database.close().catch(() => {});
    process.exit(0);
  });
  setTimeout(() => process.exit(1), 15_000).unref();
}
process.on("SIGTERM", () => void shutdown("SIGTERM"));
process.on("SIGINT", () => void shutdown("SIGINT"));
process.on("unhandledRejection", (err) => ctx.log.error({ err }, "unhandled rejection"));
