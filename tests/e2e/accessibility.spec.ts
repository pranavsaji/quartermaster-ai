import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page } from "@playwright/test";

/** Automated WCAG 2.1 A/AA checks on every console page (moderate, serious and critical fail). Manual review still covers the rest. */
const PASSWORD = process.env.E2E_PASSWORD ?? process.env.DEMO_USER_PASSWORD ?? "";

async function signIn(page: Page) {
  await page.goto("/login");
  await page.getByRole("textbox", { name: "Email" }).fill("owner@demo.quartermaster.dev");
  await page.locator("input[type=password]").fill(PASSWORD);
  await page.getByRole("button", { name: "Sign in" }).click();
  await expect(page).not.toHaveURL(/\/login/);
}

async function audit(page: Page, path: string) {
  const results = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"]).analyze();
  // The console is clean at "moderate" too, so moderate violations fail the scan as well.
  const serious = results.violations.filter((v) => v.impact === "moderate" || v.impact === "serious" || v.impact === "critical");
  expect(
    serious.map(
      (v) =>
        `${path}: ${v.id} (${v.impact}) — ${v.help} [${v.nodes.map((n) => `${n.target.join(" ")} :: ${(n.failureSummary ?? "").replace(/\s+/g, " ").slice(0, 160)}`).join(" | ")}]`,
    ),
  ).toEqual([]);
}

test("the sign-in page has no moderate-or-worse accessibility violations", async ({ page }) => {
  await page.goto("/login");
  await expect(page.getByRole("button", { name: "Sign in" })).toBeVisible();
  await audit(page, "/login");
});

test("console pages have no moderate-or-worse accessibility violations", async ({ page }) => {
  await signIn(page);
  for (const path of ["/", "/inventory", "/procurement", "/approvals", "/mandate", "/security", "/orders", "/analytics"]) {
    await page.goto(path);
    await expect(page.locator("main")).toBeVisible();
    // Let grids and charts finish rendering before scanning.
    await page.waitForLoadState("networkidle");
    await audit(page, path);
  }
});

test("a researched request (blocked evidence, proposals, approval form) has no moderate-or-worse violations", async ({ page }) => {
  await signIn(page);
  await page.goto("/procurement");
  await page.getByRole("button", { name: "New request" }).click();
  await page.getByLabel("Instruction").fill("Restock takeaway containers and cooking oil without exceeding $300.");
  await page.getByRole("button", { name: "Create & research" }).click();
  await expect(page.getByText(/TrustRail blocked this cart/i).first()).toBeVisible({ timeout: 60_000 });
  await page.waitForLoadState("networkidle");
  await audit(page, "/procurement/[id]");
});

test("a modal form showing validation errors has no moderate-or-worse violations", async ({ page }) => {
  await signIn(page);
  await page.goto("/inventory");
  await page
    .getByRole("button", { name: /^Adjust / })
    .first()
    .click();
  const dialog = page.getByRole("dialog");
  await dialog.getByRole("button", { name: "Save adjustment" }).click();
  await expect(dialog.getByRole("alert")).toBeVisible();
  await audit(page, "/inventory (adjustment dialog with errors)");
});
