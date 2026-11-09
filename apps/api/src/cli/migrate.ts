import { bootstrap, loadDotEnv } from "../bootstrap";

/** Applies database migrations (Render pre-deploy command). */
loadDotEnv();
const ctx = await bootstrap({ migrate: true });
ctx.log.info("migrations applied");
await ctx.database.close();
