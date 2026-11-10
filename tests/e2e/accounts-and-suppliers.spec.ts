import { expect, test } from "@playwright/test";

/**
 * Self-service journeys: sign up with sample data, invite a teammate who accepts the one-time
 * link in a separate browser, and add a supplier with a catalog listing and a stock item.
 */
const run = Date.now().toString(36);
const ownerEmail = `owner-${run}@example.com`;
const managerEmail = `manager-${run}@example.com`;
const PASSWORD = "e2e-strong-password-2026";

test("sign up, invite a manager who joins, and add a supplier, a product and a stock item", async ({ page, browser }) => {
  await page.goto("/login");
  await page.getByRole("link", { name: "Create an account" }).click();
  await expect(page).toHaveURL(/\/signup/);
  await page.waitForLoadState("networkidle");
  await page.getByRole("textbox", { name: "Your name" }).fill("E2E Owner");
  await page.getByRole("textbox", { name: "Work email" }).fill(ownerEmail);
  await page.getByRole("textbox", { name: "Password", exact: true }).fill(PASSWORD);
  await page.getByRole("textbox", { name: "Confirm password" }).fill(PASSWORD);
  await page.getByRole("textbox", { name: "Restaurant name" }).fill(`E2E Bistro ${run}`);
  await expect(page.getByRole("textbox", { name: "Work email" })).toHaveValue(ownerEmail);
  await expect(page.getByLabel("Start with sample data")).toBeChecked();
  await page.getByRole("button", { name: "Create account" }).click();
  await expect(page).not.toHaveURL(/\/signup/);
  await expect(page.getByText(`E2E Bistro ${run}`).first()).toBeVisible();

  // Invite a manager and copy the one-time link.
  await page.goto("/team");
  const form = page.getByRole("form", { name: "Invite someone" });
  await form.getByLabel(/Email/).fill(managerEmail);
  await form.getByRole("button", { name: "Send invitation" }).click();
  await expect(page.getByText(`Invitation ready for ${managerEmail}`)).toBeVisible();
  const link = await page.locator("[title*='/invite#token=']").first().getAttribute("title");
  expect(link).toMatch(/\/invite#token=[\w-]+$/);

  // The invitee opens it in their own browser.
  const invitee = await browser.newContext();
  const other = await invitee.newPage();
  await other.goto(new URL(link!).pathname + new URL(link!).hash);
  await expect(other.getByText(`E2E Bistro ${run}`).first()).toBeVisible();
  await other.getByRole("textbox", { name: "Your name" }).fill("E2E Manager");
  await other.getByRole("textbox", { name: "Password", exact: true }).fill(PASSWORD);
  await other.getByRole("textbox", { name: "Confirm password" }).fill(PASSWORD);
  await other.getByRole("button", { name: `Join E2E Bistro ${run}` }).click();
  await expect(other).not.toHaveURL(/\/invite/);
  // The token is not left in the address bar.
  expect(other.url()).not.toContain("token=");
  await invitee.close();

  await page.reload();
  await expect(page.getByRole("row").filter({ hasText: managerEmail })).toBeVisible();

  // Add a supplier, then a product in its catalog.
  await page.goto("/suppliers");
  await page.getByRole("button", { name: "Add supplier" }).first().click();
  const supplierDialog = page.getByRole("dialog");
  await supplierDialog.getByLabel("Name").fill("Bayside Beverages");
  await supplierDialog.getByLabel("Lead time (days)").fill("2");
  await supplierDialog.getByLabel("Sales tax (%)").fill("8.25");
  await supplierDialog.getByLabel("Amount").fill("9");
  await supplierDialog.getByLabel("Free over").fill("150");
  await supplierDialog.getByRole("button", { name: "Add supplier" }).click();
  await expect(page.getByText("Bayside Beverages added")).toBeVisible();
  await expect(page.getByRole("row", { name: /Bayside Beverages.*Not approved/ })).toBeVisible();
  await page.getByRole("link", { name: "Open Bayside Beverages" }).click();
  await expect(page.getByRole("heading", { name: "Bayside Beverages" }).first()).toBeVisible();

  await page.getByRole("button", { name: "Add product" }).first().click();
  const productDialog = page.getByRole("dialog");
  await productDialog.getByLabel("SKU").fill("BB-COLA-24");
  await productDialog.getByLabel("Title").fill("Cola, 24 x 12 oz cans");
  await productDialog.getByLabel("Category").selectOption("beverages");
  await productDialog.getByLabel("Units per pack").fill("24");
  await productDialog.getByLabel("Price per pack").fill("14.99");
  await productDialog.getByRole("button", { name: "Add product" }).click();
  await expect(page.getByText("BB-COLA-24").first()).toBeVisible();

  // Add a stock item.
  await page.goto("/inventory");
  await page.getByRole("button", { name: "Add item" }).first().click();
  const itemDialog = page.getByRole("dialog");
  await itemDialog.getByLabel("SKU").fill("BEV-COLA");
  await itemDialog.getByLabel("Name").fill("Cola cans");
  await itemDialog.getByLabel("Category").selectOption("beverages");
  await itemDialog.getByLabel("Unit").fill("each");
  await itemDialog.getByLabel("On hand now").fill("48");
  await itemDialog.getByLabel("Safety stock").fill("24");
  await itemDialog.getByLabel("Market search").fill("cola soda cans 24 pack");
  await itemDialog.getByRole("button", { name: /Add item|Save/ }).click();
  await expect(page.getByText("BEV-COLA").first()).toBeVisible();
});
