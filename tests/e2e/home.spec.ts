import { expect, test } from "@playwright/test";

test.beforeEach(async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
});

test("renders the F1 pit strategy app with prediction controls", async ({
  page,
}) => {
  await page.goto("/");

  await expect(
    page.getByRole("heading", {
      name: /predict the next pit window/i,
    }),
  ).toBeVisible();
  await expect(page.getByText(/Race Strategy Console/i)).toBeVisible();
  await expect(
    page.locator("header").getByText("Lewis Hamilton", { exact: true }),
  ).toBeVisible();
  await expect(page.getByText(/Model confidence/i)).toBeVisible();
  await expect(page.getByText(/Tire degradation/i)).toBeVisible();
});

test("updates the selected driver and team styling context", async ({ page }) => {
  await page.goto("/");

  await page.locator("select").first().selectOption("max-verstappen");

  await expect(
    page.locator("header").getByText("Max Verstappen", { exact: true }),
  ).toBeVisible();
  await expect(
    page.locator("header").getByText("Red Bull Racing", { exact: true }).first(),
  ).toBeVisible();
});

test("recomputes the strategy recommendation from user inputs", async ({
  page,
}) => {
  await page.goto("/");

  const inputs = page.locator('input[type="number"]');
  await inputs.nth(0).fill("29");
  await inputs.nth(1).fill("57");
  await inputs.nth(2).fill("16");
  await page.locator("select").nth(1).selectOption("dry");
  await page.locator("select").nth(2).selectOption("soft");

  await expect(page.getByText(/Box this lap/i)).toBeVisible();
  await expect(page.getByText(/High/i).first()).toBeVisible();
});

test("keeps the directory readable on mobile without horizontal overflow", async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/");

  await expect(
    page.getByRole("heading", {
      name: /predict the next pit window/i,
    }),
  ).toBeVisible();
  await expect(page.getByText(/Tire degradation/i)).toBeVisible();
  await expect(page.getByText(/Strategic notes/i)).toBeVisible();

  const maxWidth = await page.evaluate(() =>
    Math.max(document.documentElement.scrollWidth, document.body.scrollWidth),
  );

  expect(maxWidth).toBeLessThanOrEqual(390);
});
