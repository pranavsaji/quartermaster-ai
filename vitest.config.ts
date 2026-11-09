import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    include: ["tests/unit/**/*.test.ts", "tests/adversarial/**/*.test.ts", "tests/integration/**/*.test.ts"],
    environment: "node",
    testTimeout: 30_000,
    hookTimeout: 60_000,
    pool: "forks",
    coverage: {
      provider: "v8",
      include: ["packages/*/src/**", "apps/api/src/**"],
      exclude: ["**/cli/**", "apps/api/src/server.ts"],
      reporter: ["text-summary", "json-summary", "html"],
      // Floors at the current measured level; raise them as coverage grows, never lower them.
      thresholds: { statements: 84, branches: 72, functions: 84, lines: 87 },
    },
  },
});
