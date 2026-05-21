# Supabase Backend Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implementar o backend completo do Missão Espia: Auth híbrida, schema Postgres, Edge Function autoritativa com 8 handlers, e subscriptions Realtime no cliente Next.js.

**Architecture:** Uma Edge Function Deno (`game`) recebe todas as ações de jogo via campo `action`, valida, e escreve no Postgres com service_role. Clientes leem diretamente e assinam Postgres Changes via Realtime. Auth: sessão anônima sempre ativa + vinculação opcional com Google OAuth.

**Tech Stack:** Supabase CLI, Deno, PostgreSQL, Supabase Realtime, Next.js 16 (App Router), TypeScript, bcrypt (Deno)

---

## File Map

```
supabase/
  config.toml                               ← gerado por `supabase init`
  functions/
    game/
      index.ts                              ← entry point, CORS, roteamento por action
      deno.json                             ← import map
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
        db.ts                               ← cliente Supabase service_role
        types.ts                            ← interfaces TypeScript compartilhadas
        eventos.ts                          ← lista de 32 eventos (igual ao cliente)
        codigo.ts                           ← gerador de código único de 4 letras
        senha.ts                            ← bcrypt hash/compare
        pontuacao.ts                        ← cálculo de pontos por rodada
        espias.ts                           ← quantos espias por número de jogadores
  migrations/
    20260521000000_schema_inicial.sql
  seed.sql

web/src/
  lib/
    supabase.ts                             ← browser client (anon key)
    game-actions.ts                         ← wrappers tipados p/ chamar a Edge Function
  hooks/
    useGameState.ts                         ← Realtime: estado da rodada atual
    usePlayers.ts                           ← Realtime: lista de jogadores da sala
  app/
    page.tsx                                ← MODIFICAR: conectar criar/entrar
    criar/page.tsx                          ← MODIFICAR: chamar criar_sala
    entrar/page.tsx                         ← MODIFICAR: chamar entrar_sala
    sala/[code]/lobby/page.tsx              ← MODIFICAR: usePlayers + iniciar_rodada
    sala/[code]/jogo/page.tsx               ← MODIFICAR: useGameState + ações reais
    sala/[code]/resultado/page.tsx          ← MODIFICAR: dados reais de rodada
```

---

## Task 1: Instalar Supabase CLI e inicializar projeto

**Files:**
- Create: `supabase/config.toml` (gerado pelo CLI)
- Create: `supabase/functions/game/deno.json`

- [ ] **Instalar Supabase CLI via Homebrew**

```bash
brew install supabase/tap/supabase
supabase --version
```
Esperado: versão impressa (ex: `2.x.x`)

- [ ] **Inicializar Supabase na raiz do projeto**

```bash
cd /Users/sampalumbo/Work/Missao_Espia
supabase init
```
Esperado: diretório `supabase/` criado com `config.toml`.

- [ ] **Criar import map para a Edge Function**

Criar `supabase/functions/game/deno.json`:

```json
{
  "imports": {
    "@supabase/supabase-js": "https://esm.sh/@supabase/supabase-js@2",
    "bcrypt": "https://deno.land/x/bcrypt@v0.4.1/mod.ts",
    "std/assert": "https://deno.land/std@0.224.0/assert/mod.ts"
  }
}
```

- [ ] **Commit**

```bash
git add supabase/ && git commit -m "feat: inicializa projeto Supabase"
```

---

## Task 2: Migration — Schema inicial

**Files:**
- Create: `supabase/migrations/20260521000000_schema_inicial.sql`

- [ ] **Criar arquivo de migration**

```bash
supabase migration new schema_inicial
```
Isso cria `supabase/migrations/<timestamp>_schema_inicial.sql`. Renomear para `20260521000000_schema_inicial.sql` se necessário.

- [ ] **Escrever o schema completo**

Conteúdo de `supabase/migrations/20260521000000_schema_inicial.sql`:

```sql
-- Extensões
create extension if not exists "pgcrypto";

-- Salas
create table public.salas (
  id           uuid primary key default gen_random_uuid(),
  codigo       text unique not null,
  anfitriao    uuid references auth.users on delete set null,
  status       text not null default 'aguardando'
                 check (status in ('aguardando', 'jogando', 'encerrada')),
  num_rodadas  int not null check (num_rodadas >= 1),
  rodada_atual int not null default 0,
  senha_hash   text,
  criada_em    timestamptz not null default now()
);

-- Jogadores
create table public.jogadores (
  id        uuid primary key default gen_random_uuid(),
  sala_id   uuid not null references public.salas on delete cascade,
  user_id   uuid references auth.users on delete set null,
  apelido   text not null,
  pontuacao int not null default 0,
  ativo     boolean not null default true,
  conectado boolean not null default true,
  entrou_em timestamptz not null default now()
);

-- Rodadas
create table public.rodadas (
  id           uuid primary key default gen_random_uuid(),
  sala_id      uuid not null references public.salas on delete cascade,
  numero       int not null,
  evento_id    int not null,
  estado       jsonb not null default '{}',
  iniciada_em  timestamptz not null default now(),
  encerrada_em timestamptz,
  unique (sala_id, numero)
);

-- Votos
create table public.votos (
  id         uuid primary key default gen_random_uuid(),
  rodada_id  uuid not null references public.rodadas on delete cascade,
  votante_id uuid not null references public.jogadores on delete cascade,
  acusado_id uuid not null references public.jogadores on delete cascade,
  aprovado   boolean not null,
  criado_em  timestamptz not null default now(),
  unique (rodada_id, votante_id)
);

-- Índices úteis
create index on public.jogadores (sala_id);
create index on public.rodadas (sala_id);
create index on public.votos (rodada_id);

-- RLS: ativar em todas as tabelas
alter table public.salas     enable row level security;
alter table public.jogadores enable row level security;
alter table public.rodadas   enable row level security;
alter table public.votos     enable row level security;
```

- [ ] **Commit**

```bash
git add supabase/migrations/ && git commit -m "feat: migration schema inicial"
```

---

## Task 3: Tipos TypeScript + funções utilitárias

**Files:**
- Create: `supabase/functions/game/lib/types.ts`
- Create: `supabase/functions/game/lib/eventos.ts`
- Create: `supabase/functions/game/lib/codigo.ts`
- Create: `supabase/functions/game/lib/senha.ts`
- Create: `supabase/functions/game/lib/pontuacao.ts`
- Create: `supabase/functions/game/lib/espias.ts`
- Create: `supabase/functions/game/lib/db.ts`

- [ ] **Criar `lib/types.ts`**

```typescript
// supabase/functions/game/lib/types.ts

export type SalaStatus = "aguardando" | "jogando" | "encerrada";
export type FaseJogo = "jogando" | "votacao" | "adivinhacao" | "resultado";

export interface Sala {
  id: string;
  codigo: string;
  anfitriao: string | null;
  status: SalaStatus;
  num_rodadas: number;
  rodada_atual: number;
  senha_hash: string | null;
  criada_em: string;
}

export interface Jogador {
  id: string;
  sala_id: string;
  user_id: string | null;
  apelido: string;
  pontuacao: number;
  ativo: boolean;
  conectado: boolean;
  entrou_em: string;
}

export interface EstadoRodada {
  fase: FaseJogo;
  turno_atual: string;         // jogador_id
  ordem_turnos: string[];      // jogador_ids em ordem
  espia_ids: string[];         // revelado apenas em fase resultado
  timer_end: string;           // ISO 8601
  eliminacoes_erradas: number;
  acusado_id: string | null;
  adivinhou_evento_id: number | null;
}

export interface Rodada {
  id: string;
  sala_id: string;
  numero: number;
  evento_id: number;
  estado: EstadoRodada;
  iniciada_em: string;
  encerrada_em: string | null;
}

// Payloads de cada action
export interface CriarSalaPayload {
  apelido: string;
  num_rodadas: number;
  senha?: string;
}

export interface EntrarSalaPayload {
  codigo: string;
  apelido: string;
  senha?: string;
}

export interface IniciarRodadaPayload {
  sala_id: string;
}

export interface ProximoTurnoPayload {
  rodada_id: string;
}

export interface AcusarPayload {
  rodada_id: string;
  acusado_id: string;
}

export interface VotarPayload {
  rodada_id: string;
  aprovado: boolean;
}

export interface AdivinharPayload {
  rodada_id: string;
  evento_id: number;
}

export type GameResponse<T = Record<string, unknown>> =
  | { data: T; error?: never }
  | { error: string; data?: never };
```

- [ ] **Criar `lib/eventos.ts`**

```typescript
// supabase/functions/game/lib/eventos.ts

export interface Evento {
  id: number;
  evento: string;
  local: string;
}

export const EVENTOS: Evento[] = [
  { id: 1,  evento: "Criação",                            local: "Jardim do Éden" },
  { id: 2,  evento: "Dilúvio",                            local: "Arca de Noé" },
  { id: 3,  evento: "Confusão das Línguas",               local: "Torre de Babel" },
  { id: 4,  evento: "Destruição de Sodoma e Gomorra",     local: "Casa de Ló" },
  { id: 5,  evento: "Jacó luta com o Anjo",               local: "Rio Jaboque" },
  { id: 6,  evento: "José interpreta os Sonhos do Faraó", local: "Palácio do Faraó" },
  { id: 7,  evento: "Êxodo",                              local: "Mar Vermelho" },
  { id: 8,  evento: "Moisés recebe as Tábuas da Lei",     local: "Monte Sinai" },
  { id: 9,  evento: "Adoração ao Bezerro de Ouro",        local: "Deserto do Sinai" },
  { id: 10, evento: "Dia da Expiação",                    local: "Diante do Véu do Santuário" },
  { id: 11, evento: "Queda das Muralhas de Jericó",       local: "Ao Redor das Muralhas" },
  { id: 12, evento: "Sansão derruba o Templo",            local: "Templo de Dagom" },
  { id: 13, evento: "Samuel ouve a Voz de Deus",          local: "Quarto na Cidade de Siló" },
  { id: 14, evento: "Davi derrota Golias",                local: "Vale de Elá" },
  { id: 15, evento: "Rainha de Sabá visita Salomão",      local: "Palácio de Salomão" },
  { id: 16, evento: "Elias enfrenta os Profetas de Baal", local: "Carmelo" },
  { id: 17, evento: "Jonas e o Grande Peixe",             local: "Ventre do Peixe" },
  { id: 18, evento: "Cativeiro da Babilônia",             local: "Fornalha Ardente" },
  { id: 19, evento: "Daniel na Cova dos Leões",           local: "Cova dos Leões" },
  { id: 20, evento: "Nascimento de Jesus",                local: "Manjedoura" },
  { id: 21, evento: "Milagre da Água em Vinho",           local: "Caná da Galileia" },
  { id: 22, evento: "Jesus e a Samaritana",               local: "Poço de Jacó" },
  { id: 23, evento: "Multiplicação dos Pães",             local: "Margens do Mar da Galileia" },
  { id: 24, evento: "Zaqueu tenta ver Jesus",             local: "Em Cima da Árvore" },
  { id: 25, evento: "Última Ceia",                        local: "Cenáculo" },
  { id: 26, evento: "Crucificação de Jesus",              local: "Gólgota" },
  { id: 27, evento: "Ressurreição de Jesus",              local: "Tumba Vazia" },
  { id: 28, evento: "Pentecostes",                        local: "Ruas de Jerusalém" },
  { id: 29, evento: "Conversão de Paulo",                 local: "Caminho de Damasco" },
  { id: 30, evento: "Paulo e Silas cantam na Prisão",     local: "Cela na Cidade de Filipos" },
  { id: 31, evento: "Paulo prega em Atenas",              local: "Areópago de Atenas" },
  { id: 32, evento: "João tem a Visão do Apocalipse",     local: "Ilha de Patmos" },
];
```

- [ ] **Criar `lib/codigo.ts`**

```typescript
// supabase/functions/game/lib/codigo.ts
import { SupabaseClient } from "@supabase/supabase-js";

const CHARS = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";

function gerar(): string {
  return Array.from(
    { length: 4 },
    () => CHARS[Math.floor(Math.random() * CHARS.length)]
  ).join("");
}

export async function gerarCodigoUnico(db: SupabaseClient): Promise<string> {
  for (let i = 0; i < 20; i++) {
    const codigo = gerar();
    const { data } = await db
      .from("salas")
      .select("id")
      .eq("codigo", codigo)
      .eq("status", "aguardando")
      .maybeSingle();
    if (!data) return codigo;
  }
  throw new Error("Não foi possível gerar código único após 20 tentativas");
}
```

- [ ] **Criar `lib/senha.ts`**

```typescript
// supabase/functions/game/lib/senha.ts
import * as bcrypt from "bcrypt";

export async function hashSenha(senha: string): Promise<string> {
  return bcrypt.hash(senha);
}

export async function verificarSenha(
  senha: string,
  hash: string
): Promise<boolean> {
  return bcrypt.compare(senha, hash);
}
```

- [ ] **Criar `lib/espias.ts`**

```typescript
// supabase/functions/game/lib/espias.ts

export function numEspias(numJogadores: number): number {
  if (numJogadores <= 6) return 1;
  if (numJogadores <= 9) return 2;
  return 3;
}

export function limiteEliminacoesErradas(
  numJogadores: number,
  numEspias: number
): number {
  if (numJogadores === 4) return 0;
  return numEspias;
}
```

- [ ] **Criar `lib/pontuacao.ts`**

```typescript
// supabase/functions/game/lib/pontuacao.ts

export interface ResultadoRodada {
  espiaPego: boolean;
  espiaAdivinhou: boolean;
}

export interface PontuacaoRodada {
  pontoEspia: number;
  pontoGrupo: number; // por membro ativo (não-espia, não-eliminado)
}

export function calcularPontuacao(r: ResultadoRodada): PontuacaoRodada {
  if (!r.espiaPego && r.espiaAdivinhou)  return { pontoEspia: 3, pontoGrupo: 0 };
  if (!r.espiaPego && !r.espiaAdivinhou) return { pontoEspia: 2, pontoGrupo: 0 };
  if (r.espiaPego  && r.espiaAdivinhou)  return { pontoEspia: 1, pontoGrupo: 0 };
  return { pontoEspia: 0, pontoGrupo: 1 };
}
```

- [ ] **Escrever testes para as funções puras**

Criar `supabase/functions/game/lib/pontuacao_test.ts`:

```typescript
import { assertEquals } from "std/assert";
import { calcularPontuacao } from "./pontuacao.ts";

Deno.test("espia não pego e adivinhou → 3 pts espia, 0 grupo", () => {
  const r = calcularPontuacao({ espiaPego: false, espiaAdivinhou: true });
  assertEquals(r, { pontoEspia: 3, pontoGrupo: 0 });
});

Deno.test("espia não pego e não adivinhou → 2 pts espia, 0 grupo", () => {
  const r = calcularPontuacao({ espiaPego: false, espiaAdivinhou: false });
  assertEquals(r, { pontoEspia: 2, pontoGrupo: 0 });
});

Deno.test("espia pego e adivinhou → 1 pt espia, 0 grupo", () => {
  const r = calcularPontuacao({ espiaPego: true, espiaAdivinhou: true });
  assertEquals(r, { pontoEspia: 1, pontoGrupo: 0 });
});

Deno.test("espia pego e não adivinhou → 0 pts espia, 1 pt/membro grupo", () => {
  const r = calcularPontuacao({ espiaPego: true, espiaAdivinhou: false });
  assertEquals(r, { pontoEspia: 0, pontoGrupo: 1 });
});
```

Criar `supabase/functions/game/lib/espias_test.ts`:

```typescript
import { assertEquals } from "std/assert";
import { numEspias, limiteEliminacoesErradas } from "./espias.ts";

Deno.test("4-6 jogadores → 1 espia", () => {
  assertEquals(numEspias(4), 1);
  assertEquals(numEspias(6), 1);
});

Deno.test("7-9 jogadores → 2 espias", () => {
  assertEquals(numEspias(7), 2);
  assertEquals(numEspias(9), 2);
});

Deno.test("10-12 jogadores → 3 espias", () => {
  assertEquals(numEspias(10), 3);
  assertEquals(numEspias(12), 3);
});

Deno.test("4 jogadores → 0 eliminações erradas permitidas", () => {
  assertEquals(limiteEliminacoesErradas(4, 1), 0);
});

Deno.test("6 jogadores, 1 espia → 1 eliminação errada permitida", () => {
  assertEquals(limiteEliminacoesErradas(6, 1), 1);
});
```

- [ ] **Rodar testes e verificar que passam**

```bash
cd supabase/functions/game
deno test lib/pontuacao_test.ts lib/espias_test.ts --config deno.json
```
Esperado: todos os testes passando.

- [ ] **Criar `lib/db.ts`**

```typescript
// supabase/functions/game/lib/db.ts
import { createClient, SupabaseClient } from "@supabase/supabase-js";

let _db: SupabaseClient | null = null;

export function getDb(): SupabaseClient {
  if (_db) return _db;
  const url = Deno.env.get("SUPABASE_URL");
  const key = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!url || !key) throw new Error("SUPABASE_URL ou SUPABASE_SERVICE_ROLE_KEY não definidos");
  _db = createClient(url, key, { auth: { persistSession: false } });
  return _db;
}
```

- [ ] **Commit**

```bash
git add supabase/functions/game/lib/ && git commit -m "feat: tipos e utilitários da Edge Function"
```

---

## Task 4: Edge Function — Entry Point + `criar_sala`

**Files:**
- Create: `supabase/functions/game/index.ts`
- Create: `supabase/functions/game/handlers/criar-sala.ts`

- [ ] **Criar `index.ts` — entry point com roteamento**

```typescript
// supabase/functions/game/index.ts
import { criarSala }       from "./handlers/criar-sala.ts";
import { entrarSala }      from "./handlers/entrar-sala.ts";
import { iniciarRodada }   from "./handlers/iniciar-rodada.ts";
import { proximoTurno }    from "./handlers/proximo-turno.ts";
import { acusar }          from "./handlers/acusar.ts";
import { votar }           from "./handlers/votar.ts";
import { adivinhar }       from "./handlers/adivinhar.ts";
import { encerrarRodada }  from "./handlers/encerrar-rodada.ts";

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

function json(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...CORS, "Content-Type": "application/json" },
  });
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });

  // Extrair user autenticado
  const authHeader = req.headers.get("Authorization");
  if (!authHeader) return json({ error: "Não autorizado" }, 401);

  let body: { action: string; payload: unknown };
  try {
    body = await req.json();
  } catch {
    return json({ error: "Body inválido" }, 400);
  }

  const { action, payload } = body;

  // Obter user_id do token JWT
  const { createClient } = await import("@supabase/supabase-js");
  const userClient = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_ANON_KEY")!,
    { global: { headers: { Authorization: authHeader } } }
  );
  const { data: { user }, error: userErr } = await userClient.auth.getUser();
  if (userErr || !user) return json({ error: "Token inválido" }, 401);

  try {
    switch (action) {
      case "criar_sala":     return json(await criarSala(user.id, payload));
      case "entrar_sala":    return json(await entrarSala(user.id, payload));
      case "iniciar_rodada": return json(await iniciarRodada(user.id, payload));
      case "proximo_turno":  return json(await proximoTurno(user.id, payload));
      case "acusar":         return json(await acusar(user.id, payload));
      case "votar":          return json(await votar(user.id, payload));
      case "adivinhar":      return json(await adivinhar(user.id, payload));
      case "encerrar_rodada":return json(await encerrarRodada(user.id, payload));
      default: return json({ error: `Action desconhecida: ${action}` }, 400);
    }
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Erro interno";
    console.error(`[game] action=${action} error:`, msg);
    return json({ error: msg }, 500);
  }
});
```

- [ ] **Criar `handlers/criar-sala.ts`**

```typescript
// supabase/functions/game/handlers/criar-sala.ts
import { getDb }              from "../lib/db.ts";
import { gerarCodigoUnico }   from "../lib/codigo.ts";
import { hashSenha }          from "../lib/senha.ts";
import type { CriarSalaPayload } from "../lib/types.ts";

export async function criarSala(userId: string, payload: unknown) {
  const { apelido, num_rodadas, senha } = payload as CriarSalaPayload;

  if (!apelido?.trim())        throw new Error("Apelido obrigatório");
  if (!num_rodadas || num_rodadas < 1) throw new Error("Número de rodadas inválido");

  const db = getDb();
  const codigo = await gerarCodigoUnico(db);
  const senha_hash = senha ? await hashSenha(senha) : null;

  const { data: sala, error: salaErr } = await db
    .from("salas")
    .insert({ codigo, anfitriao: userId, num_rodadas, senha_hash })
    .select()
    .single();

  if (salaErr || !sala) throw new Error("Falha ao criar sala: " + salaErr?.message);

  const { data: jogador, error: jogErr } = await db
    .from("jogadores")
    .insert({ sala_id: sala.id, user_id: userId, apelido: apelido.trim() })
    .select()
    .single();

  if (jogErr || !jogador) throw new Error("Falha ao criar jogador: " + jogErr?.message);

  return { sala, jogador };
}
```

- [ ] **Testar localmente com curl (requer `supabase start` rodando)**

```bash
# Em outro terminal: supabase start
curl -X POST http://localhost:54321/functions/v1/game \
  -H "Authorization: Bearer <anon_token>" \
  -H "Content-Type: application/json" \
  -d '{"action":"criar_sala","payload":{"apelido":"Davi","num_rodadas":5}}'
```
Esperado: `{ "data": { "sala": {...}, "jogador": {...} } }`

- [ ] **Commit**

```bash
git add supabase/functions/game/ && git commit -m "feat: Edge Function entry point + handler criar_sala"
```

---

## Task 5: Handler `entrar_sala`

**Files:**
- Create: `supabase/functions/game/handlers/entrar-sala.ts`

- [ ] **Criar `handlers/entrar-sala.ts`**

```typescript
// supabase/functions/game/handlers/entrar-sala.ts
import { getDb }            from "../lib/db.ts";
import { verificarSenha }   from "../lib/senha.ts";
import type { EntrarSalaPayload } from "../lib/types.ts";

export async function entrarSala(userId: string, payload: unknown) {
  const { codigo, apelido, senha } = payload as EntrarSalaPayload;

  if (!codigo?.trim())  throw new Error("Código obrigatório");
  if (!apelido?.trim()) throw new Error("Apelido obrigatório");

  const db = getDb();

  // Buscar sala
  const { data: sala, error: salaErr } = await db
    .from("salas")
    .select("*")
    .eq("codigo", codigo.toUpperCase())
    .single();

  if (salaErr || !sala) throw Object.assign(new Error("Sala não encontrada"), { status: 404 });
  if (sala.status === "encerrada") throw Object.assign(new Error("Sala encerrada"), { status: 410 });
  if (sala.status === "jogando")   throw Object.assign(new Error("Partida já em andamento"), { status: 409 });

  // Verificar senha
  if (sala.senha_hash) {
    if (!senha) throw Object.assign(new Error("Senha obrigatória"), { status: 403 });
    const ok = await verificarSenha(senha, sala.senha_hash);
    if (!ok)   throw Object.assign(new Error("Senha incorreta"), { status: 403 });
  }

  // Verificar se jogador já está na sala (reconexão)
  const { data: existente } = await db
    .from("jogadores")
    .select("*")
    .eq("sala_id", sala.id)
    .eq("user_id", userId)
    .maybeSingle();

  if (existente) {
    // Reconectar
    const { data: jogador } = await db
      .from("jogadores")
      .update({ conectado: true })
      .eq("id", existente.id)
      .select()
      .single();
    return { sala, jogador };
  }

  // Inserir novo jogador
  const { data: jogador, error: jogErr } = await db
    .from("jogadores")
    .insert({ sala_id: sala.id, user_id: userId, apelido: apelido.trim() })
    .select()
    .single();

  if (jogErr || !jogador) throw new Error("Falha ao entrar na sala: " + jogErr?.message);

  return { sala, jogador };
}
```

- [ ] **Commit**

```bash
git add supabase/functions/game/handlers/entrar-sala.ts \
  && git commit -m "feat: handler entrar_sala com verificação de senha"
```

---

## Task 6: Handler `iniciar_rodada`

**Files:**
- Create: `supabase/functions/game/handlers/iniciar-rodada.ts`

- [ ] **Criar `handlers/iniciar-rodada.ts`**

```typescript
// supabase/functions/game/handlers/iniciar-rodada.ts
import { getDb }       from "../lib/db.ts";
import { numEspias }   from "../lib/espias.ts";
import { EVENTOS }     from "../lib/eventos.ts";
import type { IniciarRodadaPayload, EstadoRodada } from "../lib/types.ts";

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

export async function iniciarRodada(userId: string, payload: unknown) {
  const { sala_id } = payload as IniciarRodadaPayload;
  if (!sala_id) throw new Error("sala_id obrigatório");

  const db = getDb();

  // Verificar que caller é anfitrião
  const { data: sala } = await db
    .from("salas")
    .select("*")
    .eq("id", sala_id)
    .single();

  if (!sala) throw Object.assign(new Error("Sala não encontrada"), { status: 404 });
  if (sala.anfitriao !== userId) throw Object.assign(new Error("Apenas o anfitrião pode iniciar"), { status: 403 });
  if (sala.status === "encerrada") throw new Error("Partida encerrada");
  if (sala.rodada_atual >= sala.num_rodadas) throw new Error("Todas as rodadas já foram jogadas");

  // Buscar jogadores ativos
  const { data: jogadores } = await db
    .from("jogadores")
    .select("id")
    .eq("sala_id", sala_id)
    .eq("ativo", true);

  if (!jogadores || jogadores.length < 4) throw new Error("Mínimo de 4 jogadores ativos");

  // Sortear evento (não repetir rodadas anteriores da mesma sala)
  const { data: rodadasAnteriores } = await db
    .from("rodadas")
    .select("evento_id")
    .eq("sala_id", sala_id);

  const usados = new Set((rodadasAnteriores ?? []).map((r) => r.evento_id));
  const disponiveis = EVENTOS.filter((e) => !usados.has(e.id));
  if (disponiveis.length === 0) throw new Error("Todos os eventos já foram usados");

  const evento = disponiveis[Math.floor(Math.random() * disponiveis.length)];

  // Definir espias
  const n = numEspias(jogadores.length);
  const ids = jogadores.map((j) => j.id);
  const shuffled = shuffle(ids);
  const espia_ids = shuffled.slice(0, n);

  // Timer: 5 min + jogadores - espias
  const minutos = 5 + jogadores.length - n;
  const timer_end = new Date(Date.now() + minutos * 60 * 1000).toISOString();

  const estado: EstadoRodada = {
    fase: "jogando",
    turno_atual: shuffled[0],
    ordem_turnos: shuffled,
    espia_ids,
    timer_end,
    eliminacoes_erradas: 0,
    acusado_id: null,
    adivinhou_evento_id: null,
  };

  const novoNumero = sala.rodada_atual + 1;

  // Criar rodada + atualizar sala
  const { data: rodada, error } = await db
    .from("rodadas")
    .insert({ sala_id, numero: novoNumero, evento_id: evento.id, estado })
    .select()
    .single();

  if (error || !rodada) throw new Error("Falha ao criar rodada: " + error?.message);

  await db
    .from("salas")
    .update({ status: "jogando", rodada_atual: novoNumero })
    .eq("id", sala_id);

  return { rodada };
}
```

- [ ] **Commit**

```bash
git add supabase/functions/game/handlers/iniciar-rodada.ts \
  && git commit -m "feat: handler iniciar_rodada com sorteio de evento e espias"
```

---

## Task 7: Handlers `proximo_turno`

**Files:**
- Create: `supabase/functions/game/handlers/proximo-turno.ts`

- [ ] **Criar `handlers/proximo-turno.ts`**

```typescript
// supabase/functions/game/handlers/proximo-turno.ts
import { getDb }                from "../lib/db.ts";
import { encerrarRodada }       from "./encerrar-rodada.ts";
import type { ProximoTurnoPayload } from "../lib/types.ts";

export async function proximoTurno(userId: string, payload: unknown) {
  const { rodada_id } = payload as ProximoTurnoPayload;
  if (!rodada_id) throw new Error("rodada_id obrigatório");

  const db = getDb();

  const { data: rodada } = await db
    .from("rodadas")
    .select("*, salas(anfitriao)")
    .eq("id", rodada_id)
    .single();

  if (!rodada) throw Object.assign(new Error("Rodada não encontrada"), { status: 404 });
  if (rodada.encerrada_em) throw new Error("Rodada já encerrada");

  const estado = rodada.estado;
  if (estado.fase !== "jogando") throw new Error(`Não é possível avançar turno na fase '${estado.fase}'`);

  // Verificar se timer expirou
  if (new Date() > new Date(estado.timer_end)) {
    return encerrarRodada(userId, {
      rodada_id,
      espia_pego: false,
      espia_adivinhou: false,
    });
  }

  // Avançar turno
  const idx = estado.ordem_turnos.indexOf(estado.turno_atual);
  const proximo = estado.ordem_turnos[(idx + 1) % estado.ordem_turnos.length];

  const { error } = await db
    .from("rodadas")
    .update({ estado: { ...estado, turno_atual: proximo } })
    .eq("id", rodada_id);

  if (error) throw new Error("Falha ao avançar turno: " + error.message);

  return { turno_atual: proximo };
}
```

- [ ] **Commit**

```bash
git add supabase/functions/game/handlers/proximo-turno.ts \
  && git commit -m "feat: handler proximo_turno com verificação de timer"
```

---

## Task 8: Handlers `acusar` e `votar`

**Files:**
- Create: `supabase/functions/game/handlers/acusar.ts`
- Create: `supabase/functions/game/handlers/votar.ts`

- [ ] **Criar `handlers/acusar.ts`**

```typescript
// supabase/functions/game/handlers/acusar.ts
import { getDb }        from "../lib/db.ts";
import type { AcusarPayload } from "../lib/types.ts";

export async function acusar(userId: string, payload: unknown) {
  const { rodada_id, acusado_id } = payload as AcusarPayload;
  if (!rodada_id || !acusado_id) throw new Error("rodada_id e acusado_id obrigatórios");

  const db = getDb();

  // Buscar jogador do caller
  const { data: rodada } = await db
    .from("rodadas")
    .select("estado, sala_id, encerrada_em")
    .eq("id", rodada_id)
    .single();

  if (!rodada) throw Object.assign(new Error("Rodada não encontrada"), { status: 404 });
  if (rodada.encerrada_em) throw new Error("Rodada encerrada");

  const estado = rodada.estado;
  if (estado.fase !== "jogando") throw new Error("Só é possível acusar na fase 'jogando'");

  // Verificar que caller é o jogador do turno atual
  const { data: caller } = await db
    .from("jogadores")
    .select("id")
    .eq("sala_id", rodada.sala_id)
    .eq("user_id", userId)
    .single();

  if (!caller || caller.id !== estado.turno_atual) {
    throw Object.assign(new Error("Apenas o jogador do turno pode acusar"), { status: 403 });
  }

  // Verificar que acusado é jogador ativo da sala
  const { data: acusado } = await db
    .from("jogadores")
    .select("id, ativo")
    .eq("id", acusado_id)
    .eq("sala_id", rodada.sala_id)
    .single();

  if (!acusado || !acusado.ativo) throw new Error("Jogador acusado não encontrado ou eliminado");
  if (acusado_id === caller.id) throw new Error("Não é possível acusar a si mesmo");

  const { error } = await db
    .from("rodadas")
    .update({ estado: { ...estado, fase: "votacao", acusado_id } })
    .eq("id", rodada_id);

  if (error) throw new Error("Falha ao iniciar votação: " + error.message);

  return { fase: "votacao", acusado_id };
}
```

- [ ] **Criar `handlers/votar.ts`**

```typescript
// supabase/functions/game/handlers/votar.ts
import { getDb }                 from "../lib/db.ts";
import { limiteEliminacoesErradas, numEspias } from "../lib/espias.ts";
import { encerrarRodada }        from "./encerrar-rodada.ts";
import type { VotarPayload }     from "../lib/types.ts";

export async function votar(userId: string, payload: unknown) {
  const { rodada_id, aprovado } = payload as VotarPayload;
  if (!rodada_id || typeof aprovado !== "boolean") throw new Error("Campos obrigatórios ausentes");

  const db = getDb();

  const { data: rodada } = await db
    .from("rodadas")
    .select("estado, sala_id, encerrada_em")
    .eq("id", rodada_id)
    .single();

  if (!rodada) throw Object.assign(new Error("Rodada não encontrada"), { status: 404 });
  if (rodada.encerrada_em) throw new Error("Rodada encerrada");

  const estado = rodada.estado;
  if (estado.fase !== "votacao") throw new Error("Não há votação em andamento");

  // Buscar jogador votante
  const { data: votante } = await db
    .from("jogadores")
    .select("id, ativo")
    .eq("sala_id", rodada.sala_id)
    .eq("user_id", userId)
    .single();

  if (!votante || !votante.ativo) throw Object.assign(new Error("Jogador não encontrado ou eliminado"), { status: 403 });
  if (votante.id === estado.acusado_id) throw Object.assign(new Error("Acusado não pode votar"), { status: 403 });

  // Inserir voto (unique constraint evita duplicatas)
  const { error: votoErr } = await db.from("votos").insert({
    rodada_id,
    votante_id: votante.id,
    acusado_id: estado.acusado_id,
    aprovado,
  });
  if (votoErr) throw new Error("Falha ao registrar voto: " + votoErr.message);

  // Verificar se todos os jogadores elegíveis já votaram
  const { data: jogadoresAtivos } = await db
    .from("jogadores")
    .select("id")
    .eq("sala_id", rodada.sala_id)
    .eq("ativo", true);

  const elegíveis = (jogadoresAtivos ?? []).filter((j) => j.id !== estado.acusado_id);

  const { data: votos } = await db
    .from("votos")
    .select("aprovado")
    .eq("rodada_id", rodada_id)
    .eq("acusado_id", estado.acusado_id);

  if (!votos || votos.length < elegíveis.length) {
    return { aguardando_votos: true, votos_recebidos: votos?.length ?? 0 };
  }

  // Todos votaram — resolver
  const aprovacoes = votos.filter((v) => v.aprovado).length;
  const maioria = aprovacoes > elegíveis.length / 2;

  if (!maioria) {
    // Votação rejeitada: voltar para jogando
    const { error } = await db
      .from("rodadas")
      .update({ estado: { ...estado, fase: "jogando", acusado_id: null } })
      .eq("id", rodada_id);
    if (error) throw new Error(error.message);
    return { resultado_votacao: "rejeitado" };
  }

  // Maioria aprovou: verificar se acusado é espia
  const acusadoEhEspia = estado.espia_ids.includes(estado.acusado_id!);

  if (acusadoEhEspia) {
    // Espia pego — dar chance de adivinhar
    const { error } = await db
      .from("rodadas")
      .update({ estado: { ...estado, fase: "adivinhacao" } })
      .eq("id", rodada_id);
    if (error) throw new Error(error.message);
    return { resultado_votacao: "aprovado", espia_pego: true, fase: "adivinhacao" };
  }

  // Eliminação errada
  const novasElim = estado.eliminacoes_erradas + 1;

  // Marcar acusado como inativo
  await db.from("jogadores").update({ ativo: false }).eq("id", estado.acusado_id);

  // Verificar limite de eliminações erradas
  const totalJogadores = jogadoresAtivos?.length ?? 0;
  const n = numEspias(totalJogadores);
  const limite = limiteEliminacoesErradas(totalJogadores, n);

  if (novasElim > limite) {
    // Espias vencem por eliminações erradas excessivas
    return encerrarRodada(userId, {
      rodada_id,
      espia_pego: false,
      espia_adivinhou: false,
    });
  }

  // Continuar jogo com eliminação registrada
  await db
    .from("rodadas")
    .update({ estado: { ...estado, fase: "jogando", acusado_id: null, eliminacoes_erradas: novasElim } })
    .eq("id", rodada_id);

  return { resultado_votacao: "aprovado", espia_pego: false, eliminacoes_erradas: novasElim };
}
```

- [ ] **Commit**

```bash
git add supabase/functions/game/handlers/acusar.ts \
        supabase/functions/game/handlers/votar.ts \
  && git commit -m "feat: handlers acusar e votar"
```

---

## Task 9: Handlers `adivinhar` e `encerrar_rodada`

**Files:**
- Create: `supabase/functions/game/handlers/adivinhar.ts`
- Create: `supabase/functions/game/handlers/encerrar-rodada.ts`

- [ ] **Criar `handlers/encerrar-rodada.ts`** (implementar antes, pois `adivinhar` e `votar` o chamam)

```typescript
// supabase/functions/game/handlers/encerrar-rodada.ts
import { getDb }            from "../lib/db.ts";
import { calcularPontuacao } from "../lib/pontuacao.ts";

interface EncerrarPayload {
  rodada_id: string;
  espia_pego: boolean;
  espia_adivinhou: boolean;
}

export async function encerrarRodada(_userId: string, payload: unknown) {
  const { rodada_id, espia_pego, espia_adivinhou } = payload as EncerrarPayload;
  if (!rodada_id) throw new Error("rodada_id obrigatório");

  const db = getDb();

  const { data: rodada } = await db
    .from("rodadas")
    .select("estado, sala_id, encerrada_em")
    .eq("id", rodada_id)
    .single();

  if (!rodada) throw Object.assign(new Error("Rodada não encontrada"), { status: 404 });
  if (rodada.encerrada_em) throw new Error("Rodada já encerrada");

  const estado = rodada.estado;
  const { pontoEspia, pontoGrupo } = calcularPontuacao({ espiaPego: espia_pego, espiaAdivinhou: espia_adivinhou });

  // Buscar jogadores ativos (não-espias para pontuação de grupo)
  const { data: jogadoresAtivos } = await db
    .from("jogadores")
    .select("id")
    .eq("sala_id", rodada.sala_id)
    .eq("ativo", true);

  const updates: Promise<unknown>[] = [];

  for (const j of jogadoresAtivos ?? []) {
    const ehEspia = estado.espia_ids.includes(j.id);
    const delta = ehEspia ? pontoEspia : pontoGrupo;
    if (delta > 0) {
      updates.push(
        db.rpc("incrementar_pontuacao", { jogador_id: j.id, delta })
      );
    }
  }

  await Promise.all(updates);

  // Marcar rodada como encerrada e revelar espias
  await db
    .from("rodadas")
    .update({
      encerrada_em: new Date().toISOString(),
      estado: { ...estado, fase: "resultado" },
    })
    .eq("id", rodada_id);

  // Verificar se a partida acabou
  const { data: sala } = await db.from("salas").select("*").eq("id", rodada.sala_id).single();
  if (sala && sala.rodada_atual >= sala.num_rodadas) {
    await db.from("salas").update({ status: "encerrada" }).eq("id", sala.id);
  }

  return { encerrada: true, espia_pego, espia_adivinhou, pontoEspia, pontoGrupo };
}
```

- [ ] **Criar função RPC `incrementar_pontuacao` na migration**

Criar `supabase/migrations/20260521000001_rpc_pontuacao.sql`:

```sql
create or replace function public.incrementar_pontuacao(
  jogador_id uuid,
  delta int
) returns void
language plpgsql security definer as $$
begin
  update public.jogadores
  set pontuacao = pontuacao + delta
  where id = jogador_id;
end;
$$;
```

- [ ] **Criar `handlers/adivinhar.ts`**

```typescript
// supabase/functions/game/handlers/adivinhar.ts
import { getDb }          from "../lib/db.ts";
import { encerrarRodada } from "./encerrar-rodada.ts";
import { EVENTOS }        from "../lib/eventos.ts";
import type { AdivinharPayload } from "../lib/types.ts";

export async function adivinhar(userId: string, payload: unknown) {
  const { rodada_id, evento_id } = payload as AdivinharPayload;
  if (!rodada_id || !evento_id) throw new Error("rodada_id e evento_id obrigatórios");

  const db = getDb();

  const { data: rodada } = await db
    .from("rodadas")
    .select("estado, sala_id, evento_id, encerrada_em")
    .eq("id", rodada_id)
    .single();

  if (!rodada) throw Object.assign(new Error("Rodada não encontrada"), { status: 404 });
  if (rodada.encerrada_em) throw new Error("Rodada encerrada");

  const estado = rodada.estado;
  const fasesPermitidas = ["jogando", "adivinhacao"];
  if (!fasesPermitidas.includes(estado.fase)) throw new Error(`Não é possível adivinhar na fase '${estado.fase}'`);

  // Verificar que caller é espia
  const { data: jogador } = await db
    .from("jogadores")
    .select("id")
    .eq("sala_id", rodada.sala_id)
    .eq("user_id", userId)
    .single();

  if (!jogador || !estado.espia_ids.includes(jogador.id)) {
    throw Object.assign(new Error("Apenas o espia pode adivinhar"), { status: 403 });
  }

  const eventoValido = EVENTOS.find((e) => e.id === evento_id);
  if (!eventoValido) throw new Error("Evento inválido");

  const acertou = evento_id === rodada.evento_id;

  if (!acertou) {
    // Espia errou: é eliminado, grupo vence
    await db.from("jogadores").update({ ativo: false }).eq("id", jogador.id);
    return encerrarRodada(userId, {
      rodada_id,
      espia_pego: true,
      espia_adivinhou: false,
    });
  }

  // Acertou: espia vence
  const espiaPego = estado.fase === "adivinhacao"; // true se foi pego pelo grupo antes de adivinhar
  return encerrarRodada(userId, {
    rodada_id,
    espia_pego: espiaPego,
    espia_adivinhou: true,
  });
}
```

- [ ] **Commit**

```bash
git add supabase/functions/game/handlers/adivinhar.ts \
        supabase/functions/game/handlers/encerrar-rodada.ts \
        supabase/migrations/20260521000001_rpc_pontuacao.sql \
  && git commit -m "feat: handlers adivinhar e encerrar_rodada + RPC pontuacao"
```

---

## Task 10: RLS Policies

**Files:**
- Create: `supabase/migrations/20260521000002_rls_policies.sql`

- [ ] **Escrever policies de leitura**

```sql
-- supabase/migrations/20260521000002_rls_policies.sql

-- Salas: qualquer autenticado pode ler salas aguardando/jogando (para entrar)
create policy "leitura salas" on public.salas
  for select to authenticated
  using (status in ('aguardando', 'jogando'));

-- Jogadores: membro da sala pode ler todos os jogadores da mesma sala
create policy "leitura jogadores" on public.jogadores
  for select to authenticated
  using (
    sala_id in (
      select sala_id from public.jogadores where user_id = auth.uid()
    )
  );

-- Rodadas: membro da sala pode ler rodadas (estado oculta espia_ids em jogando/votacao)
create policy "leitura rodadas" on public.rodadas
  for select to authenticated
  using (
    sala_id in (
      select sala_id from public.jogadores where user_id = auth.uid()
    )
  );

-- Votos: membro da sala pode ler votos da sua rodada
create policy "leitura votos" on public.votos
  for select to authenticated
  using (
    rodada_id in (
      select r.id from public.rodadas r
      join public.jogadores j on j.sala_id = r.sala_id
      where j.user_id = auth.uid()
    )
  );
```

- [ ] **Aplicar migrations ao banco local**

```bash
supabase db reset
```
Esperado: migrations aplicadas sem erros.

- [ ] **Commit**

```bash
git add supabase/migrations/20260521000002_rls_policies.sql \
  && git commit -m "feat: RLS policies de leitura"
```

---

## Task 11: Browser Supabase client + variáveis de ambiente

**Files:**
- Create: `web/src/lib/supabase.ts`
- Create: `web/.env.local` (não commitado)
- Modify: `web/.gitignore`

- [ ] **Instalar `@supabase/supabase-js` no projeto web**

```bash
cd web && npm install @supabase/supabase-js
```

- [ ] **Criar `.env.local`**

```bash
# web/.env.local  — NÃO commitar
NEXT_PUBLIC_SUPABASE_URL=http://localhost:54321
NEXT_PUBLIC_SUPABASE_ANON_KEY=<anon key mostrada por `supabase start`>
```

Para obter as chaves:
```bash
supabase status
# Copiar "anon key" para NEXT_PUBLIC_SUPABASE_ANON_KEY
```

- [ ] **Garantir que `.env.local` está no `.gitignore`**

Verificar que `web/.gitignore` (ou raiz) contém `.env.local`. Adicionar se não tiver:
```
.env.local
```

- [ ] **Criar `web/src/lib/supabase.ts`**

```typescript
// web/src/lib/supabase.ts
import { createBrowserClient } from "@supabase/ssr";

export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
}
```

- [ ] **Instalar pacote SSR do Supabase**

```bash
cd web && npm install @supabase/ssr
```

- [ ] **Commit (sem `.env.local`)**

```bash
git add web/src/lib/supabase.ts web/.gitignore web/package.json web/package-lock.json \
  && git commit -m "feat: browser Supabase client"
```

---

## Task 12: `game-actions.ts` — wrappers tipados

**Files:**
- Create: `web/src/lib/game-actions.ts`

- [ ] **Criar `web/src/lib/game-actions.ts`**

```typescript
// web/src/lib/game-actions.ts
import { createClient } from "./supabase";

async function callGame<T>(action: string, payload: unknown): Promise<T> {
  const supabase = createClient();
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) throw new Error("Sessão não encontrada");

  const url = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/game`;
  const res = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${session.access_token}`,
      apikey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    },
    body: JSON.stringify({ action, payload }),
  });

  const json = await res.json();
  if (json.error) throw new Error(json.error);
  return json as T;
}

export interface SalaComJogador {
  sala: { id: string; codigo: string; num_rodadas: number; status: string };
  jogador: { id: string; apelido: string };
}

export const gameActions = {
  criarSala: (apelido: string, num_rodadas: number, senha?: string) =>
    callGame<SalaComJogador>("criar_sala", { apelido, num_rodadas, senha }),

  entrarSala: (codigo: string, apelido: string, senha?: string) =>
    callGame<SalaComJogador>("entrar_sala", { codigo, apelido, senha }),

  iniciarRodada: (sala_id: string) =>
    callGame("iniciar_rodada", { sala_id }),

  proximoTurno: (rodada_id: string) =>
    callGame("proximo_turno", { rodada_id }),

  acusar: (rodada_id: string, acusado_id: string) =>
    callGame("acusar", { rodada_id, acusado_id }),

  votar: (rodada_id: string, aprovado: boolean) =>
    callGame("votar", { rodada_id, aprovado }),

  adivinhar: (rodada_id: string, evento_id: number) =>
    callGame("adivinhar", { rodada_id, evento_id }),
};
```

- [ ] **Commit**

```bash
git add web/src/lib/game-actions.ts \
  && git commit -m "feat: game-actions wrappers tipados para Edge Function"
```

---

## Task 13: Hooks Realtime — `useGameState` e `usePlayers`

**Files:**
- Create: `web/src/hooks/useGameState.ts`
- Create: `web/src/hooks/usePlayers.ts`

- [ ] **Criar `web/src/hooks/usePlayers.ts`**

```typescript
// web/src/hooks/usePlayers.ts
"use client";
import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase";

export interface Player {
  id: string;
  apelido: string;
  pontuacao: number;
  ativo: boolean;
  conectado: boolean;
  user_id: string | null;
}

export function usePlayers(salaId: string | null) {
  const [players, setPlayers] = useState<Player[]>([]);

  useEffect(() => {
    if (!salaId) return;
    const supabase = createClient();

    // Carga inicial
    supabase
      .from("jogadores")
      .select("id, apelido, pontuacao, ativo, conectado, user_id")
      .eq("sala_id", salaId)
      .then(({ data }) => { if (data) setPlayers(data); });

    // Subscription Realtime
    const channel = supabase
      .channel(`players:${salaId}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "jogadores", filter: `sala_id=eq.${salaId}` },
        () => {
          supabase
            .from("jogadores")
            .select("id, apelido, pontuacao, ativo, conectado, user_id")
            .eq("sala_id", salaId)
            .then(({ data }) => { if (data) setPlayers(data); });
        }
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [salaId]);

  return players;
}
```

- [ ] **Criar `web/src/hooks/useGameState.ts`**

```typescript
// web/src/hooks/useGameState.ts
"use client";
import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase";

export interface EstadoRodada {
  fase: "jogando" | "votacao" | "adivinhacao" | "resultado";
  turno_atual: string;
  ordem_turnos: string[];
  espia_ids: string[];   // preenchido apenas na fase resultado
  timer_end: string;
  eliminacoes_erradas: number;
  acusado_id: string | null;
  adivinhou_evento_id: number | null;
}

export interface RodadaAtual {
  id: string;
  numero: number;
  evento_id: number;
  estado: EstadoRodada;
  encerrada_em: string | null;
}

export function useGameState(salaId: string | null) {
  const [rodada, setRodada] = useState<RodadaAtual | null>(null);

  useEffect(() => {
    if (!salaId) return;
    const supabase = createClient();

    async function fetchRodadaAtual() {
      const { data } = await supabase
        .from("rodadas")
        .select("id, numero, evento_id, estado, encerrada_em")
        .eq("sala_id", salaId!)
        .order("numero", { ascending: false })
        .limit(1)
        .maybeSingle();
      if (data) setRodada(data);
    }

    fetchRodadaAtual();

    const channel = supabase
      .channel(`rodada:${salaId}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "rodadas", filter: `sala_id=eq.${salaId}` },
        () => { fetchRodadaAtual(); }
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [salaId]);

  return rodada;
}
```

- [ ] **Commit**

```bash
git add web/src/hooks/ \
  && git commit -m "feat: hooks Realtime useGameState e usePlayers"
```

---

## Task 14: Auth — sessão anônima automática + link Google

**Files:**
- Create: `web/src/hooks/useAuth.ts`
- Modify: `web/src/app/layout.tsx`

- [ ] **Criar `web/src/hooks/useAuth.ts`**

```typescript
// web/src/hooks/useAuth.ts
"use client";
import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase";
import type { User } from "@supabase/supabase-js";

export function useAuth() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const supabase = createClient();

    async function init() {
      const { data: { session } } = await supabase.auth.getSession();

      if (!session) {
        // Criar sessão anônima automaticamente
        const { data } = await supabase.auth.signInAnonymously();
        setUser(data.user);
      } else {
        setUser(session.user);
      }
      setLoading(false);
    }

    init();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
    });

    return () => subscription.unsubscribe();
  }, []);

  async function linkGoogle() {
    const supabase = createClient();
    await supabase.auth.linkIdentity({ provider: "google" });
  }

  const isAnonymous = user?.is_anonymous ?? true;

  return { user, loading, isAnonymous, linkGoogle };
}
```

- [ ] **Criar `web/src/components/AuthProvider.tsx`**

```typescript
// web/src/components/AuthProvider.tsx
"use client";
import { useAuth } from "@/hooks/useAuth";

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const { loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-dvh flex items-center justify-center bg-[var(--parchment)]">
        <p className="font-display text-xs tracking-widest text-[var(--muted)] uppercase animate-pulse">
          Iniciando...
        </p>
      </div>
    );
  }

  return <>{children}</>;
}
```

- [ ] **Adicionar `AuthProvider` ao layout**

Editar `web/src/app/layout.tsx` para envolver `{children}` com `<AuthProvider>`:

```typescript
import { AuthProvider } from "@/components/AuthProvider";

// ... dentro do RootLayout:
<body className="min-h-full flex flex-col antialiased">
  <AuthProvider>{children}</AuthProvider>
</body>
```

- [ ] **Commit**

```bash
git add web/src/hooks/useAuth.ts web/src/components/AuthProvider.tsx web/src/app/layout.tsx \
  && git commit -m "feat: auth anônima automática + link Google"
```

---

## Task 15: Conectar telas Home, Criar e Entrar

**Files:**
- Modify: `web/src/app/page.tsx`
- Modify: `web/src/app/criar/page.tsx`
- Modify: `web/src/app/entrar/page.tsx`

- [ ] **Atualizar `web/src/app/page.tsx`** — remover lógica de entrar inline (manter apenas os dois botões + modal de código)

O comportamento do botão "Entrar em Sala" permanece igual ao mock atual (campo de código inline). Nenhuma chamada de API na home — a entrada acontece na `/entrar`.

Verificar que os links `/criar` e `/entrar?code=XXXX` continuam funcionando. Sem alteração de lógica necessária.

- [ ] **Atualizar `web/src/app/criar/page.tsx`**

Substituir conteúdo por versão conectada ao backend:

```typescript
"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { gameActions } from "@/lib/game-actions";
import { toast } from "sonner";

export default function CriarPage() {
  const router = useRouter();
  const [apelido, setApelido] = useState("");
  const [numRodadas, setNumRodadas] = useState(5);
  const [senha, setSenha] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleCriar() {
    if (!apelido.trim()) return;
    setLoading(true);
    try {
      const { sala } = await gameActions.criarSala(
        apelido.trim(),
        numRodadas,
        senha || undefined
      );
      router.push(`/sala/${sala.codigo}/lobby`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erro ao criar sala");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="relative min-h-dvh flex flex-col px-5 pt-12 pb-10 max-w-sm mx-auto">
      <Link href="/" className="font-display text-xs tracking-widest text-[var(--muted)] hover:text-[var(--stone)] transition-colors mb-8 inline-flex items-center gap-2">
        ← Voltar
      </Link>

      <div className="flex-1 flex flex-col gap-8 animate-fade-up">
        <div>
          <p className="font-display text-[10px] tracking-[0.35em] text-[var(--gold)] uppercase mb-2">Nova Partida</p>
          <h2 className="font-display text-3xl font-bold text-[var(--stone)] leading-tight">Criar<br />Sala</h2>
        </div>

        <div className="card p-6 flex flex-col gap-6">
          <Input id="apelido" label="Seu Apelido" placeholder="Ex: Davi, Ester..." value={apelido} onChange={e => setApelido(e.target.value)} maxLength={20} />

          <div className="flex flex-col gap-2">
            <p className="font-display text-[10px] tracking-widest text-[var(--muted)] uppercase">Número de Rodadas</p>
            <div className="flex gap-2 flex-wrap">
              {[3, 5, 7, 10].map(n => (
                <button key={n} onClick={() => setNumRodadas(n)}
                  className="h-12 w-14 rounded-xl border-2 font-display font-bold text-lg transition-all"
                  style={{ borderColor: numRodadas === n ? "var(--gold)" : "var(--border)", color: numRodadas === n ? "var(--gold)" : "var(--stone-mid)", background: numRodadas === n ? "var(--gold-bg)" : "white" }}>
                  {n}
                </button>
              ))}
            </div>
          </div>

          <Input id="senha" label="Senha (opcional)" placeholder="Deixe vazio para sala pública" value={senha} onChange={e => setSenha(e.target.value)} maxLength={20} type="password" />
        </div>

        <div className="mt-auto pt-4">
          <Button variant="primary" size="lg" className="w-full font-display tracking-widest text-sm" disabled={!apelido.trim() || loading} onClick={handleCriar}>
            {loading ? "Criando..." : "Criar Sala ✦"}
          </Button>
        </div>
      </div>
    </main>
  );
}
```

- [ ] **Atualizar `web/src/app/entrar/page.tsx`**

```typescript
"use client";
import { useState, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { gameActions } from "@/lib/game-actions";
import { toast } from "sonner";

function EntrarForm() {
  const params = useSearchParams();
  const router = useRouter();
  const [codigo] = useState((params.get("code") ?? "").toUpperCase());
  const [apelido, setApelido] = useState("");
  const [senha, setSenha] = useState("");
  const [precisaSenha, setPrecisaSenha] = useState(false);
  const [loading, setLoading] = useState(false);

  async function handleEntrar() {
    if (!apelido.trim() || codigo.length < 4) return;
    setLoading(true);
    try {
      const { sala } = await gameActions.entrarSala(codigo, apelido.trim(), senha || undefined);
      router.push(`/sala/${sala.codigo}/lobby`);
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Erro ao entrar";
      if (msg.toLowerCase().includes("senha")) setPrecisaSenha(true);
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex-1 flex flex-col gap-8 animate-fade-up">
      <div>
        <p className="font-display text-[10px] tracking-[0.35em] text-[var(--gold)] uppercase mb-2">Entrar na Partida</p>
        <h2 className="font-display text-3xl font-bold text-[var(--stone)] leading-tight">
          Sala<br /><span className="text-[var(--gold)]">{codigo || "——"}</span>
        </h2>
      </div>

      <div className="card p-6 flex flex-col gap-6">
        <Input id="apelido" label="Seu Apelido" placeholder="Ex: Maria, Moisés..." value={apelido} onChange={e => setApelido(e.target.value)} maxLength={20} />
        {precisaSenha && (
          <Input id="senha" label="Senha da Sala" placeholder="Digite a senha" value={senha} onChange={e => setSenha(e.target.value)} type="password" />
        )}
      </div>

      <div className="mt-auto pt-4">
        <Button variant="primary" size="lg" className="w-full font-display tracking-widest text-sm"
          disabled={!apelido.trim() || codigo.length < 4 || loading} onClick={handleEntrar}>
          {loading ? "Entrando..." : "Entrar na Sala →"}
        </Button>
      </div>
    </div>
  );
}

export default function EntrarPage() {
  return (
    <main className="relative min-h-dvh flex flex-col px-5 pt-12 pb-10 max-w-sm mx-auto">
      <Link href="/" className="font-display text-xs tracking-widest text-[var(--muted)] hover:text-[var(--stone)] transition-colors mb-8 inline-flex items-center gap-2">← Voltar</Link>
      <Suspense fallback={null}><EntrarForm /></Suspense>
    </main>
  );
}
```

- [ ] **Adicionar `<Toaster />` do Sonner ao layout**

Em `web/src/app/layout.tsx`, importar e adicionar:
```typescript
import { Toaster } from "sonner";

// dentro do body:
<AuthProvider>{children}</AuthProvider>
<Toaster position="top-center" />
```

- [ ] **Commit**

```bash
git add web/src/app/page.tsx web/src/app/criar/page.tsx web/src/app/entrar/page.tsx \
        web/src/app/layout.tsx \
  && git commit -m "feat: conecta telas criar e entrar sala ao backend"
```

---

## Task 16: Conectar Lobby, Jogo e Resultado

**Files:**
- Modify: `web/src/app/sala/[code]/lobby/page.tsx`
- Modify: `web/src/app/sala/[code]/jogo/page.tsx`
- Modify: `web/src/app/sala/[code]/resultado/page.tsx`

- [ ] **Atualizar `lobby/page.tsx`**

```typescript
"use client";
import Link from "next/link";
import { use, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { usePlayers } from "@/hooks/usePlayers";
import { useAuth } from "@/hooks/useAuth";
import { gameActions } from "@/lib/game-actions";
import { createClient } from "@/lib/supabase";
import { toast } from "sonner";
import { useEffect } from "react";

function PlayerAvatar({ name, isHost }: { name: string; isHost?: boolean }) {
  return (
    <div className="flex items-center gap-3 py-3">
      <div className="relative">
        <div className="w-10 h-10 rounded-full bg-[var(--gold-bg)] border-2 border-[var(--gold-light)] flex items-center justify-center">
          <span className="font-display text-sm font-bold text-[var(--gold)]">{name.slice(0, 2).toUpperCase()}</span>
        </div>
        {isHost && <span className="absolute -top-1 -right-1 text-[10px]">✦</span>}
      </div>
      <div className="flex-1">
        <p className="font-body font-bold text-[var(--stone)] text-sm">{name}</p>
        {isHost && <p className="text-[10px] text-[var(--gold)] font-display tracking-widest">ANFITRIÃO</p>}
      </div>
      <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
    </div>
  );
}

export default function LobbyPage({ params }: { params: Promise<{ code: string }> }) {
  const { code } = use(params);
  const router = useRouter();
  const { user } = useAuth();
  const [salaId, setSalaId] = useState<string | null>(null);
  const [anfitriaoId, setAnfitriaoId] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [starting, setStarting] = useState(false);
  const players = usePlayers(salaId);

  useEffect(() => {
    const supabase = createClient();
    supabase.from("salas").select("id, anfitriao, status").eq("codigo", code).single()
      .then(({ data }) => {
        if (!data) { toast.error("Sala não encontrada"); router.push("/"); return; }
        if (data.status === "jogando") { router.push(`/sala/${code}/jogo`); return; }
        setSalaId(data.id);
        setAnfitriaoId(data.anfitriao);
      });
  }, [code, router]);

  // Redirecionar quando jogo iniciar
  useEffect(() => {
    if (!salaId) return;
    const supabase = createClient();
    const channel = supabase
      .channel(`sala-status:${salaId}`)
      .on("postgres_changes", { event: "UPDATE", schema: "public", table: "salas", filter: `id=eq.${salaId}` },
        (payload) => { if (payload.new.status === "jogando") router.push(`/sala/${code}/jogo`); })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [salaId, code, router]);

  const isHost = user?.id === anfitriaoId;

  async function handleIniciar() {
    if (!salaId) return;
    setStarting(true);
    try {
      await gameActions.iniciarRodada(salaId);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erro ao iniciar");
      setStarting(false);
    }
  }

  function copyCode() {
    navigator.clipboard.writeText(code).catch(() => {});
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <main className="relative min-h-dvh flex flex-col px-5 pt-10 pb-10 max-w-sm mx-auto gap-6">
      <header className="flex items-center justify-between animate-fade-up">
        <div>
          <p className="font-display text-[10px] tracking-[0.3em] text-[var(--muted)] uppercase">Sala de Espera</p>
          <h2 className="font-display text-xl font-bold text-[var(--stone)]">Missão Espia</h2>
        </div>
        <Link href="/" className="text-xs text-[var(--muted)] font-display tracking-wider hover:text-[var(--stone)] transition-colors">Sair</Link>
      </header>

      <div className="card p-5 flex flex-col items-center gap-3 animate-fade-up delay-100 animate-pulse-gold">
        <p className="font-display text-[10px] tracking-[0.35em] text-[var(--muted)] uppercase">Compartilhe o Código</p>
        <div className="room-code">{code}</div>
        <button onClick={copyCode} className="text-xs font-display tracking-widest text-[var(--gold)] hover:text-[var(--gold-light)] transition-colors">
          {copied ? "✓ Copiado!" : "Toque para copiar"}
        </button>
      </div>

      <div className="card p-5 flex flex-col gap-1 animate-fade-up delay-200 flex-1">
        <div className="flex items-center justify-between mb-2">
          <p className="font-display text-[10px] tracking-widest text-[var(--muted)] uppercase">Jogadores</p>
          <span className="text-xs font-body text-[var(--muted)]">{players.length} / 12</span>
        </div>
        <div className="divide-y divide-[var(--border)]">
          {players.map(p => (
            <PlayerAvatar key={p.id} name={p.apelido} isHost={p.user_id === anfitriaoId} />
          ))}
        </div>
        {players.length < 4 && (
          <p className="text-xs text-[var(--muted)] font-light italic text-center mt-3">
            Aguardando mínimo de 4 jogadores...
          </p>
        )}
      </div>

      <div className="animate-fade-up delay-400">
        {isHost ? (
          <Button variant="primary" size="lg" className="w-full font-display tracking-widest text-sm"
            disabled={players.length < 4 || starting} onClick={handleIniciar}>
            {starting ? "Iniciando..." : "Iniciar Partida ✦"}
          </Button>
        ) : (
          <p className="text-center text-sm text-[var(--muted)] font-display tracking-wider">
            Aguardando o anfitrião iniciar...
          </p>
        )}
      </div>
    </main>
  );
}
```

- [ ] **Atualizar `jogo/page.tsx`** — substituir mocks por hooks reais

Substituir o bloco de constantes mock no topo por:

```typescript
const { user } = useAuth();
const [salaId, setSalaId] = useState<string | null>(null);
const players = usePlayers(salaId);
const rodada = useGameState(salaId);
```

E buscar `salaId` via `createClient().from("salas").select("id").eq("codigo", code).single()` no `useEffect`.

Substituir `isSpy` por:
```typescript
const meuJogador = players.find(p => p.user_id === user?.id);
const isSpy = rodada
  ? (rodada.estado.espia_ids ?? []).includes(meuJogador?.id ?? "")
  : false;
```

Substituir chamadas de ação (acusar, votar, adivinhar) pelos métodos de `gameActions`.

O timer deve ler `rodada.estado.timer_end` em vez de `TOTAL_SECONDS`.

- [ ] **Atualizar `resultado/page.tsx`** — substituir mocks por dados reais

```typescript
const rodada = useGameState(salaId);
const players = usePlayers(salaId);
```

Usar `rodada.estado.espia_ids` para marcar espias, `players` para lista de pontuação.

- [ ] **Verificação final: fluxo completo**

```bash
# Terminal 1: banco local
supabase start

# Terminal 2: Edge Function
supabase functions serve game --env-file supabase/.env.local

# Terminal 3: Next.js
cd web && npm run dev
```

Testar o fluxo completo:
1. Abrir `http://localhost:3000` → sessão anônima criada automaticamente
2. Criar sala → código gerado, lobby aberto
3. Abrir segundo aba como outro jogador → entrar com o código
4. Iniciar partida → cartas distribuídas, timer iniciando
5. Avançar turnos → Realtime atualiza em ambas as abas
6. Acusar → votação em tempo real
7. Encerrar rodada → resultado e pontuação

- [ ] **Commit final**

```bash
git add web/src/app/sala/ \
  && git commit -m "feat: conecta lobby, jogo e resultado ao Supabase backend"
```

---

## Checklist de Verificação Final

- [ ] `supabase db reset` aplica todas as migrations sem erro
- [ ] `deno test` passa em `lib/pontuacao_test.ts` e `lib/espias_test.ts`
- [ ] Edge Function serve localmente sem erros de importação
- [ ] Fluxo anônimo funciona sem login
- [ ] Link Google não quebra sessão existente
- [ ] Realtime atualiza lobby e jogo em múltiplas abas simultaneamente
- [ ] RLS bloqueia leitura de sala de jogador que não é membro
