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
        statements: 57,
        branches: 48,
        functions: 48,
        lines: 58,
        "lib/**": { statements: 78, branches: 78, functions: 76, lines: 81 },
      },
    },
  },
});
