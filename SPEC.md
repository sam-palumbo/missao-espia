# Missão Espia — Specification

Social deduction game with a biblical theme for 4–12 players. Web-based adaptation of *Spyfall* (Alexandr Ushan, 2014). Mobile-first SPA built with Next.js (App Router), hosted on Vercel, backed by Supabase (PostgreSQL, Auth, Realtime, Edge Functions).

---

## Table of Contents

1. [Game Rules](#1-game-rules)
2. [Events](#2-events)
3. [Tech Stack](#3-tech-stack)
4. [Architecture](#4-architecture)
5. [Database Schema](#5-database-schema)
6. [Edge Function API](#6-edge-function-api)
7. [Round State Shape](#7-round-state-shape)
8. [UI Routes](#8-ui-routes)
9. [Real-Time Subscriptions](#9-real-time-subscriptions)
10. [Scoring](#10-scoring)
11. [Victory Conditions](#11-victory-conditions)
12. [Testing](#12-testing)
13. [Setup & Deployment](#13-setup--deployment)

---

## 1. Game Rules

### Player & Spy Count

| Players | Spies |
|---------|-------|
| 4–6     | 1     |
| 7–9     | 2     |
| 10–12   | 3     |

Multiple spies **do not know each other**. Each plays independently and may accidentally accuse another spy.

### Timer

```
5 minutes + number_of_players - number_of_spies
```

Examples: 4 players + 1 spy = 8 min; 7 players + 2 spies = 10 min; 12 players + 3 spies = 14 min.

### Round Flow

1. **Deal cards** — All players receive the same event+location card. Spies receive a blank card ("You are the Spy").
2. **First round** — No questions. Each player says **one word** related to the event (online mode) or just advances turns (presencial mode).
3. **Subsequent rounds** — Players take turns asking questions to each other. Answers are free-form but must be given (no passing).
4. **Accusation** — At the start of your turn (before asking), you may accuse a player. Max 1 accusation per turn per player.
5. **Voting** — Accused does not vote. Others vote simultaneously (👍/👎). Simple majority (> half of voters) eliminates.
6. **Spy guess** — At any moment, a spy can attempt to name the event+location. Correct = spy wins. Wrong = spy eliminated (0 pts).
7. **Round ends** — All spies identified, spy guesses correctly, time expires, or wrong eliminations exceed limit.

### Wrong Elimination Tolerance

| Players | Spies | Wrong eliminations tolerated |
|---------|-------|------------------------------|
| 4       | 1     | 0 (any error ends game)      |
| 5–6     | 1     | 1                            |
| 7–9     | 2     | 2                            |
| 10–12   | 3     | 3                            |

### Eliminated Player

- Sees a banner: "You have been eliminated — observe only"
- All action buttons hidden (accuse, question, guess)
- Voting overlay shows observer message instead of vote buttons
- Removed from `ordem_turnos` — game never waits for them
- Displayed grayed out with struck-through name in player grid
- Scores 0 at round end

---

## 2. Events

32 biblical events (19 OT + 13 NT). Event and location are always paired — knowing one means knowing the other.

### Old Testament

| # | Event                   | Location                |
|---|-------------------------|-------------------------|
| 1 | Criação                 | Jardim do Éden          |
| 2 | Dilúvio                 | Arca de Noé             |
| 3 | Confusão das Línguas    | Torre de Babel          |
| 4 | Destruição de Sodoma    | Casa de Ló              |
| 5 | Jacó luta com o Anjo    | Rio Jaboque             |
| 6 | José e os Sonhos        | Palácio do Faraó        |
| 7 | Êxodo                   | Mar Vermelho            |
| 8 | Moisés recebe a Lei     | Monte Sinai             |
| 9 | Bezerro de Ouro         | Deserto do Sinai        |
| 10 | Dia da Expiação         | Diante do Véu           |
| 11 | Queda de Jericó         | Ao Redor das Muralhas   |
| 12 | Sansão derruba o Templo | Templo de Dagom         |
| 13 | Samuel ouve a Voz       | Quarto em Siló          |
| 14 | Davi e Golias           | Vale de Elá             |
| 15 | Rainha de Sabá          | Palácio de Salomão      |
| 16 | Elias e os Profetas     | Carmelo                 |
| 17 | Jonas e o Peixe         | Ventre do Peixe         |
| 18 | Cativeiro da Babilônia  | Fornalha Ardente        |
| 19 | Daniel na Cova          | Cova dos Leões          |

### New Testament

| # | Event                       | Location                  |
|---|-----------------------------|---------------------------|
| 20 | Nascimento de Jesus         | Manjedoura                |
| 21 | Água em Vinho               | Caná da Galileia          |
| 22 | Jesus e a Samaritana        | Poço de Jacó              |
| 23 | Multiplicação dos Pães      | Margens do Mar da Galileia |
| 24 | Zaqueu                      | Em Cima da Árvore         |
| 25 | Última Ceia                 | Cenáculo                  |
| 26 | Crucificação                | Gólgota                   |
| 27 | Ressurreição                | Tumba Vazia               |
| 28 | Pentecostes                 | Ruas de Jerusalém         |
| 29 | Conversão de Paulo          | Caminho de Damasco        |
| 30 | Paulo e Silas na Prisão     | Cela em Filipos           |
| 31 | Paulo em Atenas             | Areópago de Atenas        |
| 32 | Visão do Apocalipse         | Ilha de Patmos            |

### Reserve Events (12 OT + 12 NT)

Available as replacements: Abraão e Isaque, Caim e Abel, Ester, Ossos Secos, Sarça Ardente, Três Anjos, Davi e Bate-Seba, Templo de Salomão, Gedeão, Rute e Noemi, Travessia do Jordão, Unção de Davi (OT) + Batismo de Jesus, Tentação, Getsêmani, Lázaro, Sermão do Monte, Anunciação, Transfiguração, Entrada Triunfal, Jesus diante de Pilatos, Cura do Paralítico, Ascensão, Naufrágio de Paulo (NT).

---

## 3. Tech Stack

| Category          | Technology                         |
|-------------------|------------------------------------|
| Framework         | Next.js 16.2.6 (App Router, SPA)   |
| Language          | TypeScript 5 (strict)              |
| Styling           | Tailwind CSS v4 + PostCSS          |
| UI Components     | Custom system (parchment-themed)   |
| Animation         | Motion (Framer) 12.40              |
| Notifications     | Sonner 2.0.7                       |
| Icons             | Lucide React + custom SVGs         |
| Class Utils       | clsx + tailwind-merge              |
| Backend DB        | Supabase (PostgreSQL)              |
| Backend Auth      | Supabase Auth (anonymous + Google) |
| Backend Realtime  | Supabase Realtime (WebSocket)      |
| Backend Logic     | Supabase Edge Functions (Deno 2)   |
| Voice Chat        | LiveKit Cloud (planned)            |
| Hosting           | Vercel                             |
| Unit Tests        | Vitest 4 + React Testing Library   |
| Backend Tests     | Deno test (built-in)               |
| E2E Tests         | Playwright 1.60                    |
| Package Manager   | npm                                |

---

## 4. Architecture

### Principle

Server-authoritative game logic. All state mutations pass through a single Supabase Edge Function (`game`). Clients read from the database via Supabase Realtime (WebSocket) with a 3-second polling fallback.

### Folder Structure

```
Missao_Espia/
├── supabase/
│   ├── functions/game/       # Edge Function (Deno)
│   │   ├── index.ts          # Action router
│   │   ├── handlers/         # 12 action handlers
│   │   └── lib/              # Shared types, DB client, helpers
│   └── migrations/           # 7 SQL migrations
├── web/                      # Next.js frontend
│   └── src/
│       ├── app/              # Pages (7 routes)
│       ├── components/       # AuthProvider, UI kit
│       ├── hooks/            # useAuth, usePlayers, useGameState, useChat
│       └── lib/              # Supabase client, game-actions, types, eventos
├── scripts/
│   └── bots.mjs              # Bot testing script
├── docs/superpowers/
│   ├── plans/                # Implementation plans
│   └── specs/                # Design specs
└── *.md                      # Rules, scope, stack, setup
```

### Edge Function Architecture

Single Edge Function (`/functions/v1/game`) with action-based routing. All requests are POST with `{ action, payload }` and require a valid Supabase auth JWT.

- **Auth**: Extracts user from JWT, authenticates via Supabase service role
- **Routing**: Dispatches to the correct handler based on `action` field
- **Persistence**: All handlers use the service role key (bypasses RLS) for writes
- **Response**: Returns `{ data }` or `{ error }` with CORS headers

### Frontend Architecture

- **Auth**: Anonymous sign-in by default. Google OAuth for account linking.
- **State**: React hooks subscribe to Supabase Realtime channels for `jogadores`, `rodadas`, and `mensagens`.
- **API Client**: `gameActions` object in `lib/game-actions.ts` — typed wrapper around `fetch` to the Edge Function.
- **Styling**: Custom design system (`design.tsx`) with ParchmentBg, InsetFrame, MEMedallion, BottomSheet, and reusable Button/Input components.

---

## 5. Database Schema

### Tables

#### `salas` (Rooms)

| Column         | Type        | Constraints                  |
|----------------|-------------|------------------------------|
| id             | UUID        | PK                           |
| codigo         | TEXT        | UNIQUE NOT NULL              |
| anfitriao      | UUID        | FK → auth.users              |
| status         | TEXT        | NOT NULL DEFAULT 'aguardando', CHECK(IN ('aguardando','jogando','encerrada')) |
| modo           | TEXT        | NOT NULL DEFAULT 'online', CHECK(IN ('online','presencial')) |
| num_rodadas    | INT         | NOT NULL CHECK(>= 1)         |
| rodada_atual   | INT         | NOT NULL DEFAULT 0           |
| senha_hash     | TEXT        | nullable                     |
| criada_em      | TIMESTAMPTZ | NOT NULL DEFAULT now()       |

#### `jogadores` (Players)

| Column    | Type        | Constraints                          |
|-----------|-------------|--------------------------------------|
| id        | UUID        | PK                                   |
| sala_id   | UUID        | NOT NULL FK → salas ON DELETE CASCADE |
| user_id   | UUID        | FK → auth.users ON DELETE SET NULL   |
| apelido   | TEXT        | NOT NULL                             |
| pontuacao | INT         | NOT NULL DEFAULT 0                   |
| ativo     | BOOLEAN     | NOT NULL DEFAULT true                |
| conectado | BOOLEAN     | NOT NULL DEFAULT true                |
| entrou_em | TIMESTAMPTZ | NOT NULL DEFAULT now()               |

#### `rodadas` (Rounds)

| Column       | Type        | Constraints                          |
|--------------|-------------|--------------------------------------|
| id           | UUID        | PK                                   |
| sala_id      | UUID        | NOT NULL FK → salas ON DELETE CASCADE |
| numero       | INT         | NOT NULL                             |
| evento_id    | INT         | NOT NULL                             |
| estado       | JSONB       | NOT NULL DEFAULT '{}'                |
| iniciada_em  | TIMESTAMPTZ | NOT NULL DEFAULT now()               |
| encerrada_em | TIMESTAMPTZ | nullable                             |
| UNIQUE       | (sala_id, numero) |                              |

#### `votos` (Votes)

| Column     | Type        | Constraints                          |
|------------|-------------|--------------------------------------|
| id         | UUID        | PK                                   |
| rodada_id  | UUID        | NOT NULL FK → rodadas ON DELETE CASCADE |
| votante_id | UUID        | NOT NULL FK → jogadores ON DELETE CASCADE |
| acusado_id | UUID        | NOT NULL FK → jogadores ON DELETE CASCADE |
| aprovado   | BOOLEAN     | NOT NULL                             |
| criado_em  | TIMESTAMPTZ | NOT NULL DEFAULT now()               |
| UNIQUE     | (rodada_id, votante_id, acusado_id) |       |

#### `mensagens` (Chat)

| Column     | Type        | Constraints                          |
|------------|-------------|--------------------------------------|
| id         | UUID        | PK                                   |
| sala_id    | UUID        | NOT NULL FK → salas ON DELETE CASCADE |
| jogador_id | UUID        | NOT NULL FK → jogadores ON DELETE CASCADE |
| apelido    | TEXT        | NOT NULL                             |
| texto      | TEXT        | NOT NULL (1–200 chars)               |
| criada_em  | TIMESTAMPTZ | NOT NULL DEFAULT now()               |

### RPC Functions

- `incrementar_pontuacao(jogador_id UUID, delta INT)` — Atomically updates a player's score. Used by `encerrar-rodada`.

### Row-Level Security

- All tables have RLS enabled.
- SELECT policies use `get_user_sala_ids()` (security definer function) to check room membership without recursion.
- WRITE is blocked for client-side requests — only the Edge Function (service role key) can write.
- `mensagens` has an INSERT policy allowing room members to post messages.

---

## 6. Edge Function API

Single endpoint: `POST /functions/v1/game`

All requests require `Authorization: Bearer <Supabase JWT>` header and `Content-Type: application/json`.

Request body: `{ action: string, payload: object }`

### Actions

| Action              | Handler              | Description                                           |
|---------------------|----------------------|-------------------------------------------------------|
| `criar_sala`        | criar-sala.ts        | Generate 4-letter code, hash optional password, create room + host player |
| `entrar_sala`       | entrar-sala.ts       | Validate code + password, insert player or reconnect  |
| `definir_modo`      | definir-modo.ts      | Host toggles online ↔ presencial (before game starts) |
| `iniciar_rodada`    | iniciar-rodada.ts    | Pick unused event, assign spies, shuffle turn order, start timer |
| `proximo_turno`     | proximo-turno.ts     | Advance turn (presencial mode only)                   |
| `dizer_palavra`     | dizer-palavra.ts     | Record first-round word, advance turn (online mode)   |
| `fazer_pergunta`    | fazer-pergunta.ts    | Record question, set phase to `aguardando_resposta`   |
| `responder_pergunta`| responder-pergunta.ts| Record answer, log to history, advance turn           |
| `acusar`            | acusar.ts            | Open voting phase                                     |
| `votar`             | votar.ts             | Register vote, resolve when all eligible have voted   |
| `adivinhar`         | adivinhar.ts         | Spy submits guess, resolve round immediately          |
| `encerrar_rodada`   | encerrar-rodada.ts   | Calculate scores, advance to next round or end game   |

### Payloads (TypeScript)

```typescript
interface CriarSalaPayload   { apelido: string; num_rodadas: number; modo?: ModoSala; senha?: string }
interface EntrarSalaPayload  { codigo: string; apelido: string; senha?: string }
interface DefinirModoPayload { sala_id: string; modo: ModoSala }
interface IniciarRodadaPayload { sala_id: string }
interface ProximoTurnoPayload  { rodada_id: string }
interface DizerPalavraPayload  { rodada_id: string; palavra: string }
interface FazerPerguntaPayload { rodada_id: string; destinatario_id: string; texto: string }
interface ResponderPerguntaPayload { rodada_id: string; resposta: string }
interface AcusarPayload   { rodada_id: string; acusado_id: string }
interface VotarPayload    { rodada_id: string; aprovado: boolean }
interface AdivinharPayload { rodada_id: string; evento_id: number }
```

---

## 7. Round State Shape

Stored as JSONB in `rodadas.estado`.

```typescript
interface EstadoRodada {
  fase: "jogando" | "aguardando_resposta" | "votacao" | "adivinhacao" | "resultado";
  turno_atual: string;           // jogador_id of current turn
  ordem_turnos: string[];        // ordered list of jogador_id
  espia_ids: string[];           // spy player IDs
  timer_end: string;             // ISO 8601 timestamp
  eliminacoes_erradas: number;
  acusado_id: string | null;
  acusou_neste_turno: boolean;
  adivinhou_evento_id: number | null;
  pergunta_atual: {
    perguntador_id: string;
    perguntador_apelido: string;
    destinatario_id: string;
    destinatario_apelido: string;
    texto: string;
  } | null;
  historico: HistoricoItem[];
  primeira_rodada: boolean;
  palavras_primeira_rodada: {
    jogador_id: string;
    apelido: string;
    palavra: string;
  }[];
}

type HistoricoItem =
  | { tipo?: "pergunta"; perguntador_apelido: string; destinatario_apelido: string; pergunta: string; resposta: string }
  | { tipo: "votacao"; acusado_apelido: string; votos: { votante_apelido: string; aprovado: boolean }[]; resultado: "eliminado" | "sobreviveu" | "espia_pego" }
  | { tipo: "turno_presencial"; jogador_apelido: string };
```

---

## 8. UI Routes

| Route                  | Page            | Description                        |
|------------------------|-----------------|------------------------------------|
| `/`                    | Home            | Login / Enter as Guest             |
| `/criar`               | Create Room     | Select scriptures, rounds, password|
| `/entrar`              | Enter Room      | 4-letter code + nickname + password|
| `/sala/[code]/lobby`   | Lobby           | Waiting room, player list, mode toggle, start |
| `/sala/[code]/jogo`    | Gameplay        | Card, timer, players, history, voting, actions |
| `/sala/[code]/resultado` | Round Result  | Victory banner, spy reveal, scores  |
| `/sala/[code]/placar`  | Final Scoreboard| Ranking, new game / end buttons    |

---

## 9. Real-Time Subscriptions

| Channel              | Table       | Purpose                        |
|----------------------|-------------|--------------------------------|
| `sala:<codigo>`      | `salas`     | Room status changes            |
| `rodada:<sala_id>`   | `rodadas`   | Round state (fase, turno, timer, votes) |
| `players:<sala_id>`  | `jogadores` | Player list (join, leave, reconnection) |
| `chat:<sala_id>`     | `mensagens` | In-game chat messages          |

Clients subscribe via Supabase Realtime (WebSocket). A 3-second polling fallback is used for reliability.

---

## 10. Scoring

Calculated per round by `calcularPontuacao()` in `lib/pontuacao.ts`.

| Spy caught? | Spy guessed? | Spy points | Group points (per active member) |
|-------------|--------------|------------|----------------------------------|
| No          | Yes          | 3          | 0                                |
| No          | No           | 2          | 0                                |
| Yes         | Yes          | 1          | 0                                |
| Yes         | No           | 0          | 1                                |

- Eliminated players score 0.
- Group points are awarded to each active (non-eliminated) group member when all spies are caught.
- A guess is valid when naming either the event or the location (they are always paired).

---

## 11. Victory Conditions

| Condition                                              | Winner          |
|--------------------------------------------------------|-----------------|
| All spies identified, none guessed correctly           | Group           |
| Spy guesses correctly at any point                     | That spy        |
| Time expires with at least one spy alive               | All spies       |
| Wrong eliminations exceed limit                        | All spies       |
| Spy is eliminated but has a partner still alive        | Game continues  |

---

## 12. Testing

### Frontend (Vitest + React Testing Library)

13 test files in `web/src/__tests__/`, plus a shared helpers module:

| File | Tests |
|------|-------|
| `helpers.ts` | Shared mock objects (`motionMock`, `designMock`, `gameActionsMock`) and fixture builders (`makePlayer`, `makeRodada`, `makeSupabaseMock`) — not a test file, imported by all test files |
| `jogo-acusar.test.tsx` | Accusation button visibility, disabled states, first-turn block, eliminated block |
| `jogo-carta.test.tsx` | Card reveal for spy vs normal player |
| `jogo-eliminado.test.tsx` | Eliminated banner, hidden action buttons, observer vote message |
| `jogo-historico-votacao.test.tsx` | Voting history panel |
| `jogo-presencial-historico.test.tsx` | Presencial turn history |
| `jogo-presencial-turno.test.tsx` | Presencial turn indicator |
| `jogo-responder.test.tsx` | Answer sheet appearance, input |
| `jogo-turno-modal.test.tsx` | My card modal, turn-based button visibility |
| `jogo-votacao.test.tsx` | Vote overlay for non-accused vs accused |
| `lobby-modo-toggle.test.tsx` | Mode toggle for host vs non-host |
| `placar.test.tsx` | Final scoreboard: ranking order, rank symbols, navigation buttons |
| `resultado.test.tsx` | Victory banner, spy reveal, location reveal, score badges, navigation buttons |

### Backend (Deno test)

5 test files in `supabase/functions/game/lib/`:

| File | Tests |
|------|-------|
| `entrar-sala_test.ts` | Code/nickname/password validation |
| `espias_test.ts` | `numEspias()`, `limiteEliminacoesErradas()` |
| `pontuacao_test.ts` | `calcularPontuacao()` all 4 scenarios |
| `votacao_test.ts` | `resolverVotacao()`, `validarVoto()`, `classificarResultadoVotacao()` |
| `modo_test.ts` | `validarTrocaModo()` |

### E2E (Playwright)

2 test files in `web/e2e/`:

| File | Tests |
|------|-------|
| `criar.spec.ts` | Create room form flow |
| `entrar-codigo.spec.ts` | Enter room 4-letter code input |

### Bot Script

`scripts/bots.mjs` — Node.js script that creates automated bot players for testing. Joins room, passes turns, accuses, and votes automatically.

Usage: `node scripts/bots.mjs <ROOM_CODE> <NUM_BOTS>`

---

## 13. Setup & Deployment

### Prerequisites

- Node.js 20+
- Supabase CLI (`brew install supabase/tap/supabase`)
- Supabase project

### Local Setup

1. Clone repo, run `npm install` in `web/`
2. Create `web/.env.local` with `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY`
3. `supabase login && supabase link --project-ref <ref>`
4. `supabase db push --linked` (applies 7 migrations)
5. Enable Anonymous Sign-ins in Supabase dashboard
6. Run `alter publication supabase_realtime add table jogadores, rodadas, salas;` in SQL Editor
7. `supabase functions deploy game`
8. `npm run dev` in `web/`

### Vercel Deploy

```bash
cd web
npx vercel link --yes
npx vercel env add NEXT_PUBLIC_SUPABASE_URL production
npx vercel env add NEXT_PUBLIC_SUPABASE_ANON_KEY production
npx vercel --prod --yes
```

### Migrations (applied in order)

| Migration | Description |
|-----------|-------------|
| `20260521000000_schema_inicial.sql` | Creates `salas`, `jogadores`, `rodadas`, `votos` + RLS |
| `20260521000001_rpc_pontuacao.sql` | `incrementar_pontuacao()` RPC |
| `20260521000002_rls_policies.sql` | Read policies for all tables |
| `20260521000003_fix_rls_recursion.sql` | Fix infinite RLS recursion with `get_user_sala_ids()` |
| `20260521000004_mensagens_chat.sql` | `mensagens` table |
| `20260522000005_fix_votos_unique.sql` | Fix votes unique constraint |
| `20260522000006_modo_presencial.sql` | `modo` column on `salas` |

### Known Issues & Solutions

| Issue | Cause | Solution |
|-------|-------|----------|
| `POST /auth/v1/signup 422` | Anonymous sign-ins disabled | Enable in dashboard |
| CORS error on Edge Function | Function not deployed | `supabase functions deploy game` |
| `GET /jogadores 500` | RLS recursion | Apply migration 3 |
| Players not updating in real-time | Tables not in Realtime publication | Run `alter publication` |
| "This page couldn't load" in Vercel | Missing env vars | Add via `vercel env add` |
