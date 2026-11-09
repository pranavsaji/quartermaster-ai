import { defineConfig, devices } from "@playwright/test";

/**
 * Browser journeys against the full stack (API + web).
 *
 * - `E2E_BASE_URL` set: run against that deployment; nothing is started.
 * - Otherwise Playwright starts the built API (seeding a fresh embedded database first) and the
 *   built web app. Run `pnpm build` first. `E2E_PASSWORD` is the demo password to seed with.
 *
 * PayPal popups are not automated; payment flows are covered by the API integration suite with
 * the PayPal fake.
 */
const external = Boolean(process.env.E2E_BASE_URL);
const password = process.env.E2E_PASSWORD ?? process.env.DEMO_USER_PASSWORD ?? "";
const apiEnv = {
  NODE_ENV: "development",
  PORT: "4000",
  LOG_LEVEL: "warn",
  DATABASE_URL: "pglite://.data/e2e",
  DEMO_USER_PASSWORD: password,
  SWEEPER_INTERVAL_SECONDS: "0",
};

export default defineConfig({
  testDir: "tests/e2e",
  timeout: 90_000,
  expect: { timeout: 30_000 },
  retries: process.env.CI ? 1 : 0,
  workers: 1,
  reporter: process.env.CI ? [["list"], ["html", { open: "never" }]] : [["list"]],
  use: {
    baseURL: process.env.E2E_BASE_URL ?? "http://localhost:3000",
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
  },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
  webServer: external
    ? undefined
    : [
        {
          command: "rm -rf .data/e2e && node apps/api/dist/seed.js --reset && node apps/api/dist/server.js",
          url: "http://localhost:4000/healthz",
          env: apiEnv,
          timeout: 120_000,
          reuseExistingServer: !process.env.CI,
        },
        {
          command: "pnpm --filter @qm/web start",
          url: "http://localhost:3000/login",
          env: { PORT: "3000", API_URL: "http://localhost:4000" },
          timeout: 120_000,
          reuseExistingServer: !process.env.CI,
        },
      ],
});
