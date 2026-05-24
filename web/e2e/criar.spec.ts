// web/e2e/criar.spec.ts
import { test, expect } from "@playwright/test";

test.describe("Página Criar Sala", () => {
  test("exibe campo de apelido com placeholder correto", async ({ page }) => {
    await page.goto("/criar");

    await expect(page.locator('input[placeholder*="Davi, Ester"]')).toBeVisible();
  });

  test("botão 'Criar Sala' está desabilitado com apelido vazio", async ({ page }) => {
    await page.goto("/criar");

    await expect(page.locator('button:has-text("Criar Sala")')).toBeDisabled();
  });

  test("botão habilita ao preencher apelido", async ({ page }) => {
    await page.goto("/criar");

    await page.locator('input[placeholder*="Davi, Ester"]').fill("Moisés");

    await expect(page.locator('button:has-text("Criar Sala")')).toBeEnabled();
  });

  test("limpar apelido desabilita o botão novamente", async ({ page }) => {
    await page.goto("/criar");

    const input = page.locator('input[placeholder*="Davi, Ester"]');
    await input.fill("Moisés");
    await expect(page.locator('button:has-text("Criar Sala")')).toBeEnabled();

    await input.clear();
    await expect(page.locator('button:has-text("Criar Sala")')).toBeDisabled();
  });

  test("exibe os 4 botões de número de rodadas", async ({ page }) => {
    await page.goto("/criar");

    for (const n of ["3", "5", "7", "10"]) {
      await expect(page.locator(`button:has-text("${n}")`).first()).toBeVisible();
    }
  });

  test("exibe campo de senha opcional", async ({ page }) => {
    await page.goto("/criar");

    await expect(page.locator('input[placeholder*="Sala pública"]')).toBeVisible();
  });
});
