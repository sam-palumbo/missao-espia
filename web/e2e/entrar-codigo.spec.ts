import { test, expect } from '@playwright/test';

test.describe('Página Entrar — Digitar Código da Sala', () => {

  test('deve mostrar a página de entrar com 4 caixas vazias', async ({ page }) => {
    await page.goto('/entrar');

    await expect(page.locator('text=Digite o código')).toBeVisible();
    await expect(page.locator('text=da sala.')).toBeVisible();

    const caixas = page.locator('[style*="aspectRatio: 1/1.15"]');
    await expect(caixas).toHaveCount(4);

    for (let i = 0; i < 4; i++) {
      await expect(caixas.nth(i)).toHaveText('');
    }
  });

  test('deve capturar digitação e converter para MAIÚSCULAS', async ({ page }) => {
    await page.goto('/entrar');

    const caixas = page.locator('[style*="aspectRatio: 1/1.15"]');

    await page.locator('input[maxLength="4"]').fill('abcd');

    await expect(caixas.nth(0)).toHaveText('A');
    await expect(caixas.nth(1)).toHaveText('B');
    await expect(caixas.nth(2)).toHaveText('C');
    await expect(caixas.nth(3)).toHaveText('D');
  });

  test('deve FILTRAR caracteres que NÃO são letras (apenas A-Z permitido)', async ({ page }) => {
    await page.goto('/entrar');

    const caixas = page.locator('[style*="aspectRatio: 1/1.15"]');

    // Tentar digitar números, símbolos, espaços
    await page.locator('input[maxLength="4"]').fill('a1b@c 2');

    // Apenas A, B, C devem aparecer (1, @, espaço, 2 filtrados)
    await expect(caixas.nth(0)).toHaveText('A');
    await expect(caixas.nth(1)).toHaveText('B');
    await expect(caixas.nth(2)).toHaveText('C');
    await expect(caixas.nth(3)).toHaveText('');
  });

  test('deve aceitar no MÁXIMO 4 caracteres', async ({ page }) => {
    await page.goto('/entrar');

    const caixas = page.locator('[style*="aspectRatio: 1/1.15"]');

    // Tentar digitar mais de 4 letras
    await page.locator('input[maxLength="4"]').fill('ABCDEFGH');

    // Apenas 4 primeiros são aceitos
    await expect(caixas.nth(0)).toHaveText('A');
    await expect(caixas.nth(1)).toHaveText('B');
    await expect(caixas.nth(2)).toHaveText('C');
    await expect(caixas.nth(3)).toHaveText('D');
  });

  test('deve permitir digitar caractere por caractere (simulando usuário)', async ({ page }) => {
    await page.goto('/entrar');

    const caixas = page.locator('[style*="aspectRatio: 1/1.15"]');
    const input = page.locator('input[maxLength="4"]');

    // Digitar letra por letra
    await input.press('w');
    await expect(caixas.nth(0)).toHaveText('W');
    await expect(caixas.nth(1)).toHaveText('');

    await input.press('x');
    await expect(caixas.nth(0)).toHaveText('W');
    await expect(caixas.nth(1)).toHaveText('X');

    await input.press('y');
    await expect(caixas.nth(2)).toHaveText('Y');

    await input.press('z');
    await expect(caixas.nth(3)).toHaveText('Z');
  });

  test('deve exibir campo de apelido e botão desabilitado inicialmente', async ({ page }) => {
    await page.goto('/entrar');

    // Campo apelido existe
    await expect(page.locator('input[placeholder*="Maria, Moisés"]')).toBeVisible();

    // Botão "Entrar na Sala" existe
    const botao = page.locator('button:has-text("Entrar na Sala")');
    await expect(botao).toBeVisible();

    // E está desabilitado sem código válido
    await expect(botao).toBeDisabled();
  });

  test('botão habilita quando código (4 letras) + apelido preenchidos', async ({ page }) => {
    await page.goto('/entrar');

    const botao = page.locator('button:has-text("Entrar na Sala")');

    // Apenas código → ainda desabilitado (falta apelido)
    await page.locator('input[maxLength="4"]').fill('TEST');
    await expect(botao).toBeDisabled();

    // Preenche apelido → botão habilita
    await page.locator('input[placeholder*="Maria, Moisés"]').fill('João');
    await expect(botao).toBeEnabled();
  });
});
