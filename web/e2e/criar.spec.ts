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

  test("exibe o controle de número de rodadas (slider de 1 a 7)", async ({ page }) => {
    await page.goto("/criar");

    const slider = page.getByRole("slider", { name: "Número de Rodadas" });
    await expect(slider).toBeVisible();
    await expect(slider).toHaveAttribute("min", "1");
    await expect(slider).toHaveAttribute("max", "7");
  });

  test("exibe campo de senha opcional", async ({ page }) => {
    await page.goto("/criar");

    await expect(page.locator('input[placeholder*="Sala pública"]')).toBeVisible();
  });
});
