import { defineConfig } from "tsup";

export default defineConfig({
  entry: { server: "src/server.ts", sweep: "src/cli/sweep.ts", migrate: "src/cli/migrate.ts", seed: "src/cli/seed.ts" },
  format: ["esm"],
  platform: "node",
  target: "node22",
  outDir: "dist",
  clean: true,
  sourcemap: true,
  splitting: true,
  // Workspace packages ship TypeScript source, so they are bundled; npm dependencies stay external.
  noExternal: [/^@qm\//],
  banner: { js: "import { createRequire as __cr } from 'module'; const require = __cr(import.meta.url);" },
});
