import { test } from "@playwright/test";

import { expectNoHorizontalOverflow, loginAs } from "./helpers";

/**
 * Verifica rolagem horizontal indevida nas principais telas em três tamanhos e salva
 * capturas em test-results/screenshots para revisão visual.
 */
const viewports = [
  { name: "celular", width: 375, height: 812 },
  { name: "tablet", width: 820, height: 1180 },
  { name: "desktop", width: 1440, height: 900 },
];

/** Páginas compartilháveis da comunidade (abrem sem login). */
const sharedPages = ["/profile/e2e-diana", "/library/e2e-genetica", "/publications/e2e-artigo"];
const publicPages = ["/", "/login", "/first-access", ...sharedPages];
const privatePages = [
  "/dashboard",
  "/subjects",
  "/simulations",
  "/settings/ai",
  "/settings/account",
  "/settings/profile",
  "/people",
  "/following",
  "/discover",
  "/library",
  ...sharedPages,
  "/admin/users",
  "/admin/access-requests",
];

for (const viewport of viewports) {
  test.describe(`responsividade: ${viewport.name}`, () => {
    test.use({ viewport: { width: viewport.width, height: viewport.height } });

    test("páginas públicas", async ({ page }) => {
      for (const path of publicPages) {
        await page.goto(path);
        await page.waitForLoadState("networkidle");
        await expectNoHorizontalOverflow(page);
        await page.screenshot({
          path: `test-results/screenshots/${viewport.name}${path === "/" ? "-landing" : path.replace(/\//g, "-")}.png`,
          fullPage: true,
        });
      }
    });

    test("páginas privadas", async ({ page }) => {
      await loginAs(page, "admin@e2e.test");
      for (const path of privatePages) {
        await page.goto(path);
        await page.waitForLoadState("networkidle");
        await expectNoHorizontalOverflow(page);
        await page.screenshot({ path: `test-results/screenshots/${viewport.name}${path.replace(/\//g, "-")}.png`, fullPage: true });
      }

      await page.goto("/subjects");
      await page.getByRole("link", { name: "Ciências Ambientais" }).first().click();
      await page.waitForLoadState("networkidle");
      await expectNoHorizontalOverflow(page);
      await page.screenshot({ path: `test-results/screenshots/${viewport.name}-subject-detail.png`, fullPage: true });

      await page.goto("/simulations");
      await page.getByRole("button", { name: /Ciências Ambientais/ }).click();
      await page.waitForLoadState("networkidle");
      await expectNoHorizontalOverflow(page);
      await page.screenshot({ path: `test-results/screenshots/${viewport.name}-simulation-setup.png`, fullPage: true });

      if (viewport.width < 768) {
        await page.getByRole("button", { name: "Abrir menu" }).click();
        await page.screenshot({ path: `test-results/screenshots/${viewport.name}-drawer.png` });
      }
    });
  });
}
