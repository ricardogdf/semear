import { expect, type Page } from "@playwright/test";

export const PASSWORD = "senha-e2e-12345";

export async function loginAs(page: Page, email: string) {
  await page.goto("/login");
  await page.getByLabel("E-mail").fill(email);
  await page.getByLabel("Senha", { exact: true }).fill(PASSWORD);
  await page.getByRole("button", { name: "Entrar" }).click();
  await page.waitForURL("**/dashboard");
}

/** Falha se a página tiver rolagem horizontal (conteúdo mais largo que a viewport). */
export async function expectNoHorizontalOverflow(page: Page) {
  const overflow = await page.evaluate(() => {
    const width = document.documentElement.clientWidth;
    const offenders = Array.from(document.querySelectorAll<HTMLElement>("body *"))
      .filter((element) => {
        const rect = element.getBoundingClientRect();
        const style = getComputedStyle(element);
        return rect.width > 0 && rect.right > width + 1 && style.position !== "fixed" && !element.closest("[data-allow-overflow]");
      })
      .slice(0, 5)
      .map((element) => `${element.tagName.toLowerCase()}.${String(element.className).slice(0, 60)}`);
    return { scroll: document.documentElement.scrollWidth - width, offenders };
  });
  expect(overflow.scroll, `rolagem horizontal; elementos: ${overflow.offenders.join(" | ")}`).toBeLessThanOrEqual(1);
}
