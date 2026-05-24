# Fim de Tempo — Fase de Adivinhação

**Data:** 2026-05-24  
**Status:** Aprovado

---

## Contexto

As regras dizem: "Se o tempo acabar, todos os espias se revelam e cada um tenta nomear o evento e o local individualmente."

O comportamento atual ignora essa regra: quando o timer expira, a rodada é encerrada silenciosamente na próxima ação de qualquer jogador com `espia_pego: false, espia_adivinhou: false`. Os espias nunca têm chance de adivinhar.

---

## Decisões de Design

| Decisão | Escolha |
|---|---|
| Quem detecta o fim do tempo | Frontend (quando cronômetro chega a 0, envia `encerrar_por_tempo`) |
| Múltiplos espias adivinham | Simultaneamente — todos dentro do mesmo timer de 30s |
| Limite de tempo para adivinhar | 30 segundos (novo timer após a transição de fase) |
| Quais espias participam | Todos os `espia_ids` da rodada, sem exceção |

---

## Modelo de Estado

### `FaseJogo` — novo valor

```typescript
type FaseJogo =
  | "jogando"
  | "aguardando_resposta"
  | "votacao"
  | "adivinhacao"
  | "adivinhacao_fim_tempo"   // novo
  | "resultado";
```

### `EstadoRodada` — novos campos opcionais

```typescript
interface EstadoRodada {
  // ... campos existentes ...
  timer_adivinhacao_end?: string;              // ISO — início dos 30s da fase
  adivinhacoes_fim_tempo?: Record<string, number | null>;
  // espia_id → evento_id enviado | null (ainda não enviou)
}
```

`adivinhacoes_fim_tempo` é inicializado com `{ [id]: null }` para cada `espia_id` na rodada. Espias eliminados durante o jogo também participam.

---

## Backend — Novos Handlers

### `encerrar_por_tempo`

- **Trigger:** cliente envia quando cronômetro principal chega a 0
- **Guard:** fase deve ser `"jogando"` — idempotente (se já `adivinhacao_fim_tempo`, retorna `{ ok: true }`)
- **Edge case:** se `espia_ids` vazio → encerra rodada diretamente com `espia_pego: false, espia_adivinhou: false`
- **Transição:**
  ```
  estado.fase = "adivinhacao_fim_tempo"
  estado.timer_adivinhacao_end = now + 30s
  estado.adivinhacoes_fim_tempo = { [espia_id]: null, ... }
  ```

### `adivinhar_fim_tempo`

- **Guard:** fase = `adivinhacao_fim_tempo`; caller é espia com entrada `null` em `adivinhacoes_fim_tempo`
- **Ação:** `adivinhacoes_fim_tempo[jogador_id] = evento_id`
- **Se todos enviaram:** finaliza imediatamente (chama `_finalizarAdivinhacaoFimTempo` internamente)
- **Senão:** retorna `{ aguardando: true }`

### `finalizar_adivinhacao_fim_tempo`

- **Trigger:** qualquer cliente quando o timer de 30s chega a zero
- **Guard:** fase = `adivinhacao_fim_tempo` — idempotente (se `rodada.encerrada_em` preenchido, retorna `{ ok: true }`)
- **Espias com `null`:** contam como "não adivinhou"
- **Delega a** `_finalizarAdivinhacaoFimTempo`

### `_finalizarAdivinhacaoFimTempo` (helper interno)

Pontuação **por espia** (independente):

| Resultado | Pontos |
|---|---|
| Acertou o evento | 3 pts (não pego + adivinhou) |
| Errou ou não enviou | 2 pts (não pego + não adivinhou) |

Grupo recebe 0 pts (nenhum espia foi pego).

Após computar:
1. `incrementar_pontuacao` para cada espia individualmente
2. `estado.fase = "resultado"`, `encerrada_em = now`
3. Atualiza status da sala: `status = "aguardando"` se há mais rodadas, `status = "encerrada"` se foi a última

### Limpeza dos lazy checks

`proximo-turno`, `dizer-palavra` e `responder-pergunta` atualmente chamam `encerrarRodada` diretamente quando detectam `timer_end` expirado. Esses checks devem ser substituídos por uma chamada interna à lógica de `encerrar_por_tempo` para que a fase de adivinhação seja respeitada.

---

## Frontend

### Trigger (`jogo/page.tsx`)

No hook `useTimer`, quando `secs` chega a 0 e `fase === "jogando"`, chamar:
```typescript
gameActions.encerrarPorTempo(rodada.id)
```

Múltiplos clientes disparam ao mesmo tempo — o backend é idempotente.

### Fase `adivinhacao_fim_tempo`

**Espias:**
- Sheet de adivinhação (igual ao existente para `adivinhacao`)
- Cronômetro de 30s a partir de `estado.timer_adivinhacao_end`
- Ao enviar: `gameActions.adivinharFimTempo(rodada.id, eventoId)`
- Quando timer chega a 0: `gameActions.finalizarAdivinhacaoFimTempo(rodada.id)`

**Não-espias e observadores:**
- Banner: "Os espias estão adivinhando…"
- Mesmo cronômetro de 30s
- Quando timer chega a 0: `gameActions.finalizarAdivinhacaoFimTempo(rodada.id)` (idempotente)

### `game-actions.ts` — 3 novas entradas

```typescript
encerrarPorTempo: (rodada_id: string) =>
  callGame("encerrar_por_tempo", { rodada_id }),

adivinharFimTempo: (rodada_id: string, evento_id: number) =>
  callGame("adivinhar_fim_tempo", { rodada_id, evento_id }),

finalizarAdivinhacaoFimTempo: (rodada_id: string) =>
  callGame("finalizar_adivinhacao_fim_tempo", { rodada_id }),
```

### `resultado/page.tsx`

Atualmente usa `estado.adivinhou_evento_id` (campo único). Para o caso fim de tempo, os resultados ficam em `estado.adivinhacoes_fim_tempo`. A página lê ambos para montar o badge por espia:

- Se `adivinhacoes_fim_tempo` presente: mostrar resultado individual de cada espia
- Caso contrário: comportamento atual (espia único pego em votação)

### `scripts/bots.mjs`

Detectar fase `adivinhacao_fim_tempo` e chamar `adivinhar_fim_tempo` se o bot for espia.

---

## Edge Cases

| Situação | Comportamento |
|---|---|
| Múltiplos clientes disparam `encerrar_por_tempo` | Idempotente: fase já `adivinhacao_fim_tempo` → retorna `{ ok: true }` |
| `finalizar_adivinhacao_fim_tempo` chamado múltiplas vezes | Guard em `rodada.encerrada_em` → retorna `{ ok: true }` |
| Espia envia `adivinhar_fim_tempo` após encerramento | `encerrada_em` preenchido → rejeitado |
| Espia tenta enviar duas vezes | `adivinhacoes_fim_tempo[id] !== null` → rejeitado |
| Último espia a submeter | `adivinhar_fim_tempo` detecta todos enviaram → finaliza sem esperar timer |
| `fazer_pergunta` / `responder_pergunta` em `adivinhacao_fim_tempo` | Fase não consta nas listas de fases permitidas → rejeitado com erro |
| `espia_ids` vazio | `encerrar_por_tempo` encerra diretamente sem abrir fase de adivinhação |

---

## Arquivos Afetados

**Backend (`supabase/functions/game/`):**
- `lib/types.ts` — novo valor em `FaseJogo`, novos campos em `EstadoRodada`
- `handlers/encerrar-por-tempo.ts` — novo
- `handlers/adivinhar-fim-tempo.ts` — novo
- `handlers/finalizar-adivinhacao-fim-tempo.ts` — novo
- `handlers/proximo-turno.ts` — substituir lazy check
- `handlers/dizer-palavra.ts` — substituir lazy check
- `handlers/responder-pergunta.ts` — substituir lazy check
- `index.ts` — registrar 3 novas actions

**Frontend (`web/src/`):**
- `lib/types.ts` — sincronizar com backend
- `lib/game-actions.ts` — 3 novas actions
- `app/sala/[code]/jogo/page.tsx` — trigger, nova fase UI
- `app/sala/[code]/resultado/page.tsx` — suporte a `adivinhacoes_fim_tempo`

**Scripts:**
- `scripts/bots.mjs` — detectar e participar da nova fase
