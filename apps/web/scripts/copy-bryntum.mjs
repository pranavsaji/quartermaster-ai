// Copies Bryntum Scheduler's prebuilt ES module into public/ so the browser imports it at
// runtime. Bundling the 4.6 MB module pushed the production build past the host's memory.
// The file lands under the package version (public/vendor/bryntum/<version>/), so it can be
// served with an immutable Cache-Control (next.config.ts): an upgrade changes the URL.
import { copyFileSync, mkdirSync, readFileSync } from "node:fs";
import { createRequire } from "node:module";
import path from "node:path";

const require = createRequire(import.meta.url);
const source = require.resolve("@bryntum/scheduler/scheduler.module.js");
const { version } = JSON.parse(readFileSync(path.join(path.dirname(source), "package.json"), "utf8"));
if (!/^\d+\.\d+\.\d+$/.test(version)) throw new Error(`Unexpected Bryntum Scheduler version: ${version}`);
const target = path.resolve(import.meta.dirname, `../public/vendor/bryntum/${version}/scheduler.module.js`);
mkdirSync(path.dirname(target), { recursive: true });
copyFileSync(source, target);
console.warn(`Bryntum Scheduler ${version} module copied to ${path.relative(process.cwd(), target)}`);
