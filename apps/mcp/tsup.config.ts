import { defineConfig } from "tsup";

export default defineConfig({
  entry: { index: "src/index.ts" },
  format: ["esm"],
  platform: "node",
  target: "node22",
  outDir: "dist",
  clean: true,
  sourcemap: true,
  // Workspace packages ship TypeScript source, so they are bundled; npm dependencies stay external.
  noExternal: [/^@qm\//],
  banner: { js: "#!/usr/bin/env node" },
});
