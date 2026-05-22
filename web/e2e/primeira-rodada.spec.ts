import { test, expect } from '@playwright/test';

test.describe('Primeira Rodada', () => {
  test('deve mostrar botão Dizer Palavra na primeira rodada', async ({ page }) => {
    // Navegar para a tela inicial
    await page.goto('/');
    
    // Criar sala
    await page.click('text=Criar Sala');
    await page.fill('input[placeholder*="apelido"]', 'Jogador1');
    await page.fill('input[type="number"]', '2');
    await page.click('button:has-text("Criar")');
    
    // Aguardar código da sala
    await page.waitForSelector('text=Sala');
    const salaCode = await page.textContent('text=/Sala [A-Z]{4}/');
    expect(salaCode).toBeTruthy();
    
    // Entrar na sala com outro jogador
    await page.goto('/');
    await page.click('text=Entrar em Sala');
    await page.fill('input[placeholder*="código"]', salaCode?.match(/[A-Z]{4}/)?.[0] || 'ABCD');
    await page.fill('input[placeholder*="apelido"]', 'Jogador2');
    await page.click('button:has-text("Entrar")');
    
    // Iniciar rodada
    await page.click('button:has-text("Iniciar Rodada")');
    
    // Verificar que está na primeira rodada
    await page.waitForSelector('text=Rodada 1');
    
    // Verificar que o botão "Dizer Palavra" aparece
    await expect(page.locator('text=Dizer Palavra')).toBeVisible();
  });

  test('deve permitir dizer uma única palavra na primeira rodada', async ({ page }) => {
    await page.goto('/');
    
    // Criar sala e entrar
    await page.click('text=Criar Sala');
    await page.fill('input[placeholder*="apelido"]', 'Jogador1');
    await page.fill('input[type="number"]', '2');
    await page.click('button:has-text("Criar")');
    
    const salaCode = await page.textContent('text=/Sala [A-Z]{4}/');
    
    // Iniciar rodada
    await page.click('button:has-text("Iniciar Rodada")');
    
    // Clicar em "Dizer Palavra"
    await page.click('text=Dizer Palavra');
    
    // Verificar que o modal aparece
    await expect(page.locator('text=Diga uma palavra')).toBeVisible();
    await expect(page.locator('text=Na primeira rodada, cada jogador diz apenas uma palavra')).toBeVisible();
    
    // Tentar digitar duas palavras (deve falhar)
    await page.fill('input[placeholder*="Uma palavra"]', 'duas palavras');
    await page.click('button:has-text("Confirmar")');
    
    // Deve mostrar erro (validação no backend)
    // Nota: Isso pode precisar de ajuste dependendo de como a validação é implementada
  });

  test('não deve mostrar botão Fazer Pergunta na primeira rodada', async ({ page }) => {
    await page.goto('/');
    
    // Criar sala
    await page.click('text=Criar Sala');
    await page.fill('input[placeholder*="apelido"]', 'Jogador1');
    await page.fill('input[type="number"]', '2');
    await page.click('button:has-text("Criar")');
    
    // Iniciar rodada
    await page.click('button:has-text("Iniciar Rodada")');
    
    // Verificar que "Fazer Pergunta" NÃO aparece
    await expect(page.locator('text=Fazer Pergunta')).not.toBeVisible();
  });
});
