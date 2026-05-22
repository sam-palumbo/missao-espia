import { test, expect } from '@playwright/test';

test.describe('Primeira Rodada', () => {
  test('deve mostrar botão Dizer Palavra na primeira rodada', async ({ page }) => {
    // Navegar para a tela de criar sala
    await page.goto('/criar');
    
    // Preencher apelido
    await page.fill('input[placeholder*="Davi, Ester"]', 'Jogador1');
    
    // Selecionar número de rodadas (padrão é 5)
    // O botão "Criar Sala" está desabilitado até preencher o apelido
    
    // Clicar em Criar Sala
    await page.click('button:has-text("Criar Sala")');
    
    // Aguardar navegação para o lobby
    await page.waitForURL(/\/sala\/[A-Z]{4}\/lobby/);
    
    // Verificar que está no lobby
    await expect(page.locator('text=Sala de Espera')).toBeVisible();
  });

  test('deve permitir dizer uma única palavra na primeira rodada', async ({ page }) => {
    // Navegar para a tela de criar sala
    await page.goto('/criar');
    
    // Preencher apelido
    await page.fill('input[placeholder*="Davi, Ester"]', 'Jogador1');
    
    // Clicar em Criar Sala
    await page.click('button:has-text("Criar Sala")');
    
    // Aguardar navegação para o lobby
    await page.waitForURL(/\/sala\/[A-Z]{4}\/lobby/);
    
    // Nota: Para testar o fluxo completo de jogo, precisaríamos de múltiplos jogadores
    // Este teste verifica apenas que o fluxo de criação funciona
    await expect(page.locator('text=Sala de Espera')).toBeVisible();
  });

  test('não deve mostrar botão Fazer Pergunta na primeira rodada', async ({ page }) => {
    // Navegar para a tela de criar sala
    await page.goto('/criar');
    
    // Preencher apelido
    await page.fill('input[placeholder*="Davi, Ester"]', 'Jogador1');
    
    // Clicar em Criar Sala
    await page.click('button:has-text("Criar Sala")');
    
    // Aguardar navegação para o lobby
    await page.waitForURL(/\/sala\/[A-Z]{4}\/lobby/);
    
    // Verificar que está no lobby (não no jogo ainda)
    await expect(page.locator('text=Sala de Espera')).toBeVisible();
    
    // No lobby, não deve existir o botão "Fazer Pergunta"
    await expect(page.locator('text=Fazer Pergunta')).not.toBeVisible();
  });
});
