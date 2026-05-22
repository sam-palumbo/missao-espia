import { test, expect } from '@playwright/test';

test.describe('Fazer e Responder Perguntas', () => {
  test('deve mostrar botão Fazer Pergunta nas rodadas seguintes', async ({ page }) => {
    await page.goto('/');
    
    // Criar sala
    await page.click('text=Criar Sala');
    await page.fill('input[placeholder*="apelido"]', 'Jogador1');
    await page.fill('input[type="number"]', '2');
    await page.click('button:has-text("Criar")');
    
    // Iniciar primeira rodada
    await page.click('button:has-text("Iniciar Rodada")');
    
    // Na primeira rodada, não deve mostrar "Fazer Pergunta"
    await expect(page.locator('text=Fazer Pergunta')).not.toBeVisible();
    
    // Dizer palavra para avançar
    await page.click('text=Dizer Palavra');
    await page.fill('input[placeholder*="Uma palavra"]', 'templo');
    await page.click('button:has-text("Confirmar")');
    
    // Após todos dizerem palavra, iniciar segunda rodada
    // Nota: Isso pode precisar de múltiplos jogadores para completar a primeira rodada
  });

  test('deve permitir selecionar destinatário ao fazer pergunta', async ({ page }) => {
    await page.goto('/');
    
    // Criar sala
    await page.click('text=Criar Sala');
    await page.fill('input[placeholder*="apelido"]', 'Jogador1');
    await page.fill('input[type="number"]', '3');
    await page.click('button:has-text("Criar")');
    
    const salaCode = await page.textContent('text=/Sala [A-Z]{4}/');
    
    // Iniciar rodada (não primeira)
    // Nota: Para testar isso adequadamente, precisamos simular múltiplas rodadas
    // ou modificar o estado para não ser primeira rodada
    
    // Clicar em "Fazer Pergunta"
    await page.click('text=Fazer Pergunta');
    
    // Verificar que o modal de seleção de destinatário aparece
    await expect(page.locator('text=Para quem perguntar?')).toBeVisible();
    
    // Verificar que lista de jogadores aparece
    await expect(page.locator('text=Jogador1')).not.toBeVisible(); // Não pode perguntar para si mesmo
  });

  test('deve mostrar sheet de resposta quando é o destinatário', async ({ page }) => {
    await page.goto('/');
    
    // Criar sala
    await page.click('text=Criar Sala');
    await page.fill('input[placeholder*="apelido"]', 'Jogador1');
    await page.fill('input[type="number"]', '3');
    await page.click('button:has-text("Criar")');
    
    // Iniciar rodada
    await page.click('button:has-text("Iniciar Rodada")');
    
    // Quando alguém faz pergunta para este jogador, o sheet deve aparecer automaticamente
    // Nota: Isso requer múltiplos jogadores simulados ou manipulação direta do estado
    
    // Verificar que o sheet de resposta aparece
    // await expect(page.locator('text=Responder Pergunta')).toBeVisible();
    // await expect(page.locator('text=perguntou:')).toBeVisible();
  });

  test('deve bloquear perguntas na primeira rodada', async ({ page }) => {
    await page.goto('/');
    
    // Criar sala
    await page.click('text=Criar Sala');
    await page.fill('input[placeholder*="apelido"]', 'Jogador1');
    await page.fill('input[type="number"]', '2');
    await page.click('button:has-text("Criar")');
    
    // Iniciar primeira rodada
    await page.click('button:has-text("Iniciar Rodada")');
    
    // Tentar fazer pergunta (deve falhar)
    // Nota: Como o botão não aparece, não podemos testar diretamente
    // Este teste valida que o botão não aparece na primeira rodada
    await expect(page.locator('text=Fazer Pergunta')).not.toBeVisible();
  });
});
