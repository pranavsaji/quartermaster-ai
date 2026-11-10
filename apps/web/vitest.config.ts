import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

/**
 * Web unit and component tests (jsdom + Testing Library). Separate from the
 * root Vitest config, which only runs the API and package suites in tests/.
 */
export default defineConfig({
  resolve: {
    alias: { "@": fileURLToPath(new URL(".", import.meta.url)) },
  },
  test: {
    environment: "jsdom",
    include: ["tests/**/*.test.{ts,tsx}"],
    setupFiles: ["./tests/setup.ts"],
    restoreMocks: true,
    unstubGlobals: true,
    // Floors at the measured level so coverage can only go up. Pages and layouts are exercised
    // end to end by Playwright (tests/e2e), which this report does not include.
    coverage: {
      provider: "v8",
      include: ["lib/**", "components/**", "app/**"],
      reporter: ["text-summary", "json-summary"],
      reportsDirectory: "../../coverage/web",
      thresholds: {
        statements: 70,
        branches: 64,
        functions: 66,
        lines: 72,
        "lib/**": { statements: 83, branches: 82, functions: 84, lines: 86 },
      },
    },
  },
});
