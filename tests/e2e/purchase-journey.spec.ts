import { expect, test, type Page } from "@playwright/test";

/**
 * Browser journeys against a running stack seeded with the demo organization.
 * Requires E2E_PASSWORD (the DEMO_USER_PASSWORD used when seeding).
 */
const PASSWORD = process.env.E2E_PASSWORD ?? process.env.DEMO_USER_PASSWORD ?? "";

async function signIn(page: Page, role: "owner" | "manager" | "viewer" = "owner") {
  await page.goto("/login");
  await page.getByRole("textbox", { name: "Email" }).fill(`${role}@demo.quartermaster.dev`);
  await page.locator("input[type=password]").fill(PASSWORD);
  await page.getByRole("button", { name: "Sign in" }).click();
  await expect(page).not.toHaveURL(/\/login/);
}

test.beforeAll(() => {
  if (!PASSWORD) throw new Error("Set E2E_PASSWORD to the demo password used when seeding.");
});

test("owner researches a request, sees TrustRail block the injected supplier, approves and verifies", async ({ page }) => {
  const consoleErrors: string[] = [];
  page.on("console", (m) => m.type() === "error" && consoleErrors.push(m.text()));

  await signIn(page);
  await page.goto("/procurement");
  await page.getByRole("button", { name: "New request" }).click();
  await page.getByLabel("Instruction").fill("We're expecting a busy weekend. Restock takeaway containers and cooking oil without exceeding $300.");
  await page.getByRole("button", { name: "Create & research" }).click();

  await expect(page).toHaveURL(/\/procurement\/[0-9a-f-]{36}/);
  // The adversarial supplier's cart is shown as blocked evidence.
  await expect(page.getByText("QuickServe Packaging Co.").first()).toBeVisible({ timeout: 60_000 });
  await expect(page.getByText(/TrustRail blocked this cart/i).first()).toBeVisible();
  await expect(page.getByText(/Priority service charge/i).first()).toBeVisible();

  // Approve the first approvable proposal after acknowledging each review item.
  const approve = page.getByRole("button", { name: "Approve & sign" }).first();
  await expect(approve).toBeDisabled();
  const acks = page.getByRole("checkbox", { name: /I have reviewed/ });
  const count = await acks.count();
  for (let i = 0; i < count; i++) {
    const box = acks.nth(i);
    if (await box.isVisible()) await box.check();
    if (await approve.isEnabled()) break;
  }
  await expect(approve).toBeEnabled();
  await approve.click();

  // Certificate issued; verification passes every check.
  await expect(page.getByText(/Intent Certificate/i).first()).toBeVisible({ timeout: 30_000 });
  await page.getByRole("button", { name: "Verify" }).first().click();
  await expect(page.getByText("Certificate is valid.").first()).toBeVisible({ timeout: 30_000 });
  // PayPal is not configured in this environment: the UI must say so rather than fake a checkout.
  await expect(page.getByText(/PayPal sandbox not configured/i).first()).toBeVisible();

  expect(consoleErrors.filter((e) => !/favicon|Download the React DevTools/.test(e))).toEqual([]);
});

test("security center shows the injection finding and a valid audit chain", async ({ page }) => {
  await signIn(page);
  await page.goto("/security");
  await expect(page.getByText(/Prompt injection/i).first()).toBeVisible({ timeout: 30_000 });
  await expect(page.getByText(/QS-TK32-300/).first()).toBeVisible();
  await page.getByRole("tab", { name: /Audit log/ }).click();
  await page.getByRole("button", { name: "Verify audit chain" }).click();
  await expect(page.getByText("Audit chain intact")).toBeVisible({ timeout: 30_000 });
});

test("viewers get a read-only console", async ({ page }) => {
  await signIn(page, "viewer");
  await page.goto("/procurement");
  await expect(page.getByRole("button", { name: "New request" })).toHaveCount(0);
  await page.goto("/mandate");
  await expect(page.getByRole("button", { name: "Save mandate" })).toHaveCount(0);
});

test("every page renders for the owner", async ({ page }) => {
  await signIn(page);
  for (const path of ["/", "/inventory", "/procurement", "/approvals", "/mandate", "/security", "/orders", "/analytics"]) {
    const res = await page.goto(path);
    expect(res?.status(), path).toBeLessThan(400);
    await expect(page.locator("main")).toBeVisible();
    await expect(page.getByText(/unexpected error/i)).toHaveCount(0);
  }
});

test("unauthenticated visitors are sent to sign in", async ({ page }) => {
  await page.goto("/orders");
  await expect(page).toHaveURL(/\/login/);
});
