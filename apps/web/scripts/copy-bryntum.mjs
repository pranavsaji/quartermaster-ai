// Copies Bryntum Scheduler's prebuilt ES module into public/ so the browser imports it at
// runtime. Bundling the 4.6 MB module pushed the production build past the host's memory.
import { copyFileSync, mkdirSync } from "node:fs";
import { createRequire } from "node:module";
import path from "node:path";

const require = createRequire(import.meta.url);
const source = require.resolve("@bryntum/scheduler/scheduler.module.js");
const target = path.resolve(import.meta.dirname, "../public/vendor/bryntum/scheduler.module.js");
mkdirSync(path.dirname(target), { recursive: true });
copyFileSync(source, target);
console.warn(`Bryntum Scheduler module copied to ${path.relative(process.cwd(), target)}`);
