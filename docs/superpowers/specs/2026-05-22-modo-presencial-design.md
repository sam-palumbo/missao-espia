# Modo Presencial — Design

**Data:** 2026-05-22
**Status:** spec aprovado, aguardando plano de implementação

## Objetivo

Adicionar um modo de sala para jogadores que estão fisicamente juntos. Sem chat, sem digitação de perguntas/respostas/palavras. O app vira um árbitro: controla turnos, tempo, acusações, votações e adivinhação do espia. A interação verbal acontece em voz alta entre os jogadores, fora do app.

## Escopo

**Inclui:**
- Toggle no lobby (Online | Presencial), controlado pelo anfitrião.
- Tela de turno simplificada: "É sua vez" + botão `Concluí turno`.
- Histórico mínimo (apenas ordem de quem falou, sem texto).
- Reaproveitamento de todo o fluxo de acusação, votação, adivinhação, timer e tela de carta.

**Não inclui:**
- Variação no cálculo de pontos, regras de espia, número de espias.
- Modo "passa-passa" (um único dispositivo).

## Decisões de Design

- O modo é uma propriedade da sala (`salas.modo`), decidida pelo anfitrião antes de iniciar, e vale para todas as rodadas da partida.
- O backend é quase agnóstico ao modo. As ações de gameplay (`proximo-turno`, `acusar`, `votar`, `adivinhar`, `encerrar-rodada`) são reutilizadas sem ramificação significativa. Apenas:
  - `proximo-turno` anexa um item de histórico presencial quando a sala for presencial.
  - `fazer-pergunta` / `responder-pergunta` / `dizer-palavra` são bloqueadas no presencial (defesa de servidor).
- A votação de acusação acontece pelo app mesmo no presencial. Mesmo que as pessoas estejam juntas, manter o app como árbitro evita ambiguidades.
- A adivinhação do espia acontece pelo app (seleção da lista).
- Botão único `Concluí turno` no presencial (sem distinção entre "passar" e "fazer pergunta" — o jogador decide se vai falar em voz alta antes de tocar).

## Modelo de Dados

### Migração nova
`supabase/migrations/<timestamp>_modo_presencial.sql`

```sql
alter table public.salas
  add column modo text not null default 'online'
    check (modo in ('online', 'presencial'));
```

Salas existentes ficam `online` automaticamente (default). Sem backfill necessário.

### Tipos (`supabase/functions/game/lib/types.ts`)

```ts
export type ModoSala = "online" | "presencial";

export interface Sala {
  // ...campos existentes
  modo: ModoSala;
}

export interface CriarSalaPayload {
  apelido: string;
  num_rodadas: number;
  modo?: ModoSala;     // default "online"
  senha?: string;
}

export interface HistoricoTurnoPresencial {
  tipo: "turno_presencial";
  jogador_apelido: string;
}

export type HistoricoItem =
  | HistoricoPergunta
  | HistoricoVotacao
  | HistoricoTurnoPresencial;
```

## Backend

### Handlers modificados

**`criar-sala.ts`**
- Aceita `modo` no payload. Valida (`"online" | "presencial"`). Persiste em `salas.modo`.

**`proximo-turno.ts`**
- Lê `sala.modo`. Se presencial, anexa em `estado.historico` o item:
  ```ts
  { tipo: "turno_presencial", jogador_apelido: jogador.apelido }
  ```
- No resto, comportamento idêntico (avança turno, respeita jogadores eliminados, marca `primeira_rodada = false` quando todos jogaram).

**`fazer-pergunta.ts` / `responder-pergunta.ts` / `dizer-palavra.ts`**
- Se `sala.modo === "presencial"`: retornar erro `"Ação indisponível no modo presencial"`.

### Handlers inalterados
`entrar-sala`, `iniciar-rodada`, `acusar`, `votar`, `adivinhar`, `encerrar-rodada` — sem ramificação por modo.

### RLS
A policy de UPDATE em `salas` já restringe ao anfitrião. Validar e adicionar se faltar para o campo `modo`.

## Frontend — Lobby

**Arquivo:** `web/src/app/sala/[code]/lobby/page.tsx`

- Carrega `salas.modo` no `useEffect` inicial; sincroniza via realtime (subscription `sala-status` já existente).
- Anfitrião vê toggle segmentado `[ Online ] [ Presencial ]` próximo ao botão "Iniciar".
- Não-anfitriões veem rótulo de leitura "Modo: Presencial" / "Modo: Online".
- Texto explicativo abaixo do toggle quando presencial está ativo:
  > "Para jogo presencial. Cada jogador faz pergunta/responde em voz alta — o app só controla turnos, acusações e tempo."
- Handler `handleModoChange` atualiza `salas.modo` no Supabase.
- Toggle escondido após `status === "jogando"`.

Observação: bots (`scripts/bots.mjs`) são apenas um script de teste externo que conecta como jogador comum — o servidor não os diferencia. Cabe a quem rodar o script não usá-lo em salas presenciais; não há validação no app.

## Frontend — Jogo

**Arquivo:** `web/src/app/sala/[code]/jogo/page.tsx` + novo componente.

### Carregamento do modo
`useGameState` (ou hook auxiliar) expõe `modo: "online" | "presencial"`.

### Reuso integral (sem branch por modo)
- Cabeçalho, timer, lista de jogadores, destaque do turno.
- `RevealScreen` (carta inicial de espia ou evento+local).
- Telas de votação, adivinhação, resultado.

### Ramificação por modo — apenas na faixa de ação central

| Online (hoje) | Presencial (novo) |
|---|---|
| 1ª rodada: input "Diga uma palavra" + botão | Card "Diga uma palavra em voz alta" + `Concluí turno` |
| Rodadas seguintes: "Para quem perguntar?" + inputs | Card "Faça uma pergunta a alguém em voz alta" + `Concluí turno` |
| Histórico textual de perguntas/respostas | Lista linear de quem já falou (chips com avatar+apelido) |

### Componente novo
`web/src/app/sala/[code]/jogo/turno-presencial.tsx`

```ts
interface TurnoPresencialProps {
  isMinhaVez: boolean;
  jogadorAtualApelido: string;
  primeiraRodada: boolean;
  onConcluir: () => Promise<void>;
  acting: boolean;
}
```

- Se `isMinhaVez`: card grande "É sua vez" + texto contextual + botão `Concluí turno`.
- Caso contrário: card sutil "Vez de **{apelido}**".
- Botão chama `gameActions.proximoTurno(rodada.id)`.

### Histórico presencial
Novo bloco renderiza itens `tipo: "turno_presencial"` como chips com avatar + apelido, em ordem cronológica, sem texto. Itens de votação continuam aparecendo intercalados.

### Botões inalterados
"Acusar alguém" e "Adivinhar" (espia) continuam visíveis no turno do jogador, em ambos os modos.

### Botões escondidos no presencial
"Dizer Palavra", "Fazer Pergunta", "Passar" (textual), inputs de palavra/pergunta/resposta, sheet "Responder Pergunta".

## Edge Cases

- **Troca de modo após iniciar:** toggle só habilitado com `status === "aguardando"`.
- **Cliente desatualizado chama endpoint de texto em sala presencial:** handler retorna erro; UI mostra toast.
- **`proximo-turno` em sala online:** continua funcionando (já é usado pelo botão "Passar"); não anexa histórico presencial.
- **Jogador eliminado no presencial:** vira observador (regra já implementada em `2026-05-22-jogador-eliminado-observador.md`). Vê histórico + timer, sem botão `Concluí turno`. Pulado em `ordem_turnos`.
- **Timer e fim por tempo:** funcionam igual ao online.
- **Reconexão:** estado vem do servidor (rodada + histórico). Sem mudança.
- **Realtime:** subscription existente em `rodadas` cobre atualização de `estado.historico`.

## Plano de Testes

### Backend (Deno, `supabase/functions/game/**/*_test.ts`)

1. **`criar-sala_test.ts`**
   - `modo: "presencial"` persiste corretamente.
   - Sem `modo` → default `"online"`.
   - `modo` inválido → erro.

2. **`proximo-turno_test.ts`**
   - Sala presencial, 1ª rodada: anexa `historico_turno_presencial` + avança turno + marca `primeira_rodada = false` quando todos jogaram.
   - Sala presencial, rodada normal: anexa item presencial + avança turno.
   - Sala online: histórico NÃO recebe item presencial (regressão).
   - Jogador eliminado é pulado em `ordem_turnos`.

3. **`fazer-pergunta_test.ts` / `responder-pergunta_test.ts` / `dizer-palavra_test.ts`**
   - Sala presencial → erro `"Ação indisponível no modo presencial"`.
   - Sala online → comportamento preservado.

4. **`acusar_test.ts` + `votar_test.ts` + `adivinhar_test.ts`**
   - Sala presencial → mesma mecânica do online (regressão).

### Frontend (Vitest + Testing Library, `web/src/__tests__/*.test.tsx`)

5. **`lobby-modo-toggle.test.tsx`**
   - Anfitrião vê toggle; clicar em "Presencial" chama update.
   - Não-anfitrião vê rótulo de leitura.
   - Toggle escondido após `status === "jogando"`.

6. **`jogo-presencial-turno.test.tsx`**
   - Sala presencial, vez do jogador, 1ª rodada → "Diga uma palavra em voz alta" + `Concluí turno`.
   - Sala presencial, vez do jogador, rodada normal → "Faça uma pergunta..." + `Concluí turno`.
   - Tocar `Concluí turno` chama `gameActions.proximoTurno`.
   - Vez de outro → "Vez de {apelido}", sem botões de ação.
   - Inputs de pergunta/palavra/resposta NÃO renderizam.

7. **`jogo-presencial-historico.test.tsx`**
   - Histórico mostra chips com avatar+apelido em ordem.
   - Histórico de votação aparece intercalado.

8. **`jogo-presencial-acusacao.test.tsx`**
   - Acusação + votação funcionam igual ao online (regressão).
   - Adivinhação do espia funciona igual (regressão).

### Ordem TDD de implementação
1. Migração + tipos.
2. Backend handlers (testes #1–4) — RED → GREEN um por vez.
3. Lobby toggle (teste #5).
4. Componente `<TurnoPresencial />` + integração (testes #6–7).
5. Verificação de regressão online (teste #8).
