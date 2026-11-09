import { expect, test, type Page } from "@playwright/test";

/**
 * Owner journeys added with the web re-audit fixes: rejecting one proposal leaves the
 * others open, and the stock adjustment dialog takes unsigned amounts.
 */
const PASSWORD = process.env.E2E_PASSWORD ?? process.env.DEMO_USER_PASSWORD ?? "";

async function signIn(page: Page) {
  await page.goto("/login");
  await page.getByRole("textbox", { name: "Email" }).fill("owner@demo.quartermaster.dev");
  await page.locator("input[type=password]").fill(PASSWORD);
  await page.getByRole("button", { name: "Sign in" }).click();
  await expect(page).not.toHaveURL(/\/login/);
}

test.beforeAll(() => {
  if (!PASSWORD) throw new Error("Set E2E_PASSWORD to the demo password used when seeding.");
});

test("rejecting one proposal leaves the other open proposals approvable", async ({ page }) => {
  await signIn(page);
  await page.goto("/procurement");
  await page.getByRole("button", { name: "New request" }).click();
  await page.getByLabel("Instruction").fill("Restock takeaway containers and cooking oil without exceeding $300.");
  await page.getByRole("button", { name: "Create & research" }).click();
  await expect(page.getByText(/TrustRail blocked this cart/i).first()).toBeVisible({ timeout: 60_000 });

  const rejectButtons = page.getByRole("button", { name: "Reject", exact: true });
  await expect(rejectButtons.first()).toBeVisible();
  const openBefore = await rejectButtons.count();
  test.skip(openBefore < 2, "The seeded scenario produced a single approvable proposal");

  const target = page.locator("article").filter({ has: rejectButtons.first() }).first();
  // Supplier names repeat (a blocked cart and its replacement), so identify the card by its title id.
  const titleId = await target.getByRole("heading", { level: 3 }).getAttribute("id");
  expect(titleId).toBeTruthy();
  await target.getByRole("button", { name: "Reject", exact: true }).click();

  const dialog = page.getByRole("dialog");
  await expect(dialog).toBeVisible();
  await expect(dialog).toContainText("other proposals on the request stay open");
  await dialog.getByRole("textbox", { name: /Reason/ }).fill("Found a cheaper option elsewhere");
  await dialog.getByRole("button", { name: "Reject proposal" }).click();
  await expect(dialog).toBeHidden();

  // The rejected card stays on the page as a record, without its approval form; focus moves to it.
  const title = page.locator(`[id="${titleId}"]`);
  const rejected = page.locator("article").filter({ has: title });
  await expect(rejected.getByText("Proposal: Rejected")).toBeAttached();
  await expect(rejected.getByRole("button", { name: "Approve & sign" })).toHaveCount(0);
  await expect(title).toBeFocused();

  // Every other open proposal is untouched.
  await expect(rejectButtons).toHaveCount(openBefore - 1);
  await expect(page.getByRole("button", { name: "Approve & sign" })).toHaveCount(openBefore - 1);
});

test("the stock adjustment dialog takes unsigned amounts and validates before saving", async ({ page }) => {
  await signIn(page);
  await page.goto("/inventory");
  const adjust = page.getByRole("button", { name: /^Adjust / }).first();
  await expect(adjust).toBeVisible({ timeout: 30_000 });
  await adjust.click();

  const dialog = page.getByRole("dialog");
  await expect(dialog).toBeVisible();
  const onHandText = (await dialog.getByText(/^Currently [\d,]+ /).textContent()) ?? "";
  const onHand = Number(/Currently ([\d,]+)/.exec(onHandText)?.[1]?.replace(/,/g, ""));
  expect(Number.isFinite(onHand)).toBe(true);

  // Saving with no quantity: the error is announced and focus moves to the field.
  await dialog.getByRole("button", { name: "Save adjustment" }).click();
  await expect(dialog.getByRole("alert")).toContainText("There is a problem to fix");
  const counted = dialog.getByRole("textbox", { name: /Counted on hand/ });
  await expect(counted).toBeFocused();
  await expect(counted).toHaveAttribute("aria-invalid", "true");

  // Waste is entered as a positive amount; the reason supplies the sign.
  await dialog.getByRole("combobox", { name: /Reason/ }).selectOption("WASTE");
  const removed = dialog.getByRole("textbox", { name: /Quantity removed/ });
  await expect(removed).toHaveAttribute("inputmode", "numeric");
  await removed.fill("1");
  await expect(dialog.getByText(new RegExp(`Will remove 1 .* on hand after: ${(onHand - 1).toLocaleString("en-US")} `))).toBeVisible();
  await dialog.getByRole("button", { name: "Save adjustment" }).click();

  await expect(dialog).toBeHidden();
  await expect(page.getByText(new RegExp(`adjusted — now ${onHand - 1} `))).toBeVisible();
});
