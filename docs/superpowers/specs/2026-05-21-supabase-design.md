# Missão Espia — Supabase Design Spec

**Data:** 2026-05-21
**Status:** Aprovado

---

## Visão Geral

Integração completa do Supabase como backend de Missão Espia: autenticação híbrida (anônima + Google), banco de dados relacional com estado de jogo em JSONB, lógica autoritativa via Edge Function única, e Realtime via Postgres Changes.

---

## Autenticação

### Modo Híbrido

Ao abrir o app, o cliente sempre chama `signInAnonymously()` automaticamente — nenhum fluxo exige login. A conta Google é opcional e pode ser vinculada a qualquer momento via `linkWithOAuth('google')` sem perder a sessão ou o histórico.

| Tipo | Caso de uso |
|---|---|
| Anônimo | Jogar imediatamente, sem fricção |
| Google vinculado | Histórico de partidas e pontuação acumulada |

O campo `jogadores.user_id` referencia `auth.users` em ambos os casos — o jogo não distingue os dois tipos.

### RLS

- **Leitura:** usuário autenticado membro da sala pode ler `salas`, `jogadores`, `rodadas` e `votos` da sua sala.
- **Escrita:** bloqueada para clientes. Apenas a Edge Function, com a `service_role` key, escreve no banco.

---

## Schema do Banco

```sql
-- Salas
create table salas (
  id           uuid primary key default gen_random_uuid(),
  codigo       text unique not null,        -- 4 letras maiúsculas, ex: "ABCD"
  anfitriao    uuid references auth.users,
  status       text default 'aguardando',   -- aguardando | jogando | encerrada
  num_rodadas  int not null,                -- definido pelo anfitrião
  rodada_atual int default 0,
  senha_hash   text,                        -- bcrypt; null = sala pública
  criada_em    timestamptz default now()
);

-- Jogadores
create table jogadores (
  id         uuid primary key default gen_random_uuid(),
  sala_id    uuid references salas on delete cascade,
  user_id    uuid references auth.users,
  apelido    text not null,
  pontuacao  int default 0,
  ativo      boolean default true,          -- false = eliminado na rodada atual
  conectado  boolean default true,
  entrou_em  timestamptz default now()
);

-- Rodadas
create table rodadas (
  id           uuid primary key default gen_random_uuid(),
  sala_id      uuid references salas on delete cascade,
  numero       int not null,
  evento_id    int not null,               -- ID lógico da lista local de eventos
  estado       jsonb not null default '{}',
  iniciada_em  timestamptz default now(),
  encerrada_em timestamptz
);

-- Votos (por acusação dentro de uma rodada)
create table votos (
  id         uuid primary key default gen_random_uuid(),
  rodada_id  uuid references rodadas on delete cascade,
  votante_id uuid references jogadores,
  acusado_id uuid references jogadores,
  aprovado   boolean not null,
  criado_em  timestamptz default now(),
  unique (rodada_id, votante_id)            -- um voto por jogador por rodada
);
```

### Estrutura do campo `estado` (JSONB em `rodadas`)

```jsonc
{
  "fase": "jogando",             // jogando | votacao | adivinhacao | resultado
  "turno_atual": "<jogador_id>",
  "ordem_turnos": ["<id>", ...], // todos os jogadores ativos, em ordem
  "espia_ids": ["<id>", ...],    // revelado apenas na fase resultado
  "timer_end": "2026-05-21T14:32:00Z",
  "eliminacoes_erradas": 0,
  "acusado_id": null,            // preenchido durante fase votacao
  "adivinhou_evento_id": null    // preenchido se espia tentou adivinhar
}
```

---

## Edge Function: `game`

Função única em `/supabase/functions/game/index.ts`. Roteamento interno por campo `action` no body JSON. Usa `service_role` key — nunca exposta ao cliente.

### Contrato de entrada

```ts
POST /functions/v1/game
Authorization: Bearer <anon_key>   // usuário autenticado via Supabase Auth
Content-Type: application/json

{ "action": "<nome>", "payload": { ... } }
```

### Handlers

| Action | Payload | O que faz |
|---|---|---|
| `criar_sala` | `{ apelido, num_rodadas, senha? }` | Gera código único de 4 letras, cria sala, hash da senha se fornecida, insere anfitrião em `jogadores` |
| `entrar_sala` | `{ codigo, apelido, senha? }` | Valida código; verifica bcrypt se sala tem senha; insere jogador; retorna 403 se senha errada ou sala cheia/encerrada |
| `iniciar_rodada` | `{ sala_id }` | Valida que caller é anfitrião; sorteia `evento_id` não repetido; define `espia_ids` pela tabela de regras; monta `ordem_turnos`; calcula `timer_end`; cria linha em `rodadas` |
| `proximo_turno` | `{ rodada_id }` | Avança índice em `ordem_turnos`; se chegou ao fim, verifica timer; atualiza `estado` |
| `acusar` | `{ rodada_id, acusado_id }` | Válido apenas em início de turno do acusador; muda `fase` para `votacao`; registra `acusado_id` no `estado` |
| `votar` | `{ rodada_id, aprovado }` | Insere em `votos`; se todos votaram, resolve: maioria aprova → elimina jogador ou revela espia; atualiza `estado` |
| `adivinhar` | `{ rodada_id, evento_id }` | Disponível apenas para espia; registra `adivinhou_evento_id`; chama lógica de `encerrar_rodada` |
| `encerrar_rodada` | `{ rodada_id }` | Calcula pontuação por jogador (tabela de regras); atualiza `jogadores.pontuacao`; marca `rodadas.encerrada_em`; se `rodada_atual < num_rodadas`, avança; senão muda `salas.status` para `encerrada` |

### Tratamento de erros

Todos os handlers retornam `{ error: string }` com status HTTP adequado (400, 403, 404, 409) em caso de ação inválida. O cliente exibe o erro via Sonner toast.

---

## Realtime

Canal por sala: `sala:<codigo>` (Postgres Changes).

| Tabela | Evento | Quem escuta | Para quê |
|---|---|---|---|
| `rodadas` | `UPDATE` | Todos na sala | Atualizar fase, turno, timer |
| `jogadores` | `INSERT` | Lobby | Novo jogador chegou |
| `jogadores` | `UPDATE` | Jogo e lobby | Jogador eliminado, desconectado, pontuação |

```ts
supabase
  .channel(`sala:${codigo}`)
  .on('postgres_changes', {
    event: 'UPDATE',
    schema: 'public',
    table: 'rodadas',
    filter: `sala_id=eq.${salaId}`,
  }, (payload) => updateGameState(payload.new.estado))
  .on('postgres_changes', {
    event: '*',
    schema: 'public',
    table: 'jogadores',
    filter: `sala_id=eq.${salaId}`,
  }, (payload) => updatePlayers(payload))
  .subscribe()
```

---

## Regras de Pontuação (implementadas em `encerrar_rodada`)

| Resultado do espia | Pontos (espia) | Pontos (grupo) |
|---|---|---|
| Pego e não adivinha | 0 | 1 por membro ativo |
| Pego e adivinha | 1 | 0 |
| Não pego e não adivinha | 2 | 0 |
| Não pego e adivinha | 3 | 0 |

Membros eliminados não pontuam.

---

## Estrutura de Arquivos

```
supabase/
  functions/
    game/
      index.ts          ← entry point, roteamento por action
      handlers/
        criar-sala.ts
        entrar-sala.ts
        iniciar-rodada.ts
        proximo-turno.ts
        acusar.ts
        votar.ts
        adivinhar.ts
        encerrar-rodada.ts
      lib/
        db.ts            ← cliente Supabase com service_role
        pontuacao.ts     ← lógica de cálculo de pontos
        codigo.ts        ← gerador de código único de 4 letras
        senha.ts         ← bcrypt hash/compare
  migrations/
    001_schema_inicial.sql
  seed.sql               ← dados de teste (sala exemplo)

web/src/
  lib/
    supabase.ts          ← cliente browser (anon key)
    game-actions.ts      ← wrappers tipados para chamar a Edge Function
  hooks/
    useGameState.ts      ← subscription Realtime + estado local
    usePlayers.ts        ← subscription jogadores
```

---

## Decisões Tomadas

- **Uma Edge Function única** (`game`) em vez de múltiplas funções — evita cold starts paralelos e centraliza validação.
- **senha_hash com bcrypt** — a senha nunca sai do servidor; o cliente só envia plain text na chamada de `entrar_sala`.
- **`evento_id` como inteiro lógico** — a lista de 32 eventos vive no código (tanto no cliente quanto na Edge Function). Não há tabela `eventos` no banco — menos uma tabela para manter.
- **`espia_ids` no JSONB** oculto — o campo só é revelado quando `fase === 'resultado'`. RLS impede leitura direta; a Edge Function controla quando expor.
