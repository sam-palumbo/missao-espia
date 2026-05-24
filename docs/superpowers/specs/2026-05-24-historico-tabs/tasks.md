# Tasks — Histórico em Tabs por Turno

## Grafo de Dependências

```
T1 (tipos backend) ──┬──► T2 (iniciar-rodada)
                      ├──► T3 (responder-pergunta)
                      ├──► T4 (proximo-turno)
                      └──► T5 (tipos frontend)
                                   │
                                   ▼
                             T6 (HistoricoTabs)
                                   │
                                   ▼
                             T7 (integração page.tsx + testes)
```

---

## Tasks

### T1 — Atualizar tipos backend
**Arquivo:** `supabase/functions/game/lib/types.ts`

- Adicionar `turno_numero: number` a `HistoricoPergunta`
- Adicionar `turno_numero: number` a `HistoricoTurnoPresencial`
- Adicionar `turno_numero_atual: number` a `EstadoRodada`

**Testes:** nenhum isolado — cobertura via T2/T3/T4.

---

### T2 — `iniciar-rodada`: inicializar `turno_numero_atual`
**Arquivo:** `supabase/functions/game/handlers/iniciar-rodada.ts`

- Ao montar o estado inicial da rodada, incluir `turno_numero_atual: 1`.

**Testes:** verificar que o estado retornado tem `turno_numero_atual === 1`.

---

### T3 — `responder-pergunta`: gravar `turno_numero` + incrementar
**Arquivo:** `supabase/functions/game/handlers/responder-pergunta.ts`

Ao construir o item do histórico:
```ts
const turnoNumero = estado.turno_numero_atual ?? 1;
const idx = estado.ordem_turnos.indexOf(estado.turno_atual);
const isUltimoDoCiclo = idx === estado.ordem_turnos.length - 1;

// item
{ turno_numero: turnoNumero, perguntador_apelido: ..., ... }

// novoEstado
{ ...estado, turno_numero_atual: isUltimoDoCiclo ? turnoNumero + 1 : turnoNumero, ... }
```

**Testes:**
- Jogador do meio do ciclo: item com `turno_numero: 1`, `turno_numero_atual` permanece `1`
- Último jogador do ciclo: item com `turno_numero: 1`, `turno_numero_atual` passa para `2`

---

### T4 — `proximo-turno`: gravar `turno_numero` + incrementar (presencial)
**Arquivo:** `supabase/functions/game/handlers/proximo-turno.ts`

Mesma lógica de T3, aplicada ao item `HistoricoTurnoPresencial` quando `modo === "presencial"`.

**Testes:**
- Modo presencial, meio do ciclo: item com `turno_numero: 1`, estado inalterado
- Modo presencial, último do ciclo: item com `turno_numero: 1`, `turno_numero_atual: 2`
- Modo online: nenhum item adicionado (comportamento atual preservado)

---

### T5 — Atualizar tipos frontend
**Arquivo:** `web/src/lib/types.ts`

Espelhar exatamente as mudanças de T1:
- `turno_numero: number` em `HistoricoPergunta` e `HistoricoTurnoPresencial`
- `turno_numero_atual: number` em `EstadoRodada`

**Testes:** TypeScript compilation sem erros (`tsc --noEmit`).

---

### T6 — Criar componente `HistoricoTabs`
**Arquivo:** `web/src/app/sala/[code]/jogo/historico-tabs.tsx`

Implementar:
1. Função pura `groupHistorico(historico): TabGroup[]` — agrupa por `turno_numero` (fallback `1`) e extrai votações como grupos próprios, preservando ordem cronológica
2. Componente React com barra de tabs + conteúdo da tab selecionada
3. Lógica de auto-avanço (RF-4): avança para nova tab só se o usuário estava na última

Visual:
- Container: mesmos estilos do card atual (`T.card`, `borderRadius: 18`, etc.)
- Barra de tabs: `overflow-x: auto`, sem scrollbar visível, gap entre tabs
- Tab ativa: `background: T.sienna`, texto branco
- Tab inativa: `background: T.cardWarm`, texto `T.inkSoft`
- Tab de votação: `MEIcon name="spy"` + "Votação"
- Tab de turno: "Turno N"

**Testes:** `web/src/__tests__/jogo-historico-tabs.test.tsx` — cobrir todos os casos da tabela em `design.md`.

---

### T7 — Integrar em `jogo/page.tsx` + remover bloco antigo
**Arquivo:** `web/src/app/sala/[code]/jogo/page.tsx`

- Importar `HistoricoTabs`
- Substituir o bloco `{/* Histórico - Infinite scroll frame */}` (linhas ~316–406) por:
  ```tsx
  <HistoricoTabs
    historico={rodada?.estado.historico ?? []}
    palavrasPrimeiraRodada={rodada?.estado.palavras_primeira_rodada ?? []}
    primeiraRodada={primeiraRodada}
  />
  ```
- Remover o código JSX do histórico que estava inline

**Testes:** Verificar que os testes existentes de histórico (`jogo-presencial-historico.test.tsx`, `jogo-historico-votacao.test.tsx`) continuam passando. Atualizar mocks/fixtures que precisem de `turno_numero`.

---

## Definition of Done

- [ ] T1–T4 completos: Edge Function compila sem erros e testes Deno passam
- [ ] T5 completo: frontend compila sem erros de tipo
- [ ] T6 completo: todos os casos de teste de `jogo-historico-tabs.test.tsx` passam
- [ ] T7 completo: testes existentes de histórico passam; UI manual confirma tabs funcionando
- [ ] Deploy da Edge Function no Supabase
