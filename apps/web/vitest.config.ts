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
  },
});
