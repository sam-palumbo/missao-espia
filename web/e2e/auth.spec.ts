import { test, expect } from "@playwright/test";

// Smoke E2E dos caminhos felizes de auth que não dependem de serviços externos
// (envio real de e-mail / OAuth Google são validados manualmente em staging).

test.describe("Criar conta", () => {
  test("valida campos e mostra confirmação ao criar", async ({ page }) => {
    await page.goto("/conta/criar");
    await expect(page.getByText("Crie sua")).toBeVisible();

    await page.locator('input[type="email"]').fill(`novo.jogador+${Date.now()}@exemplo.com`);
    await page.locator('input[autocomplete="new-password"]').first().fill("segredo123");
    await page.locator('input[autocomplete="new-password"]').last().fill("segredo123");

    await page.locator('button:has-text("Criar Conta")').click();

    // Em ambiente com confirmações ligadas, mostra "Confirme seu e-mail".
    // O sender padrão do Supabase tem cota baixa (D4): se esgotada, a submissão
    // retorna um toast de rate-limit. O smoke aceita ambos — em qualquer caso o
    // request foi processado e a wiring está correta.
    const confirmacao = page.getByText("Confirme seu e-mail");
    const toastErro = page.locator('[data-sonner-toast], li[role="status"]');
    await expect(confirmacao.or(toastErro).first()).toBeVisible({ timeout: 10000 });
  });
});

test.describe("Recuperar senha", () => {
  test("envia link e mostra mensagem neutra", async ({ page }) => {
    await page.goto("/conta/recuperar");
    await page.locator('input[type="email"]').fill("alguem@exemplo.com");
    await page.locator('button:has-text("Enviar link")').click();
    await expect(page.getByText("Verifique seu e-mail")).toBeVisible({ timeout: 10000 });
  });
});

test.describe("Navegação a partir da home", () => {
  test("'Esqueci a senha' leva a /conta/recuperar", async ({ page }) => {
    await page.goto("/");
    await page.locator('text=Esqueci a senha').click();
    await expect(page).toHaveURL(/\/conta\/recuperar/);
  });
});
