import { expect, test } from "@playwright/test";

/**
 * AG Grid as the place where stock is kept: an owner types over Safety stock and On hand in the
 * inventory grid, the values are saved through the API and survive a reload, and the toolbar
 * search narrows the grid.
 */
const run = Date.now().toString(36);
const PASSWORD = "e2e-strong-password-2026";

test("an owner edits stock levels in the grid and they persist", async ({ page }) => {
  await page.goto("/signup");
  await page.waitForLoadState("networkidle");
  await page.getByRole("textbox", { name: "Your name" }).fill("Grid Owner");
  await page.getByRole("textbox", { name: "Work email" }).fill(`grid-${run}@example.com`);
  await page.getByRole("textbox", { name: "Password", exact: true }).fill(PASSWORD);
  await page.getByRole("textbox", { name: "Confirm password" }).fill(PASSWORD);
  await page.getByRole("textbox", { name: "Restaurant name" }).fill(`Grid Bistro ${run}`);
  await page.getByRole("button", { name: "Create account" }).click();
  await expect(page).not.toHaveURL(/\/signup/);

  await page.goto("/inventory");
  const grid = page.getByRole("region", { name: "Inventory items" });
  // Rows re-sort by stock status as values change, so the row is looked up by name each time.
  const cell = async (col: string) => {
    const row = grid.getByRole("row").filter({ hasText: "Nitrile gloves" }).first();
    await expect(row).toBeVisible();
    const index = await row.getAttribute("row-index");
    return grid.locator(`.ag-row[row-index="${index}"] [col-id="${col}"]`).first();
  };

  // Opens the cell editor, waits for it, types the value and commits it.
  const edit = async (col: string, value: string) => {
    await (await cell(col)).dblclick();
    const editor = grid.locator(".ag-cell-inline-editing input").first();
    await expect(editor).toBeVisible();
    await editor.fill(value);
    await editor.press("Enter");
    await expect(grid.locator(".ag-cell-inline-editing")).toHaveCount(0);
  };

  await edit("safety_stock", "250");
  await expect(await cell("safety_stock")).toHaveText(/250/);

  await edit("on_hand", "640");
  await expect(await cell("on_hand")).toHaveText(/640/);

  // Saved on the server: a fresh load shows the new values.
  await page.reload();
  await expect(await cell("safety_stock")).toHaveText(/250/);
  await expect(await cell("on_hand")).toHaveText(/640/);

  // Toolbar search narrows the rows.
  await page.getByRole("searchbox").first().fill("napkins");
  await expect(page.getByText(/^1 of 5$/)).toBeVisible();
});
