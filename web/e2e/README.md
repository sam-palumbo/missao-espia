# Testes E2E com Playwright

Este diretório contém testes end-to-end para o Missão Espia usando Playwright.

## Instalação

Os testes já estão configurados. O Playwright foi instalado como devDependency.

## Executar os Testes

```bash
# Executar todos os testes
npm run test:e2e

# Executar com interface visual
npm run test:e2e:ui

# Executar em modo debug
npm run test:e2e:debug
```

## Testes Implementados

### primeira-rodada.spec.ts
- Verifica que o botão "Dizer Palavra" aparece na primeira rodada
- Verifica que é possível dizer uma única palavra
- Verifica que o botão "Fazer Pergunta" NÃO aparece na primeira rodada

### perguntas.spec.ts
- Verifica que o botão "Fazer Pergunta" aparece nas rodadas seguintes
- Verifica que é possível selecionar um destinatário ao fazer pergunta
- Verifica que o sheet de resposta aparece automaticamente quando é o destinatário
- Verifica que perguntas são bloqueadas na primeira rodada

### timer.spec.ts
- Verifica que o timer é calculado corretamente: 5 min + jogadores − espias
- Verifica que o timer é regressivo
- Verifica que a barra de progresso do timer é exibida

## Notas

Alguns testes podem precisar de ajustes dependendo do estado real do backend e da necessidade de múltiplos jogadores para completar cenários específicos.
