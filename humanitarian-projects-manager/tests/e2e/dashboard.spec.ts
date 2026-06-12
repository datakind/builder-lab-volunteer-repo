import { expect, test } from "@playwright/test";

test("dashboard filters and opens project detail", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("heading", { name: /Projects, evidence, reporting/ })).toBeVisible();

  await page.getByLabel("Search projects").fill("dignity");
  await expect(page.getByRole("link", { name: /Dignity Through Cash/ })).toBeVisible();

  await page.getByRole("link", { name: /Dignity Through Cash/ }).click();
  await expect(page.getByRole("heading", { name: "Dignity Through Cash" })).toBeVisible();
  await page.getByRole("button", { name: "reporting" }).click();
  await expect(page.getByText("Final Project Closeout Report")).toBeVisible();
});
