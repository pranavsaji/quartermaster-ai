import { defineConfig, devices } from "@playwright/test";

/**
 * Browser journeys against a running stack (API + web). Start it with `pnpm dev` after seeding,
 * or point E2E_BASE_URL at a deployment. PayPal popups are not automated; payment flows are
 * covered by the API integration suite with the PayPal fake.
 */
export default defineConfig({
  testDir: "tests/e2e",
  timeout: 90_000,
  expect: { timeout: 30_000 },
  retries: process.env.CI ? 1 : 0,
  reporter: [["list"]],
  use: {
    baseURL: process.env.E2E_BASE_URL ?? "http://localhost:3000",
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
  },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
});
