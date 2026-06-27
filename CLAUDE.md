# Missão Espia

## O que é este projeto

Missão Espia é um jogo de dedução social com temática bíblica para 4 a 12 jogadores. Em cada rodada, todos os jogadores recebem a mesma carta de evento + local — exceto um (ou mais), o espia, que recebe uma carta em branco e precisa descobrir onde está sem se trair.

**Inspiração:** Spyfall (Alexandr Ushan, 2014) — mesma mecânica central de dedução por perguntas e respostas, adaptada para eventos e locais da Bíblia.

---

## Arquivos do Projeto

| Arquivo | Conteúdo |
|---|---|
| `lista_eventos_locais.md` | Lista definitiva de 32 eventos + locais, dividida em Antigo e Novo Testamento, com seção de Reserva |
| `regras.md` | Regras completas do jogo |
| `CLAUDE.md` | Este arquivo — contexto e convenções do projeto |

---

## Convenções da Lista de Eventos

- **Substantivos** sempre com letra maiúscula — ex: "Queda das Muralhas de Jericó"
- **Verbos** sempre com letra minúscula — ex: "Davi derrota Golias", "Samuel ouve a Voz de Deus"
- **Artigos, preposições e conjunções** com letra minúscula — ex: "Jacó luta com o Anjo"
- Evento e local são um par público e inseparável — quem sabe um sabe o outro
- Locais devem ser **concretos e visuais**, fáceis de imaginar — evitar locais genéricos ou abstratos demais

---

## Decisões de Design Tomadas

- **Locais similares são um problema:** montes, desertos, jardins, túmulos parecidos facilitam o espia. Ao adicionar eventos, verificar se o local já existe na lista.
- **Eventos removidos vão para a Reserva**, nunca são apagados — a Reserva serve para futuras expansões ou substituições.
- **Ordem cronológica** dentro de cada testamento.
- **A Reserva** é organizada em tabela separada por Antigo e Novo Testamento.

---

## Glossário

- **Rodada** (`rodada`): uma partida completa dentro de uma sessão de jogo — inclui fase de palavras, fase de perguntas, e encerramento. Uma sessão tem N rodadas (configurável). Cada rodada tem um evento sorteado, um(ou mais) espia(s) diferente(s), e um timer próprio. No banco, corresponde a uma linha na tabela `rodadas`.

- **Turno** (`turno`): a vez de um jogador específico dentro de uma rodada. Em cada turno, o jogador faz uma pergunta (ou diz uma palavra, na primeira volta). O campo `turno_atual` indica quem está no turno; `turno_numero_atual` indica em qual volta do ciclo estamos (1 = todos ainda não agiram uma vez, 2 = segunda volta, etc.). Acusar só é permitido a partir do turno 2 (segunda volta do ciclo).

---

## Mecânica Principal (resumo)

1. Um evento é sorteado. Todos recebem a carta com evento + local, exceto o(s) espia(s).
2. Em turnos, cada jogador faz uma pergunta a outro. Na primeira rodada, respostas são de uma palavra.
3. O espia pode a qualquer momento tentar adivinhar o evento+local — acertou, vence; errou, é eliminado.
4. O grupo pode acusar um jogador por votação (maioria simples; acusado não vota).
5. Eliminações erradas são toleradas até o limite igual ao número de espias (exceto com 4 jogadores).
6. Tempo: 5 min + número de jogadores − número de espias.

---

## Pontuação (resumo)

| Resultado do espia | Pontos |
|---|---|
| Pego e não adivinha | 0 |
| Pego e adivinha | 1 |
| Não pego e não adivinha | 2 |
| Não pego e adivinha | 3 |

Grupo vence: 1 ponto por membro ativo (eliminados não pontuam).

---

## Arquitetura & Verificação

O projeto tem dois alvos, testados em diretórios distintos:

- **Web (Next 16):** rode de `web/` — `npx vitest run`, `npx tsc --noEmit`, `npx next build`.
- **Edge (Deno):** rode de `supabase/functions/game/` — `deno test --allow-all`, `deno check lib/<arquivo>.ts`.

> **Gotcha:** o diretório de trabalho do Bash reseta para a raiz do repo entre turnos. Rodar `npx tsc`/`npx vitest` da raiz falha de forma enganosa — sempre prefixe com o `cd` absoluto correto.

**Fonte única das regras:** lógica de jogo mora em `@shared/*` (= `supabase/functions/game/lib/*`, via path alias no tsconfig do web): `numEspias`/`limiteEliminacoesErradas` em `@shared/espias`, `calcularMinutosRodada` em `@shared/utils`, `calcularPontuacao` em `@shared/pontuacao`, `EVENTOS` em `@shared/eventos`. Ao mexer em regra, edite só o `@shared` — o web reexporta de lá.

## Deploy

- **Edge function (manual, sem CI):** `supabase functions deploy game --project-ref eochshqchhcxnpadlrir`. **Não há** `.github/workflows` — `git push` **não** deploya nada. Confira a versão deployada com `supabase functions list` (colunas VERSION/UPDATED_AT).
- **Web:** Vercel (`https://missao-espia.vercel.app`).
- **Config do Supabase:** `supabase config push` envia o **`config.toml` inteiro** (não só a seção editada) e não tem `--dry-run` — revise o diff COMPLETO que ele imprime antes de confirmar, para não clobrar settings remotos. (`functions deploy` só sobe o código da função, sem esse risco.)

## Bots / IA

Os bots decidem em três degraus, em `supabase/functions/game/handlers/bot-agir.ts`:

```
(await xIA(ctx)) ?? xHeuristica(ctx) ?? <sorteio aleatório>
```

- **IA (`lib/bot-ia.ts`):** chama uma API compatível com OpenAI. Provedor/modelo/chave parametrizados por env (`IA_PROVIDER`/`IA_API_KEY`/`IA_MODEL`/`IA_API_URL`; presets groq/nvidia/openai). Default de código: Groq `llama-3.3-70b-versatile`; produção pode sobrescrever via secret.
- **Heurística (`lib/bot-heuristica.ts` + `lib/bot-lexico.ts`):** decisão **offline** por casamento de palavras-chave contra um léxico por evento. Espelha as assinaturas da IA (inclui `{confianca}`), então os mesmos limiares de `bot-agir` valem para ambas.
- **Sorteio (`lib/bot.ts`):** pools fixos, último recurso.

> **Gotcha ao auditar transcrições:** a heurística e o sorteio foram feitos para "soar engajados". A IA (Groq free) é gargalada por rate limit — sob carga retorna HTTP 429 e a decisão cai para a heurística/sorteio. Sintoma: "bots genéricos". Suspeite de 429 **antes** de culpar o prompt. Respostas da heurística usam moldes fixos (`MOLDES_RESPOSTA`), ex.: *"Dava pra notar ___ sem esforço."* + termo do léxico — on-theme, mas sem acompanhar a pergunta.
>
> A NVIDIA DeepSeek hospedada foi testada e descartada: 20–60s por chamada (acima do timeout de 20s) joga tudo no fallback. Ficamos no Groq.

**Testar end-to-end:** `node scripts/test-bots.mjs` roda um jogo completo (host + 3 bots) contra o backend deployado e imprime a transcrição. Ele dispara a cada 150ms (rajada = pior caso para o 429), então exagera o fallback vs. um jogo em ritmo humano.

---

## Regras de Uso

- **Sempre pedir autorização** antes de executar `git commit` ou `git push`. Nunca executar esses comandos sem confirmação explícita do usuário.
