# Modo Presencial — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Adicionar modo de sala "presencial" — sem chat, com botão único "Concluí turno" para jogadores fisicamente juntos.

**Architecture:** Coluna `modo` em `salas` controla o comportamento. Backend reusa handlers existentes (`proximo-turno`, `acusar`, `votar`, `adivinhar`) com pequenas ramificações; handlers de texto (`dizer-palavra`, `fazer-pergunta`, `responder-pergunta`) são bloqueados em sala presencial. Frontend ganha um toggle no lobby e um componente `<TurnoPresencial />` que substitui a faixa de ação central na tela do jogo.

**Tech Stack:** Supabase (Edge Functions em Deno + Postgres), Next.js 15 (App Router), TypeScript, Vitest + Testing Library no frontend, Deno test no backend.

**Spec:** `docs/superpowers/specs/2026-05-22-modo-presencial-design.md`

---

## File Structure

**Criar:**
- `supabase/migrations/20260522000006_modo_presencial.sql` — adiciona coluna `modo` em `salas`
- `supabase/functions/game/handlers/definir-modo.ts` — handler para anfitrião mudar modo
- `supabase/functions/game/handlers/definir-modo_test.ts` — testes unitários da função pura (validação)
- `supabase/functions/game/lib/modo.ts` — função pura `validarTrocaModo()` (testável sem DB)
- `supabase/functions/game/lib/modo_test.ts` — testes da função pura
- `web/src/app/sala/[code]/jogo/turno-presencial.tsx` — componente da faixa de ação presencial
- `web/src/__tests__/lobby-modo-toggle.test.tsx` — testes do toggle no lobby
- `web/src/__tests__/jogo-presencial-turno.test.tsx` — testes da faixa de ação presencial
- `web/src/__tests__/jogo-presencial-historico.test.tsx` — testes do histórico presencial

**Modificar:**
- `supabase/functions/game/lib/types.ts` — `ModoSala`, `Sala.modo`, `CriarSalaPayload.modo`, `HistoricoTurnoPresencial`
- `supabase/functions/game/handlers/criar-sala.ts` — aceitar `modo` no payload
- `supabase/functions/game/handlers/proximo-turno.ts` — anexar histórico presencial se aplicável
- `supabase/functions/game/handlers/dizer-palavra.ts` — bloquear em sala presencial
- `supabase/functions/game/handlers/fazer-pergunta.ts` — bloquear em sala presencial
- `supabase/functions/game/handlers/responder-pergunta.ts` — bloquear em sala presencial
- `supabase/functions/game/index.ts` — registrar action `definir_modo`
- `web/src/lib/game-actions.ts` — adicionar `definirModo()` e parâmetro `modo` em `criarSala()`
- `web/src/hooks/useGameState.ts` — exportar tipo `HistoricoTurnoPresencial` no union `HistoricoItem`
- `web/src/app/sala/[code]/lobby/page.tsx` — toggle de modo + leitura `salas.modo`
- `web/src/app/sala/[code]/jogo/page.tsx` — ler `salas.modo`, renderizar `<TurnoPresencial />` no presencial, esconder inputs de texto, mostrar histórico presencial

---

## Task 1: Migração — coluna `modo` em `salas`

**Files:**
- Create: `supabase/migrations/20260522000006_modo_presencial.sql`

- [ ] **Step 1: Criar arquivo de migração**

```sql
-- supabase/migrations/20260522000006_modo_presencial.sql
alter table public.salas
  add column modo text not null default 'online'
    check (modo in ('online', 'presencial'));
```

- [ ] **Step 2: Aplicar migração no Supabase local**

Run: `npx supabase db push` (ou o comando equivalente usado no projeto — verificar `setup.md` se necessário)
Expected: migração aplicada sem erros.

- [ ] **Step 3: Verificar coluna existe**

Run: `npx supabase db diff` ou via psql: `select column_name, data_type, column_default from information_schema.columns where table_name = 'salas' and column_name = 'modo';`
Expected: `modo | text | 'online'::text`

- [ ] **Step 4: Commit**

```bash
git add supabase/migrations/20260522000006_modo_presencial.sql
git commit -m "feat(db): adiciona coluna modo em salas"
```

---

## Task 2: Tipos compartilhados — `ModoSala`, `HistoricoTurnoPresencial`

**Files:**
- Modify: `supabase/functions/game/lib/types.ts`

- [ ] **Step 1: Adicionar tipos no `types.ts`**

Substituir os trechos correspondentes em `supabase/functions/game/lib/types.ts`:

```ts
// Logo após FaseJogo:
export type ModoSala = "online" | "presencial";

// Adicionar nova interface antes de HistoricoItem:
export interface HistoricoTurnoPresencial {
  tipo: "turno_presencial";
  jogador_apelido: string;
}

// Atualizar HistoricoItem:
export type HistoricoItem = HistoricoPergunta | HistoricoVotacao | HistoricoTurnoPresencial;

// Atualizar Sala:
export interface Sala {
  id: string;
  codigo: string;
  anfitriao: string | null;
  status: SalaStatus;
  modo: ModoSala;              // NOVO
  num_rodadas: number;
  rodada_atual: number;
  senha_hash: string | null;
  criada_em: string;
}

// Atualizar CriarSalaPayload:
export interface CriarSalaPayload  { apelido: string; num_rodadas: number; modo?: ModoSala; senha?: string; }

// Novo payload (no final, junto dos outros payloads):
export interface DefinirModoPayload { sala_id: string; modo: ModoSala; }
```

- [ ] **Step 2: Verificar compilação Deno**

Run: `cd supabase/functions/game && deno check lib/types.ts`
Expected: nenhum erro.

- [ ] **Step 3: Commit**

```bash
git add supabase/functions/game/lib/types.ts
git commit -m "feat(types): adiciona ModoSala e HistoricoTurnoPresencial"
```

---

## Task 3: Função pura `validarTrocaModo` (TDD)

Função pura para validar se uma troca de modo é permitida (host, sala aguardando). Mantém a lógica testável sem DB.

**Files:**
- Create: `supabase/functions/game/lib/modo.ts`
- Test: `supabase/functions/game/lib/modo_test.ts`

- [ ] **Step 1: Escrever o teste falho**

```ts
// supabase/functions/game/lib/modo_test.ts
import { assertEquals, assertThrows } from "std/assert";
import { validarTrocaModo } from "./modo.ts";

Deno.test("aceita troca para 'presencial' quando user é anfitrião e sala aguardando", () => {
  validarTrocaModo({
    userId: "user-1",
    sala: { anfitriao: "user-1", status: "aguardando" },
    novoModo: "presencial",
  });
});

Deno.test("aceita troca para 'online' quando user é anfitrião e sala aguardando", () => {
  validarTrocaModo({
    userId: "user-1",
    sala: { anfitriao: "user-1", status: "aguardando" },
    novoModo: "online",
  });
});

Deno.test("rejeita quando user não é anfitrião", () => {
  assertThrows(
    () => validarTrocaModo({
      userId: "user-2",
      sala: { anfitriao: "user-1", status: "aguardando" },
      novoModo: "presencial",
    }),
    Error,
    "Apenas o anfitrião",
  );
});

Deno.test("rejeita quando sala já está jogando", () => {
  assertThrows(
    () => validarTrocaModo({
      userId: "user-1",
      sala: { anfitriao: "user-1", status: "jogando" },
      novoModo: "presencial",
    }),
    Error,
    "Não é possível trocar o modo após iniciar",
  );
});

Deno.test("rejeita modo inválido", () => {
  assertThrows(
    () => validarTrocaModo({
      userId: "user-1",
      sala: { anfitriao: "user-1", status: "aguardando" },
      novoModo: "hibrido" as unknown as "presencial",
    }),
    Error,
    "Modo inválido",
  );
});
```

- [ ] **Step 2: Rodar teste para confirmar falha**

Run: `cd supabase/functions/game && deno test lib/modo_test.ts`
Expected: FAIL com erro de módulo `./modo.ts` não encontrado.

- [ ] **Step 3: Implementar a função mínima**

```ts
// supabase/functions/game/lib/modo.ts
import type { ModoSala, SalaStatus } from "./types.ts";

interface ValidarTrocaModoInput {
  userId: string;
  sala: { anfitriao: string | null; status: SalaStatus };
  novoModo: ModoSala;
}

const MODOS_VALIDOS: ModoSala[] = ["online", "presencial"];

export function validarTrocaModo(input: ValidarTrocaModoInput): void {
  if (!MODOS_VALIDOS.includes(input.novoModo)) {
    throw new Error(`Modo inválido: ${input.novoModo}`);
  }
  if (input.sala.anfitriao !== input.userId) {
    throw new Error("Apenas o anfitrião pode trocar o modo da sala");
  }
  if (input.sala.status !== "aguardando") {
    throw new Error("Não é possível trocar o modo após iniciar a partida");
  }
}
```

- [ ] **Step 4: Rodar teste para confirmar passagem**

Run: `cd supabase/functions/game && deno test lib/modo_test.ts`
Expected: PASS (5 testes).

- [ ] **Step 5: Commit**

```bash
git add supabase/functions/game/lib/modo.ts supabase/functions/game/lib/modo_test.ts
git commit -m "feat(backend): validarTrocaModo (função pura + testes)"
```

---

## Task 4: Handler `definir-modo` + roteamento

**Files:**
- Create: `supabase/functions/game/handlers/definir-modo.ts`
- Modify: `supabase/functions/game/index.ts`

- [ ] **Step 1: Implementar o handler**

```ts
// supabase/functions/game/handlers/definir-modo.ts
import { getDb }              from "../lib/db.ts";
import { validarTrocaModo }   from "../lib/modo.ts";
import type { DefinirModoPayload } from "../lib/types.ts";

export async function definirModo(userId: string, payload: unknown) {
  const { sala_id, modo } = payload as DefinirModoPayload;
  if (!sala_id) throw new Error("sala_id obrigatório");

  const db = getDb();

  const { data: sala } = await db
    .from("salas")
    .select("anfitriao, status")
    .eq("id", sala_id)
    .single();

  if (!sala) throw Object.assign(new Error("Sala não encontrada"), { status: 404 });

  validarTrocaModo({ userId, sala, novoModo: modo });

  const { error } = await db.from("salas").update({ modo }).eq("id", sala_id);
  if (error) throw new Error("Falha ao atualizar modo: " + error.message);

  return { ok: true, modo };
}
```

- [ ] **Step 2: Registrar action no router**

Em `supabase/functions/game/index.ts`, adicionar import e case:

```ts
import { definirModo } from "./handlers/definir-modo.ts";
```

Dentro do `switch (action)`, antes do `default`:

```ts
      case "definir_modo":    return json(await definirModo(user.id, payload));
```

- [ ] **Step 3: Type-check Deno**

Run: `cd supabase/functions/game && deno check index.ts handlers/definir-modo.ts`
Expected: nenhum erro.

- [ ] **Step 4: Commit**

```bash
git add supabase/functions/game/handlers/definir-modo.ts supabase/functions/game/index.ts
git commit -m "feat(backend): handler definir-modo"
```

---

## Task 5: `criar-sala` aceita `modo`

**Files:**
- Modify: `supabase/functions/game/handlers/criar-sala.ts`

- [ ] **Step 1: Aceitar e validar `modo` no handler**

Substituir o conteúdo de `supabase/functions/game/handlers/criar-sala.ts`:

```ts
// supabase/functions/game/handlers/criar-sala.ts
import { getDb }              from "../lib/db.ts";
import { gerarCodigoUnico }   from "../lib/codigo.ts";
import { hashSenha }          from "../lib/senha.ts";
import type { CriarSalaPayload, ModoSala } from "../lib/types.ts";

const MODOS_VALIDOS: ModoSala[] = ["online", "presencial"];

export async function criarSala(userId: string, payload: unknown) {
  const { apelido, num_rodadas, modo, senha } = payload as CriarSalaPayload;

  if (!apelido?.trim())        throw new Error("Apelido obrigatório");
  if (!num_rodadas || num_rodadas < 1) throw new Error("Número de rodadas inválido");
  const modoFinal: ModoSala = modo ?? "online";
  if (!MODOS_VALIDOS.includes(modoFinal)) throw new Error(`Modo inválido: ${modoFinal}`);

  const db = getDb();
  const codigo = await gerarCodigoUnico(db);
  const senha_hash = senha ? await hashSenha(senha) : null;

  const { data: sala, error: salaErr } = await db
    .from("salas")
    .insert({ codigo, anfitriao: userId, num_rodadas, modo: modoFinal, senha_hash })
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

- [ ] **Step 2: Type-check**

Run: `cd supabase/functions/game && deno check handlers/criar-sala.ts`
Expected: nenhum erro.

- [ ] **Step 3: Commit**

```bash
git add supabase/functions/game/handlers/criar-sala.ts
git commit -m "feat(backend): criar-sala aceita modo"
```

---

## Task 6: Bloquear handlers de texto no modo presencial

Os três handlers — `dizer-palavra`, `fazer-pergunta`, `responder-pergunta` — não fazem sentido em sala presencial. Adicionar uma consulta a `salas.modo` no início e rejeitar.

**Files:**
- Modify: `supabase/functions/game/handlers/dizer-palavra.ts`
- Modify: `supabase/functions/game/handlers/fazer-pergunta.ts`
- Modify: `supabase/functions/game/handlers/responder-pergunta.ts`

- [ ] **Step 1: Bloquear `dizer-palavra` em sala presencial**

Em `supabase/functions/game/handlers/dizer-palavra.ts`, alterar a query inicial de rodada e adicionar verificação. Substituir as linhas 12-14:

```ts
  const { data: rodada } = await db
    .from("rodadas")
    .select("*, salas(modo)")
    .eq("id", rodada_id)
    .single();
  if (!rodada) throw Object.assign(new Error("Rodada não encontrada"), { status: 404 });
  if (rodada.encerrada_em) throw new Error("Rodada já encerrada");
  if (rodada.salas?.modo === "presencial") throw new Error("Ação indisponível no modo presencial");
```

- [ ] **Step 2: Bloquear `fazer-pergunta` em sala presencial**

Em `supabase/functions/game/handlers/fazer-pergunta.ts`, alterar as linhas 11-13:

```ts
  const { data: rodada } = await db
    .from("rodadas")
    .select("*, salas(modo)")
    .eq("id", rodada_id)
    .single();
  if (!rodada) throw Object.assign(new Error("Rodada não encontrada"), { status: 404 });
  if (rodada.encerrada_em) throw new Error("Rodada já encerrada");
  if (rodada.salas?.modo === "presencial") throw new Error("Ação indisponível no modo presencial");
```

- [ ] **Step 3: Bloquear `responder-pergunta` em sala presencial**

Em `supabase/functions/game/handlers/responder-pergunta.ts`, replicar o mesmo padrão na query inicial da rodada:

```ts
  const { data: rodada } = await db
    .from("rodadas")
    .select("*, salas(modo)")
    .eq("id", rodada_id)
    .single();
  if (!rodada) throw Object.assign(new Error("Rodada não encontrada"), { status: 404 });
  if (rodada.encerrada_em) throw new Error("Rodada já encerrada");
  if (rodada.salas?.modo === "presencial") throw new Error("Ação indisponível no modo presencial");
```

(Localizar e substituir o bloco existente de leitura inicial da rodada nesse arquivo, mantendo o restante da lógica intacto.)

- [ ] **Step 4: Type-check**

Run: `cd supabase/functions/game && deno check handlers/dizer-palavra.ts handlers/fazer-pergunta.ts handlers/responder-pergunta.ts`
Expected: nenhum erro.

- [ ] **Step 5: Commit**

```bash
git add supabase/functions/game/handlers/dizer-palavra.ts supabase/functions/game/handlers/fazer-pergunta.ts supabase/functions/game/handlers/responder-pergunta.ts
git commit -m "feat(backend): bloqueia handlers de texto no modo presencial"
```

---

## Task 7: `proximo-turno` anexa histórico presencial

**Files:**
- Modify: `supabase/functions/game/handlers/proximo-turno.ts`

- [ ] **Step 1: Ler `modo` da sala e anexar histórico se presencial**

Substituir o conteúdo de `supabase/functions/game/handlers/proximo-turno.ts`:

```ts
import { getDb }                from "../lib/db.ts";
import { encerrarRodada }       from "./encerrar-rodada.ts";
import type { ProximoTurnoPayload, HistoricoTurnoPresencial } from "../lib/types.ts";

export async function proximoTurno(userId: string, payload: unknown) {
  const { rodada_id } = payload as ProximoTurnoPayload;
  if (!rodada_id) throw new Error("rodada_id obrigatório");

  const db = getDb();

  const { data: rodada } = await db
    .from("rodadas")
    .select("*, salas(anfitriao, modo)")
    .eq("id", rodada_id)
    .single();

  if (!rodada) throw Object.assign(new Error("Rodada não encontrada"), { status: 404 });
  if (rodada.encerrada_em) throw new Error("Rodada já encerrada");

  const estado = rodada.estado;
  if (estado.fase !== "jogando") throw new Error(`Não é possível avançar turno na fase '${estado.fase}'`);

  if (new Date() > new Date(estado.timer_end)) {
    return encerrarRodada(userId, { rodada_id, espia_pego: false, espia_adivinhou: false });
  }

  // Buscar apelido do jogador do turno atual (para o histórico presencial)
  const { data: jogadorAtual } = await db
    .from("jogadores")
    .select("id, apelido")
    .eq("id", estado.turno_atual)
    .single();

  const modo = rodada.salas?.modo ?? "online";

  // Avançar turno
  const idx = estado.ordem_turnos.indexOf(estado.turno_atual);
  const proximo = estado.ordem_turnos[(idx + 1) % estado.ordem_turnos.length];

  const novoHistorico = [...(estado.historico ?? [])];
  if (modo === "presencial" && jogadorAtual) {
    const item: HistoricoTurnoPresencial = {
      tipo: "turno_presencial",
      jogador_apelido: jogadorAtual.apelido,
    };
    novoHistorico.push(item);
  }

  // Verificar se devemos encerrar a primeira rodada (presencial não usa palavras)
  let novaPrimeiraRodada = estado.primeira_rodada;
  if (modo === "presencial" && estado.primeira_rodada) {
    const { data: jogadoresAtivos } = await db
      .from("jogadores")
      .select("id")
      .eq("sala_id", rodada.sala_id)
      .eq("ativo", true);
    const turnosPresenciais = novoHistorico.filter(h => h.tipo === "turno_presencial").length;
    if (jogadoresAtivos && turnosPresenciais >= jogadoresAtivos.length) {
      novaPrimeiraRodada = false;
    }
  }

  const { error } = await db
    .from("rodadas")
    .update({
      estado: {
        ...estado,
        turno_atual: proximo,
        acusou_neste_turno: false,
        historico: novoHistorico,
        primeira_rodada: novaPrimeiraRodada,
      },
    })
    .eq("id", rodada_id);

  if (error) throw new Error("Falha ao avançar turno: " + error.message);

  return { turno_atual: proximo, primeira_rodada: novaPrimeiraRodada };
}
```

- [ ] **Step 2: Type-check**

Run: `cd supabase/functions/game && deno check handlers/proximo-turno.ts`
Expected: nenhum erro.

- [ ] **Step 3: Commit**

```bash
git add supabase/functions/game/handlers/proximo-turno.ts
git commit -m "feat(backend): proximo-turno anexa historico presencial e encerra primeira rodada"
```

---

## Task 8: `game-actions` — `definirModo` e `criarSala` com modo

**Files:**
- Modify: `web/src/lib/game-actions.ts`

- [ ] **Step 1: Adicionar `modo` em `criarSala` e novo `definirModo`**

Em `web/src/lib/game-actions.ts`, substituir o método `criarSala` e adicionar `definirModo`:

```ts
  criarSala: (apelido: string, num_rodadas: number, opts?: { modo?: "online" | "presencial"; senha?: string }) =>
    callGame<SalaComJogador>("criar_sala", { apelido, num_rodadas, modo: opts?.modo, senha: opts?.senha }),

  // (mantém entrarSala, iniciarRodada, proximoTurno, etc.)

  definirModo: (sala_id: string, modo: "online" | "presencial") =>
    callGame<{ ok: true; modo: "online" | "presencial" }>("definir_modo", { sala_id, modo }),
```

Atenção: se houver callers existentes de `criarSala(apelido, num_rodadas, senha)`, atualizar para a nova assinatura (`criarSala(apelido, num_rodadas, { senha })`). Localizar e ajustar:

Run: `grep -rn "gameActions.criarSala\|game-actions.*criarSala" web/src`
Expected: lista de chamadas. Ajustar cada uma para passar `{ senha }` se houver senha.

- [ ] **Step 2: Type-check**

Run: `cd web && npx tsc --noEmit`
Expected: nenhum erro.

- [ ] **Step 3: Commit**

```bash
git add web/src/lib/game-actions.ts web/src/app
git commit -m "feat(web): game-actions ganha definirModo e criarSala com modo"
```

---

## Task 9: `useGameState` — exportar `HistoricoTurnoPresencial`

**Files:**
- Modify: `web/src/hooks/useGameState.ts`

- [ ] **Step 1: Atualizar tipos do hook**

Em `web/src/hooks/useGameState.ts`, adicionar (junto dos outros tipos de histórico):

```ts
export interface HistoricoTurnoPresencial {
  tipo: "turno_presencial";
  jogador_apelido: string;
}

export type HistoricoItem = HistoricoPergunta | HistoricoVotacao | HistoricoTurnoPresencial;
```

(Substituir a definição existente de `HistoricoItem`.)

- [ ] **Step 2: Type-check**

Run: `cd web && npx tsc --noEmit`
Expected: nenhum erro.

- [ ] **Step 3: Commit**

```bash
git add web/src/hooks/useGameState.ts
git commit -m "feat(web): tipo HistoricoTurnoPresencial em useGameState"
```

---

## Task 10: Lobby — toggle de modo (TDD)

**Files:**
- Create: `web/src/__tests__/lobby-modo-toggle.test.tsx`
- Modify: `web/src/app/sala/[code]/lobby/page.tsx`

- [ ] **Step 1: Escrever o teste falho**

```tsx
// web/src/__tests__/lobby-modo-toggle.test.tsx
import React from "react";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { vi, describe, it, expect, beforeEach } from "vitest";

vi.mock("next/navigation", () => ({ useRouter: () => ({ push: vi.fn() }) }));

const fromMock = vi.fn();
vi.mock("@/lib/supabase", () => ({
  createClient: () => ({
    from: (...args: unknown[]) => fromMock(...args),
    channel: () => ({ on: () => ({ subscribe: () => ({}) }) }),
    removeChannel: () => {},
  }),
}));

vi.mock("@/hooks/usePlayers", () => ({ usePlayers: () => [] }));
vi.mock("@/hooks/useAuth", () => ({ useAuth: () => ({ user: { id: "host-1" } }) }));

const definirModoMock = vi.fn();
vi.mock("@/lib/game-actions", () => ({
  gameActions: {
    iniciarRodada: vi.fn(),
    definirModo: (...args: unknown[]) => definirModoMock(...args),
  },
}));

vi.mock("sonner", () => ({ toast: { error: vi.fn() } }));

vi.mock("motion/react", async () => {
  const { createElement } = await import("react");
  return {
    motion: new Proxy({} as Record<string, unknown>, {
      get: (_, tag: string) => function Mo({ children, ...rest }: Record<string, unknown>) {
        return createElement(tag as keyof JSX.IntrinsicElements, rest as React.HTMLAttributes<HTMLElement>, children as React.ReactNode);
      },
    }),
    AnimatePresence: ({ children }: { children: React.ReactNode }) => children,
  };
});

vi.mock("@/components/ui/design", () => {
  const T = new Proxy({}, { get: () => "" });
  const F = new Proxy({}, { get: () => "" });
  return {
    ParchmentBg: () => null,
    InsetFrame: () => null,
    MEAvatar: () => null,
    MEIcon: () => null,
    Eyebrow: ({ children }: { children: React.ReactNode }) => <span>{children}</span>,
    PrimaryBtn: ({ children, ...p }: React.ButtonHTMLAttributes<HTMLButtonElement>) => <button {...p}>{children}</button>,
    T, F,
  };
});

import LobbyPage from "@/app/sala/[code]/lobby/page";

function setupSalaResponse(opts: { modo: "online" | "presencial"; status?: "aguardando" | "jogando"; anfitriao?: string }) {
  fromMock.mockImplementation((table: string) => {
    if (table === "salas") {
      return {
        select: () => ({
          eq: () => ({
            single: () => Promise.resolve({
              data: {
                id: "sala-1",
                anfitriao: opts.anfitriao ?? "host-1",
                status: opts.status ?? "aguardando",
                num_rodadas: 3,
                modo: opts.modo,
              },
            }),
          }),
        }),
        update: () => ({ eq: () => Promise.resolve({ error: null }) }),
      };
    }
    return { select: () => ({ eq: () => ({ single: () => Promise.resolve({ data: null }) }) }) };
  });
}

describe("Lobby — toggle de modo", () => {
  beforeEach(() => {
    fromMock.mockReset();
    definirModoMock.mockReset();
  });

  it("anfitrião vê os dois botões de modo e o atual destacado", async () => {
    setupSalaResponse({ modo: "online" });
    render(<LobbyPage params={Promise.resolve({ code: "ABCD" })} />);
    expect(await screen.findByRole("button", { name: /^Online$/ })).toBeDefined();
    expect(screen.getByRole("button", { name: /^Presencial$/ })).toBeDefined();
  });

  it("clicar em Presencial chama gameActions.definirModo", async () => {
    setupSalaResponse({ modo: "online" });
    render(<LobbyPage params={Promise.resolve({ code: "ABCD" })} />);
    const btn = await screen.findByRole("button", { name: /^Presencial$/ });
    fireEvent.click(btn);
    await waitFor(() => expect(definirModoMock).toHaveBeenCalledWith("sala-1", "presencial"));
  });

  it("não-anfitrião vê o modo em modo leitura, sem botões clicáveis", async () => {
    setupSalaResponse({ modo: "presencial", anfitriao: "outro" });
    render(<LobbyPage params={Promise.resolve({ code: "ABCD" })} />);
    expect(await screen.findByText(/Modo:\s*Presencial/i)).toBeDefined();
    expect(screen.queryByRole("button", { name: /^Online$/ })).toBeNull();
    expect(screen.queryByRole("button", { name: /^Presencial$/ })).toBeNull();
  });
});
```

- [ ] **Step 2: Rodar teste para confirmar falha**

Run: `cd web && npx vitest run src/__tests__/lobby-modo-toggle.test.tsx`
Expected: FAIL — botões/rótulo de modo não existem.

- [ ] **Step 3: Implementar o toggle no lobby**

Em `web/src/app/sala/[code]/lobby/page.tsx`:

1. Adicionar `modo` ao state:
```ts
const [modo, setModo] = useState<"online" | "presencial">("online");
```

2. Atualizar o `useEffect` inicial de carregamento (onde já lê `id, anfitriao, status, num_rodadas`) para incluir `modo`:
```ts
supabase.from("salas").select("id, anfitriao, status, num_rodadas, modo").eq("codigo", code).single()
  .then(({ data }) => {
    if (!data) { toast.error("Sala não encontrada"); router.push("/"); return; }
    if (data.status === "jogando") { router.push(`/sala/${code}/jogo`); return; }
    setSalaId(data.id);
    setAnfitriaoId(data.anfitriao);
    setNumRodadas(data.num_rodadas);
    setModo(data.modo ?? "online");
  });
```

3. Atualizar a subscription realtime — quando `payload.new.modo` mudar, atualizar:
```ts
.on("postgres_changes", { event: "UPDATE", schema: "public", table: "salas", filter: `id=eq.${salaId}` },
  (payload) => {
    if (payload.new.status === "jogando") router.push(`/sala/${code}/jogo`);
    if (payload.new.modo) setModo(payload.new.modo);
  })
```

4. Adicionar handler:
```ts
async function handleModoChange(novo: "online" | "presencial") {
  if (!salaId || !isHost || novo === modo) return;
  try {
    await gameActions.definirModo(salaId, novo);
    setModo(novo);
  } catch (err) {
    toast.error(err instanceof Error ? err.message : "Falha ao mudar modo");
  }
}
```

5. Renderizar o toggle (próximo ao botão "Iniciar"). Quando `isHost`:
```tsx
<div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 16 }}>
  <Eyebrow color={T.inkSoft}>Modo</Eyebrow>
  <div style={{ display: "flex", gap: 8 }}>
    <button
      onClick={() => handleModoChange("online")}
      aria-pressed={modo === "online"}
      style={{
        flex: 1, padding: "10px 14px", borderRadius: 999,
        border: "none", cursor: "pointer",
        background: modo === "online" ? T.ink : T.cardWarm,
        color: modo === "online" ? T.cardWarm : T.ink,
        fontFamily: F.sans, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.08em", fontSize: 12,
      }}
    >Online</button>
    <button
      onClick={() => handleModoChange("presencial")}
      aria-pressed={modo === "presencial"}
      style={{
        flex: 1, padding: "10px 14px", borderRadius: 999,
        border: "none", cursor: "pointer",
        background: modo === "presencial" ? T.ink : T.cardWarm,
        color: modo === "presencial" ? T.cardWarm : T.ink,
        fontFamily: F.sans, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.08em", fontSize: 12,
      }}
    >Presencial</button>
  </div>
  {modo === "presencial" && (
    <div style={{ fontFamily: F.bodySerif, fontSize: 13, color: T.inkSoft, lineHeight: 1.4 }}>
      Para jogo presencial. Cada jogador faz pergunta/responde em voz alta — o app só controla turnos, acusações e tempo.
    </div>
  )}
</div>
```

Quando NÃO `isHost`:
```tsx
<div style={{ fontFamily: F.sans, fontSize: 12, color: T.inkSoft, marginBottom: 16, textTransform: "uppercase", letterSpacing: "0.08em" }}>
  Modo: {modo === "presencial" ? "Presencial" : "Online"}
</div>
```

- [ ] **Step 4: Rodar teste para confirmar passagem**

Run: `cd web && npx vitest run src/__tests__/lobby-modo-toggle.test.tsx`
Expected: PASS (3 testes).

- [ ] **Step 5: Rodar suíte de regressão do frontend**

Run: `cd web && npm test`
Expected: PASS (todos os testes existentes continuam verdes).

- [ ] **Step 6: Commit**

```bash
git add web/src/__tests__/lobby-modo-toggle.test.tsx web/src/app/sala/\[code\]/lobby/page.tsx
git commit -m "feat(lobby): toggle de modo online/presencial"
```

---

## Task 11: Componente `<TurnoPresencial />` (TDD)

**Files:**
- Create: `web/src/app/sala/[code]/jogo/turno-presencial.tsx`
- Create: `web/src/__tests__/jogo-presencial-turno.test.tsx`

- [ ] **Step 1: Escrever os testes falhos**

```tsx
// web/src/__tests__/jogo-presencial-turno.test.tsx
import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";

vi.mock("@/components/ui/design", () => {
  const T = new Proxy({}, { get: () => "" });
  const F = new Proxy({}, { get: () => "" });
  return {
    InsetFrame: () => null,
    MEAvatar: () => null,
    Eyebrow: ({ children }: { children: React.ReactNode }) => <span>{children}</span>,
    PrimaryBtn: ({ children, ...p }: React.ButtonHTMLAttributes<HTMLButtonElement>) => <button {...p}>{children}</button>,
    T, F,
  };
});

vi.mock("motion/react", async () => {
  const { createElement } = await import("react");
  return {
    motion: new Proxy({} as Record<string, unknown>, {
      get: (_, tag: string) => function Mo({ children, ...rest }: Record<string, unknown>) {
        return createElement(tag as keyof JSX.IntrinsicElements, rest as React.HTMLAttributes<HTMLElement>, children as React.ReactNode);
      },
    }),
    AnimatePresence: ({ children }: { children: React.ReactNode }) => children,
  };
});

import { TurnoPresencial } from "@/app/sala/[code]/jogo/turno-presencial";

describe("<TurnoPresencial />", () => {
  it("vez do jogador, 1ª rodada: mostra 'Diga uma palavra em voz alta' + botão Concluí", () => {
    render(
      <TurnoPresencial
        isMinhaVez
        jogadorAtualApelido="Ana"
        primeiraRodada
        acting={false}
        onConcluir={vi.fn()}
      />,
    );
    expect(screen.getByText(/É sua vez/i)).toBeDefined();
    expect(screen.getByText(/Diga uma palavra em voz alta/i)).toBeDefined();
    expect(screen.getByRole("button", { name: /Conclu[íi] turno/i })).toBeDefined();
  });

  it("vez do jogador, rodada normal: mostra 'Faça uma pergunta em voz alta' + botão Concluí", () => {
    render(
      <TurnoPresencial
        isMinhaVez
        jogadorAtualApelido="Ana"
        primeiraRodada={false}
        acting={false}
        onConcluir={vi.fn()}
      />,
    );
    expect(screen.getByText(/Faça uma pergunta.+em voz alta/i)).toBeDefined();
    expect(screen.getByRole("button", { name: /Conclu[íi] turno/i })).toBeDefined();
  });

  it("tocar 'Concluí turno' chama onConcluir", () => {
    const onConcluir = vi.fn();
    render(
      <TurnoPresencial
        isMinhaVez
        jogadorAtualApelido="Ana"
        primeiraRodada={false}
        acting={false}
        onConcluir={onConcluir}
      />,
    );
    fireEvent.click(screen.getByRole("button", { name: /Conclu[íi] turno/i }));
    expect(onConcluir).toHaveBeenCalled();
  });

  it("vez de outro: mostra 'Vez de X' sem botão Concluí", () => {
    render(
      <TurnoPresencial
        isMinhaVez={false}
        jogadorAtualApelido="Bruno"
        primeiraRodada={false}
        acting={false}
        onConcluir={vi.fn()}
      />,
    );
    expect(screen.getByText(/Vez de\s*Bruno/i)).toBeDefined();
    expect(screen.queryByRole("button", { name: /Conclu[íi] turno/i })).toBeNull();
  });
});
```

- [ ] **Step 2: Rodar teste para confirmar falha**

Run: `cd web && npx vitest run src/__tests__/jogo-presencial-turno.test.tsx`
Expected: FAIL — módulo `turno-presencial` não existe.

- [ ] **Step 3: Implementar o componente**

```tsx
// web/src/app/sala/[code]/jogo/turno-presencial.tsx
"use client";
import { InsetFrame, Eyebrow, PrimaryBtn, T, F } from "@/components/ui/design";

export interface TurnoPresencialProps {
  isMinhaVez: boolean;
  jogadorAtualApelido: string;
  primeiraRodada: boolean;
  acting: boolean;
  onConcluir: () => void | Promise<void>;
}

export function TurnoPresencial({ isMinhaVez, jogadorAtualApelido, primeiraRodada, acting, onConcluir }: TurnoPresencialProps) {
  if (!isMinhaVez) {
    return (
      <div style={{ position: "relative", padding: "14px 16px", background: T.card, borderRadius: 16, textAlign: "center" }}>
        <InsetFrame color={T.sienna} inset={5} radius={12} opacity={0.18} opacity2={0.08} />
        <div style={{ position: "relative", fontFamily: F.serif, fontSize: 18, fontWeight: 600, color: T.ink }}>
          Vez de <span style={{ fontStyle: "italic" }}>{jogadorAtualApelido}</span>
        </div>
      </div>
    );
  }

  const instrucao = primeiraRodada
    ? "Diga uma palavra em voz alta relacionada ao evento ou local."
    : "Faça uma pergunta a alguém em voz alta.";

  return (
    <div style={{ position: "relative", padding: "20px 18px", background: T.cardWarm, borderRadius: 18, display: "flex", flexDirection: "column", gap: 14, alignItems: "center", textAlign: "center" }}>
      <InsetFrame color={T.sienna} inset={6} radius={14} />
      <div style={{ position: "relative", display: "flex", flexDirection: "column", gap: 8, alignItems: "center" }}>
        <Eyebrow color={T.sienna} size={11}>É sua vez</Eyebrow>
        <div style={{ fontFamily: F.bodySerif, fontSize: 17, fontWeight: 500, color: T.ink, lineHeight: 1.35, maxWidth: 320 }}>
          {instrucao}
        </div>
      </div>
      <PrimaryBtn
        disabled={acting}
        onClick={() => { void onConcluir(); }}
        style={{ minWidth: 220 }}
      >
        Concluí turno
      </PrimaryBtn>
    </div>
  );
}
```

- [ ] **Step 4: Rodar teste para confirmar passagem**

Run: `cd web && npx vitest run src/__tests__/jogo-presencial-turno.test.tsx`
Expected: PASS (4 testes).

- [ ] **Step 5: Commit**

```bash
git add web/src/app/sala/\[code\]/jogo/turno-presencial.tsx web/src/__tests__/jogo-presencial-turno.test.tsx
git commit -m "feat(jogo): componente TurnoPresencial"
```

---

## Task 12: Tela do jogo — ramificação por modo + histórico presencial (TDD)

**Files:**
- Create: `web/src/__tests__/jogo-presencial-historico.test.tsx`
- Modify: `web/src/app/sala/[code]/jogo/page.tsx`

- [ ] **Step 1: Escrever teste de integração — vez do jogador no modo presencial**

Adicionar a `web/src/__tests__/jogo-presencial-historico.test.tsx`:

```tsx
// web/src/__tests__/jogo-presencial-historico.test.tsx
import React, { Suspense } from "react";
import { render, screen, waitFor, fireEvent } from "@testing-library/react";
import { vi, describe, it, expect, beforeEach } from "vitest";
import type { RodadaAtual } from "@/hooks/useGameState";

vi.mock("next/navigation", () => ({ useRouter: () => ({ push: vi.fn() }) }));

vi.mock("@/lib/supabase", () => ({
  createClient: () => ({
    from: () => ({
      select: () => ({
        eq: () => ({
          single: () => Promise.resolve({ data: { id: "sala-1", modo: "presencial" } }),
        }),
      }),
    }),
    channel: () => ({ on: () => ({ subscribe: () => ({}) }) }),
    removeChannel: () => {},
  }),
}));

vi.mock("@/hooks/usePlayers", () => ({
  usePlayers: () => [
    { id: "j1", apelido: "Ana", ativo: true },
    { id: "j2", apelido: "Bruno", ativo: true },
    { id: "j3", apelido: "Carla", ativo: true },
  ],
}));

const rodadaMock: { current: RodadaAtual } = {
  current: {
    id: "rod-1",
    numero: 1,
    evento_id: 1,
    estado: {
      fase: "jogando",
      turno_atual: "j1",
      ordem_turnos: ["j1", "j2", "j3"],
      espia_ids: ["j2"],
      timer_end: new Date(Date.now() + 600_000).toISOString(),
      eliminacoes_erradas: 0,
      acusado_id: null,
      acusou_neste_turno: false,
      adivinhou_evento_id: null,
      pergunta_atual: null,
      historico: [
        { tipo: "turno_presencial", jogador_apelido: "Bruno" },
        { tipo: "turno_presencial", jogador_apelido: "Carla" },
      ],
      primeira_rodada: false,
      palavras_primeira_rodada: [],
    },
    encerrada_em: null,
  },
};

vi.mock("@/hooks/useGameState", () => ({
  useGameState: () => rodadaMock.current,
}));

vi.mock("@/hooks/useAuth", () => ({ useAuth: () => ({ user: { id: "user-1" } }) }));

const proximoTurnoMock = vi.fn();
vi.mock("@/lib/game-actions", () => ({
  gameActions: {
    proximoTurno: (...args: unknown[]) => proximoTurnoMock(...args),
    acusar: vi.fn(),
    votar: vi.fn(),
    adivinhar: vi.fn(),
    fazerPergunta: vi.fn(),
    responderPergunta: vi.fn(),
    dizerPalavra: vi.fn(),
  },
}));

vi.mock("sonner", () => ({ toast: { error: vi.fn() } }));
vi.mock("@/lib/eventos", () => ({
  EVENTOS: [{ id: 1, evento: "Travessia do Mar Vermelho", local: "Mar Vermelho", testament: "AT" }],
}));

vi.mock("motion/react", async () => {
  const { createElement } = await import("react");
  return {
    motion: new Proxy({} as Record<string, unknown>, {
      get: (_, tag: string) => function Mo({ children, initial, animate, exit, transition, whileTap, whileHover, variants, ...rest }: Record<string, unknown>) {
        return createElement(tag as keyof JSX.IntrinsicElements, rest as React.HTMLAttributes<HTMLElement>, children as React.ReactNode);
      },
    }),
    AnimatePresence: ({ children }: { children: React.ReactNode }) => children,
  };
});

vi.mock("@/components/ui/design", () => {
  const T = new Proxy({}, { get: () => "" });
  const F = new Proxy({}, { get: () => "" });
  return {
    ParchmentBg: () => null, InsetFrame: () => null, MEMedallion: () => null,
    MEAvatar: ({ initial }: { initial?: string }) => <span data-testid="avatar">{initial}</span>,
    MERule: () => null, MEIcon: () => null,
    Eyebrow: ({ children }: { children: React.ReactNode }) => <span>{children}</span>,
    PrimaryBtn: ({ children, ...p }: React.ButtonHTMLAttributes<HTMLButtonElement>) => <button {...p}>{children}</button>,
    T, F,
  };
});

import JogoPage from "@/app/sala/[code]/jogo/page";

function renderPage() {
  return render(
    <Suspense fallback={null}>
      <JogoPage params={Promise.resolve({ code: "ABCD" })} />
    </Suspense>,
  );
}

describe("Jogo presencial — integração", () => {
  beforeEach(() => {
    proximoTurnoMock.mockReset();
  });

  it("vez do jogador atual: mostra 'Concluí turno' e esconde input de pergunta", async () => {
    rodadaMock.current.estado.turno_atual = "j1"; // simulamos jogador atual = user logado
    // Para o teste, vamos simular meuJogador.id = "j1" via usePlayers (Ana)
    renderPage();
    // Concluí botão visível (após reveal/tap inicial — dependendo de fluxo, ver Step 3 sobre auto-revelar em ambiente de teste)
    expect(await screen.findByRole("button", { name: /Conclu[íi] turno/i })).toBeDefined();
    // Input de pergunta não está presente
    expect(screen.queryByPlaceholderText(/Sua pergunta/i)).toBeNull();
  });

  it("tocar 'Concluí turno' chama gameActions.proximoTurno", async () => {
    rodadaMock.current.estado.turno_atual = "j1";
    renderPage();
    const btn = await screen.findByRole("button", { name: /Conclu[íi] turno/i });
    fireEvent.click(btn);
    await waitFor(() => expect(proximoTurnoMock).toHaveBeenCalledWith("rod-1"));
  });

  it("histórico presencial: mostra chips com apelidos em ordem", async () => {
    rodadaMock.current.estado.turno_atual = "j1";
    renderPage();
    // Histórico renderiza os apelidos dos turnos presenciais
    await waitFor(() => {
      expect(screen.getByText(/Bruno/)).toBeDefined();
      expect(screen.getByText(/Carla/)).toBeDefined();
    });
  });

  it("vez de outro: mostra 'Vez de Bruno' sem botão Concluí", async () => {
    rodadaMock.current.estado.turno_atual = "j2"; // vez do Bruno, não do user (j1)
    renderPage();
    await waitFor(() => expect(screen.getByText(/Vez de\s*Bruno/i)).toBeDefined());
    expect(screen.queryByRole("button", { name: /Conclu[íi] turno/i })).toBeNull();
  });
});
```

Observação sobre `meuJogador`: a tela do jogo identifica o jogador logado via `usePlayers` cruzando com `useAuth().user.id`. No mock acima, ajustar `usePlayers` para retornar `user_id: "user-1"` no jogador `j1`:

```ts
vi.mock("@/hooks/usePlayers", () => ({
  usePlayers: () => [
    { id: "j1", apelido: "Ana", ativo: true, user_id: "user-1" },
    { id: "j2", apelido: "Bruno", ativo: true, user_id: "user-2" },
    { id: "j3", apelido: "Carla", ativo: true, user_id: "user-3" },
  ],
}));
```

(Verificar em `usePlayers.ts` quais campos o hook retorna e ajustar o mock; copiar o padrão de mocks de testes existentes como `jogo-acusar.test.tsx`.)

- [ ] **Step 2: Rodar teste para confirmar falha**

Run: `cd web && npx vitest run src/__tests__/jogo-presencial-historico.test.tsx`
Expected: FAIL — modo presencial não está ramificado na tela do jogo.

- [ ] **Step 3: Ler `modo` da sala em `jogo/page.tsx`**

Em `web/src/app/sala/[code]/jogo/page.tsx`, dentro do `useEffect` (ou hook) que carrega `salaId`, ler também `modo`:

```ts
const [modo, setModo] = useState<"online" | "presencial">("online");
// no useEffect que busca sala:
supabase.from("salas").select("id, modo").eq("codigo", code).single().then(({ data }) => {
  if (data) {
    setSalaId(data.id);
    setModo(data.modo ?? "online");
  }
});
```

Adicionar subscription/polling para `modo` (ou aproveitar a já existente em `salas` se houver — caso contrário criar uma simples).

- [ ] **Step 4: Importar `<TurnoPresencial />` e ramificar a UI**

No topo de `jogo/page.tsx`:
```tsx
import { TurnoPresencial } from "./turno-presencial";
```

Localizar o bloco onde aparecem os botões "Dizer Palavra" / "Fazer Pergunta" / "Passar" (e os sheets `showWordInput`, `showAskQuestion`, `showAnswerQuestion`). Envolver toda essa região com a condição `modo === "online" ? (...) : (...)`:

```tsx
{modo === "presencial" ? (
  <TurnoPresencial
    isMinhaVez={currentPlayer?.id === meuJogador?.id}
    jogadorAtualApelido={currentPlayer?.apelido ?? ""}
    primeiraRodada={primeiraRodada}
    acting={acting}
    onConcluir={async () => {
      if (!rodada) return;
      setActing(true);
      try { await gameActions.proximoTurno(rodada.id); }
      catch (err) { toast.error(err instanceof Error ? err.message : "Erro ao avançar turno"); }
      finally { setActing(false); }
    }}
  />
) : (
  /* bloco original com botões e sheets de pergunta/palavra/resposta */
)}
```

Manter visíveis em ambos os modos: botões "Acusar alguém" e "Adivinhar" (para espia) — eles ficam num bloco separado e não devem ser envolvidos pela condição.

- [ ] **Step 5: Renderizar histórico presencial**

Localizar o bloco que renderiza o histórico (procurar por `historico.map` ou `h.tipo`). Adicionar branch para `tipo === "turno_presencial"`:

```tsx
{rodada.estado.historico.map((h, i) => {
  if ((h as { tipo?: string }).tipo === "turno_presencial") {
    const item = h as { tipo: "turno_presencial"; jogador_apelido: string };
    return (
      <div key={i} style={{ display: "flex", alignItems: "center", gap: 8, padding: "8px 12px", background: T.cardWarm, borderRadius: 999 }}>
        <MEAvatar size={18} initial={item.jogador_apelido.slice(0, 1)} variant="light" />
        <span style={{ fontFamily: F.sans, fontSize: 12, fontWeight: 600, color: T.ink }}>{item.jogador_apelido}</span>
      </div>
    );
  }
  if ((h as { tipo?: string }).tipo === "votacao") { /* render existente */ }
  // ...
})}
```

(Manter as branches existentes para `votacao` e `pergunta`.)

- [ ] **Step 6: Rodar teste para confirmar passagem**

Run: `cd web && npx vitest run src/__tests__/jogo-presencial-historico.test.tsx`
Expected: PASS (4 testes).

- [ ] **Step 7: Rodar suíte completa de regressão**

Run: `cd web && npm test`
Expected: PASS — todos os testes existentes (jogo-acusar, jogo-eliminado, jogo-responder, jogo-votacao, etc.) continuam verdes.

- [ ] **Step 8: Commit**

```bash
git add web/src/__tests__/jogo-presencial-historico.test.tsx web/src/app/sala/\[code\]/jogo/page.tsx
git commit -m "feat(jogo): ramificação por modo + histórico presencial"
```

---

## Task 13: Verificação manual ponta-a-ponta

- [ ] **Step 1: Subir ambiente local**

Run: `cd web && npm run dev` (em terminal separado)
Run: confirmar que Supabase local está ativo (`npx supabase status`).

- [ ] **Step 2: Criar sala e testar fluxo presencial**

1. Acessar `/`, criar sala como anfitrião (apelido "Host").
2. Abrir nova aba/janela anônima, entrar com código (apelido "P2").
3. Repetir para "P3" e "P4" (mínimo 4 jogadores).
4. No lobby do anfitrião, clicar em "Presencial" — confirmar que o toggle atualiza e os outros clientes veem "Modo: Presencial".
5. Iniciar partida.
6. Em cada cliente, na vez do jogador, confirmar:
   - Mostra "É sua vez" + instrução adequada ("Diga uma palavra…" na 1ª rodada, "Faça uma pergunta…" depois).
   - Botão "Concluí turno" funciona e passa para o próximo.
   - Não há inputs de texto.
7. Confirmar que histórico mostra chips com apelidos.
8. Fazer uma acusação, votar, eliminar — confirmar que fluxo de votação continua igual.
9. Se for espia, tentar adivinhar — confirmar que tela de adivinhação funciona.

- [ ] **Step 3: Criar sala em modo online e confirmar regressão**

Repetir fluxo com modo "Online" — confirmar que tudo funciona como antes (inputs de palavra/pergunta/resposta presentes, histórico textual).

- [ ] **Step 4: Documentar resultados**

Anotar qualquer comportamento inesperado. Se tudo passou, prosseguir para o próximo step.

- [ ] **Step 5: Commit (se houve ajustes)**

Se algum ajuste foi necessário, criar commits específicos. Caso contrário, pular.

---

## Self-Review — Verificação Final

- [ ] **Step 1: Conferir cobertura do spec**

Cada requisito do spec tem uma task:
- Migração `modo` em `salas` → Task 1
- Tipos `ModoSala`, `HistoricoTurnoPresencial`, `Sala.modo`, `CriarSalaPayload.modo`, `DefinirModoPayload` → Task 2
- Handler `definir-modo` + roteamento → Task 4 (com `validarTrocaModo` em Task 3)
- `criar-sala` aceita `modo` → Task 5
- `proximo-turno` anexa histórico presencial e encerra 1ª rodada → Task 7
- Bloqueio de `dizer-palavra`/`fazer-pergunta`/`responder-pergunta` em sala presencial → Task 6
- `game-actions` ganha `definirModo` e `criarSala` com modo → Task 8
- `useGameState` exporta `HistoricoTurnoPresencial` → Task 9
- Lobby — toggle de modo, visão leitura para não-anfitrião → Task 10
- `<TurnoPresencial />` componente → Task 11
- Tela do jogo — ramificação por modo + histórico presencial → Task 12
- Regressão online preservada → Task 12 step 7 + Task 13

- [ ] **Step 2: Rodar todos os testes**

Run: `cd web && npm test && cd ../supabase/functions/game && deno test`
Expected: PASS (todos os testes verdes — frontend Vitest + backend Deno).

- [ ] **Step 3: Confirmar conclusão**

Quando tudo passou, o feature está pronto. Considerar abrir PR com referência ao spec.

---

## Notas para o Implementador

- **TDD rígido:** todo handler/componente novo segue Red → Green → Commit. Não pular o passo de rodar o teste falho.
- **Commits frequentes:** uma task = um ou mais commits, mas nunca deixar mais de uma task acumulada sem commitar.
- **Não introduzir abstrações além do necessário** (YAGNI). Se ficar tentado a "também consertar X", não faça — abra issue separada.
- **Mocks:** copiar padrão de `web/src/__tests__/jogo-acusar.test.tsx` para novos testes frontend. Estrutura de mock já testada.
- **Web/AGENTS.md alerta:** Next.js neste projeto tem comportamento diferente do treinamento. Antes de tocar qualquer API do Next, ler o guia indicado em `web/AGENTS.md` (`node_modules/next/dist/docs/`).
- **Modelo de assistente:** o handler `dizer-palavra` continua existindo para o modo online; não removê-lo.
- **`encerrar-rodada` em fim de tempo presencial:** o handler atual já lida com espias revelando — funciona igual; não precisa mudança.
