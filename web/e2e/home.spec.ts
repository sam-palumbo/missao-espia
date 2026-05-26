import { test, expect } from "@playwright/test";

test.describe("Página Inicial (Home)", () => {
  test("exibe o título do jogo", async ({ page }) => {
    await page.goto("/");
    await expect(page.locator("text=Missão")).toBeVisible();
    await expect(page.locator("text=Espia")).toBeVisible();
  });

  test("exibe campo de e-mail e senha", async ({ page }) => {
    await page.goto("/");
    await expect(page.locator('input[type="email"]')).toBeVisible();
    await expect(page.locator('input[type="password"]')).toBeVisible();
  });

  test("botão Entrar desabilitado sem e-mail e senha", async ({ page }) => {
    await page.goto("/");
    await expect(page.locator('button:has-text("Entrar")')).toBeDisabled();
  });

  test("botão Entrar habilita com e-mail e senha preenchidos", async ({ page }) => {
    await page.goto("/");
    await page.locator('input[type="email"]').fill("joao@exemplo.com");
    await page.locator('input[type="password"]').fill("senha123");
    await expect(page.locator('button:has-text("Entrar")')).toBeEnabled();
  });

  test("link 'Entrar como Visitante' navega para /entrar", async ({ page }) => {
    await page.goto("/");
    await page.locator('text=Entrar como Visitante').click();
    await expect(page).toHaveURL(/\/entrar/);
  });

  test("link 'Crie sua conta' navega para /criar", async ({ page }) => {
    await page.goto("/");
    await page.locator('text=Crie sua conta').click();
    await expect(page).toHaveURL(/\/criar/);
  });

  test("Mostrar/Ocultar alterna visibilidade da senha", async ({ page }) => {
    await page.goto("/");
    const senhaInput = page.locator('input[type="password"]');
    await expect(senhaInput).toBeVisible();

    await page.locator('button:has-text("Mostrar")').click();
    await expect(page.locator('input[type="text"][autocomplete="current-password"]')).toBeVisible();

    await page.locator('button:has-text("Ocultar")').click();
    await expect(page.locator('input[type="password"]')).toBeVisible();
  });
});
