# Histórico em Tabs por Turno

## Contexto

Hoje o histórico da rodada (`estado.historico`) é exibido como uma lista scrollável única em `jogo/page.tsx`. À medida que a partida avança (muitas perguntas, votações), encontrar um momento específico exige rolar pela lista inteira.

## User Stories

| # | Persona | Quero | Para que |
|---|---------|-------|----------|
| 1 | Jogador | ver o histórico dividido em tabs, uma por turno completo | navegar rapidamente entre rodadas de perguntas sem rolar uma lista longa |
| 2 | Jogador | ver cada votação como uma tab própria | localizar acusações facilmente sem perder o contexto do turno onde ocorreram |
| 3 | Jogador | que a tab mais recente fique selecionada automaticamente | acompanhar o jogo em tempo real sem interação manual |

---

## Definições

- **Turno**: ciclo completo onde todos os jogadores ativos fizeram sua ação (perguntaram ou, em modo presencial, concluíram seu turno). Identificado por `turno_numero` nos itens do histórico.
- **Tab de Votação**: tab dedicada a um evento `HistoricoVotacao`, posicionada cronologicamente entre turnos.

---

## Requisitos Funcionais (formato EARS)

### RF-1 — Estrutura de tabs
- **WHEN** `estado.historico` tem pelo menos um item, **THEN** a área de histórico SHALL exibir uma barra de tabs no topo.
- **IF** `estado.historico` está vazio, **THEN** nenhuma barra de tabs SHALL ser renderizada (comportamento atual preservado).

### RF-2 — Agrupamento por turno
- **WHEN** múltiplos itens `HistoricoPergunta` ou `HistoricoTurnoPresencial` compartilham o mesmo `turno_numero`, **THEN** SHALL aparecer juntos em uma única tab rotulada "Turno N".
- **WHEN** um novo turno começa (primeiro item com `turno_numero` maior chega via Realtime), **THEN** uma nova tab SHALL ser criada.

### RF-3 — Tab de votação
- **WHEN** um item `HistoricoVotacao` está no histórico, **THEN** SHALL ter uma tab própria.
- A tab de votação SHALL ser posicionada na ordem cronológica em que o evento ocorreu (após o último turno concluído antes da votação).
- O rótulo SHALL ser "Votação" com ícone de espia.

### RF-4 — Seleção automática
- **WHEN** um novo item é adicionado ao histórico, **IF** o usuário já está na tab mais recente, **THEN** a tab mais recente SHALL permanecer selecionada.
- **WHEN** uma nova tab (novo turno ou votação) é criada, **THEN** a nova tab SHALL ser selecionada automaticamente.
- **IF** o usuário navegou para uma tab anterior, **THEN** a seleção NÃO deve ser alterada automaticamente (não forçar retorno).

### RF-5 — Conteúdo da tab
- Uma tab de turno SHALL exibir os mesmos componentes visuais do histórico atual (pergunta/resposta, turno presencial).
- Uma tab de votação SHALL exibir os mesmos componentes visuais da votação atual (lista de votos + resultado).

---

## Modelo de Dados — Mudança Necessária no Backend

### Problema
Para agrupar itens em "turnos" no frontend de forma confiável, precisamos saber a qual turno cada item pertence. Calcular isso no frontend (dividindo o total de itens por `ordem_turnos.length`) falha quando jogadores são eliminados durante uma turno — `ordem_turnos` muda e não temos snapshots históricos.

### Solução: campo `turno_numero` no histórico

Adicionar `turno_numero: number` a `HistoricoPergunta` e `HistoricoTurnoPresencial`.

`HistoricoVotacao` não precisa de `turno_numero` — é tratada como tab independente.

**Incremento:** o backend incrementa `turno_numero` quando o último jogador de `ordem_turnos` da turno atual faz sua ação. O próximo item de pergunta/turno_presencial recebe `turno_numero + 1`.

**Retrocompatibilidade:** itens sem `turno_numero` (dados existentes) são agrupados em "Turno 1" no frontend.

```ts
// types.ts — alterações
export interface HistoricoPergunta {
  tipo?: "pergunta";
  turno_numero: number;          // novo campo
  perguntador_apelido: string;
  destinatario_apelido: string;
  pergunta: string;
  resposta: string;
}

export interface HistoricoTurnoPresencial {
  tipo: "turno_presencial";
  turno_numero: number;          // novo campo
  jogador_apelido: string;
}
```

---

## Edge Cases

| Caso | Comportamento esperado |
|------|------------------------|
| Histórico vazio | Nenhuma tab; área oculta ou placeholder |
| Só uma turno | Uma única tab "Turno 1", sem barra de navegação aparente (ou barra com 1 item) |
| Turno atual incompleta (em andamento) | Tab da turno atual exibe os itens já registrados |
| Votação antes de qualquer pergunta | Tab "Votação" como primeira tab |
| Votação no meio de uma turno | Tab "Votação" intercalada na posição cronológica |
| Modo presencial | `turno_presencial` agrupados por `turno_numero` da mesma forma |
| Dados legados sem `turno_numero` | Todos os itens sem campo agrupados em "Turno 1" |

---

## Não-Requisitos (fora do escopo)

- Não há paginação nem lazy-loading de tabs (tudo carregado em memória como hoje)
- Não há deeplink por tab (sem parâmetro de URL)
- Não há histórico de rodadas anteriores (só a rodada atual)
