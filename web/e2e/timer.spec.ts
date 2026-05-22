import { test, expect } from '@playwright/test';

test.describe('Timer com Fórmula Correta', () => {
  test('deve calcular timer corretamente: 5 min + jogadores - espias', async ({ page }) => {
    await page.goto('/');
    
    // Criar sala com 4 jogadores (1 espia)
    await page.click('text=Criar Sala');
    await page.fill('input[placeholder*="apelido"]', 'Jogador1');
    await page.fill('input[type="number"]', '2');
    await page.click('button:has-text("Criar")');
    
    // Iniciar rodada
    await page.click('button:has-text("Iniciar Rodada")');
    
    // Verificar que o timer aparece
    await page.waitForSelector('text=/\\d{2}:\\d{2}/');
    
    // Para 4 jogadores e 1 espia: 5 + 4 - 1 = 8 minutos
    // O timer deve mostrar algo próximo a 08:00
    const timerText = await page.textContent('text=/\\d{2}:\\d{2}/');
    expect(timerText).toMatch(/0[8-9]:\\d{2}|1[0-2]:\\d{2}/); // 8-12 minutos
  });

  test('deve mostrar timer regressivo', async ({ page }) => {
    await page.goto('/');
    
    // Criar sala
    await page.click('text=Criar Sala');
    await page.fill('input[placeholder*="apelido"]', 'Jogador1');
    await page.fill('input[type="number"]', '2');
    await page.click('button:has-text("Criar")');
    
    // Iniciar rodada
    await page.click('button:has-text("Iniciar Rodada")');
    
    // Capturar tempo inicial
    const initialTimer = await page.textContent('text=/\\d{2}:\\d{2}/');
    
    // Aguardar 2 segundos
    await page.waitForTimeout(2000);
    
    // Capturar tempo após 2 segundos
    const laterTimer = await page.textContent('text=/\\d{2}:\\d{2}/');
    
    // O timer deve ter diminuído
    expect(initialTimer).not.toBe(laterTimer);
  });

  test('deve mostrar barra de progresso do timer', async ({ page }) => {
    await page.goto('/');
    
    // Criar sala
    await page.click('text=Criar Sala');
    await page.fill('input[placeholder*="apelido"]', 'Jogador1');
    await page.fill('input[type="number"]', '2');
    await page.click('button:has-text("Criar")');
    
    // Iniciar rodada
    await page.click('button:has-text("Iniciar Rodada")');
    
    // Verificar que a barra de progresso existe
    const progressBar = page.locator('style*="width:"');
    await expect(progressBar).toBeVisible();
  });
});
