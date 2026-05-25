# Fim de Tempo — Fase de Adivinhação: Plano de Implementação

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Quando o timer da rodada expira, abrir uma fase de 30s onde todos os espias adivinham simultaneamente antes de encerrar a rodada.

**Architecture:** O frontend detecta `secs === 0` e envia `encerrar_por_tempo`; o backend transiciona para `adivinhacao_fim_tempo`, abre um timer de 30s e registra as adivinhações individuais. Quando todos os espias enviam ou o timer de 30s expira, o backend pontua cada espia independentemente (2 ou 3 pts) e encerra.

**Tech Stack:** Deno/TypeScript (Edge Functions), Next.js 15 App Router, Supabase (Postgres + Realtime), Vitest + React Testing Library

---

## Mapa de Arquivos

| Arquivo | Ação |
|---|---|
| `supabase/functions/game/lib/types.ts` | Modificar — novo valor em `FaseJogo`, campos opcionais em `EstadoRodada`, 3 payloads |
| `web/src/lib/types.ts` | Modificar — espelho do backend |
| `supabase/functions/game/handlers/encerrar-por-tempo.ts` | Criar |
| `supabase/functions/game/handlers/finalizar-adivinhacao-fim-tempo.ts` | Criar (contém helper `_finalizarAdivinhacaoFimTempo` exportado) |
| `supabase/functions/game/handlers/adivinhar-fim-tempo.ts` | Criar (importa helper do anterior) |
| `supabase/functions/game/handlers/proximo-turno.ts` | Modificar — substituir lazy check |
| `supabase/functions/game/handlers/dizer-palavra.ts` | Modificar — substituir lazy check |
| `supabase/functions/game/handlers/responder-pergunta.ts` | Modificar — substituir lazy check |
| `supabase/functions/game/index.ts` | Modificar — registrar 3 novas actions |
| `web/src/lib/game-actions.ts` | Modificar — 3 novas actions |
| `web/src/__tests__/helpers.ts` | Modificar — adicionar 3 mocks + `makeRodada` com novos campos |
| `web/src/__tests__/jogo-fim-tempo.test.tsx` | Criar — TDD timer trigger + UI nova fase |
| `web/src/app/sala/[code]/jogo/page.tsx` | Modificar — trigger, novos estados, UI `adivinhacao_fim_tempo` |
| `web/src/__tests__/resultado.test.tsx` | Modificar — casos fim de tempo |
| `web/src/app/sala/[code]/resultado/page.tsx` | Modificar — ler `adivinhacoes_fim_tempo` |
| `scripts/bots.mjs` | Modificar — detectar e participar da nova fase |

---

## Task 1: Tipos (backend + frontend)

**Files:**
- Modify: `supabase/functions/game/lib/types.ts`
- Modify: `web/src/lib/types.ts`

- [ ] **Step 1: Atualizar `supabase/functions/game/lib/types.ts`**

Adicionar o novo valor ao enum e os campos opcionais à interface:

```typescript
// Linha 9 — substituir a linha existente de FaseJogo:
export type FaseJogo = "jogando" | "aguardando_resposta" | "votacao" | "adivinhacao" | "adivinhacao_fim_tempo" | "resultado";
```

```typescript
// Dentro de EstadoRodada (após turno_numero_atual), adicionar:
  turno_numero_atual: number;
  timer_adivinhacao_end?: string;
  adivinhacoes_fim_tempo?: Record<string, number | null>;
```

Adicionar payloads no final da seção de payloads:

```typescript
export interface EncerrarPorTempoPayload {
  rodada_id: string;
}

export interface AdivinharFimTempoPayload {
  rodada_id: string;
  evento_id: number;
}

export interface FinalizarAdivinhacaoFimTempoPayload {
  rodada_id: string;
}
```

- [ ] **Step 2: Espelhar em `web/src/lib/types.ts`**

Aplicar as mesmas mudanças:

```typescript
// Linha 9 — substituir FaseJogo:
export type FaseJogo = "jogando" | "aguardando_resposta" | "votacao" | "adivinhacao" | "adivinhacao_fim_tempo" | "resultado";
```

```typescript
// Em EstadoRodada, após turno_numero_atual:
  turno_numero_atual: number;
  timer_adivinhacao_end?: string;
  adivinhacoes_fim_tempo?: Record<string, number | null>;
```

- [ ] **Step 3: Verificar que os testes existentes ainda compilam**

```bash
cd web && npm run test -- --reporter=verbose 2>&1 | tail -5
```

Esperado: `91 passed`

- [ ] **Step 4: Commit**

```bash
git add supabase/functions/game/lib/types.ts web/src/lib/types.ts
git commit -m "feat(types): adiciona fase adivinhacao_fim_tempo e campos de adivinhação por tempo"
```

---

## Task 2: Handler `encerrar-por-tempo`

**Files:**
- Create: `supabase/functions/game/handlers/encerrar-por-tempo.ts`

- [ ] **Step 1: Criar o handler**

```typescript
// supabase/functions/game/handlers/encerrar-por-tempo.ts
import { getDb }           from "../lib/db.ts";
import { encerrarRodada }  from "./encerrar-rodada.ts";
import type { EncerrarPorTempoPayload } from "../lib/types.ts";

export async function encerrarPorTempo(userId: string, payload: unknown) {
  const { rodada_id } = payload as EncerrarPorTempoPayload;
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

  if (estado.fase === "adivinhacao_fim_tempo") return { ok: true };
  if (estado.fase !== "jogando") {
    throw new Error(`Não é possível encerrar por tempo na fase '${estado.fase}'`);
  }

  if (estado.espia_ids.length === 0) {
    return encerrarRodada(userId, { rodada_id, espia_pego: false, espia_adivinhou: false });
  }

  const timerAdivinhacaoEnd = new Date(Date.now() + 30_000).toISOString();
  const adivinhacoesFimTempo: Record<string, number | null> =
    Object.fromEntries(estado.espia_ids.map((id: string) => [id, null]));

  const { error } = await db
    .from("rodadas")
    .update({
      estado: {
        ...estado,
        fase: "adivinhacao_fim_tempo",
        timer_adivinhacao_end: timerAdivinhacaoEnd,
        adivinhacoes_fim_tempo: adivinhacoesFimTempo,
      },
    })
    .eq("id", rodada_id);

  if (error) throw new Error("Falha ao encerrar por tempo: " + error.message);
  return { ok: true, timer_adivinhacao_end: timerAdivinhacaoEnd };
}
```

- [ ] **Step 2: Commit**

```bash
git add supabase/functions/game/handlers/encerrar-por-tempo.ts
git commit -m "feat(encerrar-por-tempo): transiciona para fase adivinhacao_fim_tempo ao expirar timer"
```

---

## Task 3: Handler `finalizar-adivinhacao-fim-tempo` (com helper compartilhado)

**Files:**
- Create: `supabase/functions/game/handlers/finalizar-adivinhacao-fim-tempo.ts`

- [ ] **Step 1: Criar o handler com o helper exportado**

```typescript
// supabase/functions/game/handlers/finalizar-adivinhacao-fim-tempo.ts
import { getDb }        from "../lib/db.ts";
import type { FinalizarAdivinhacaoFimTempoPayload } from "../lib/types.ts";
import type { SupabaseClient } from "@supabase/supabase-js";

export async function finalizarAdivinhacaoFimTempo(userId: string, payload: unknown) {
  const { rodada_id } = payload as FinalizarAdivinhacaoFimTempoPayload;
  if (!rodada_id) throw new Error("rodada_id obrigatório");

  const db = getDb();

  const { data: rodada } = await db
    .from("rodadas")
    .select("estado, sala_id, evento_id, encerrada_em")
    .eq("id", rodada_id)
    .single();

  if (!rodada) throw Object.assign(new Error("Rodada não encontrada"), { status: 404 });
  if (rodada.encerrada_em) return { ok: true };

  const estado = rodada.estado;
  if (estado.fase !== "adivinhacao_fim_tempo") {
    throw new Error(`Não é possível finalizar na fase '${estado.fase}'`);
  }

  return _finalizarAdivinhacaoFimTempo(db, rodada_id, rodada, estado);
}

export async function _finalizarAdivinhacaoFimTempo(
  db: SupabaseClient,
  rodada_id: string,
  rodada: { sala_id: string; evento_id: number },
  estado: Record<string, unknown> & {
    espia_ids: string[];
    adivinhacoes_fim_tempo?: Record<string, number | null>;
  }
) {
  const adivinhacoes: Record<string, number | null> = estado.adivinhacoes_fim_tempo ?? {};

  for (const espiaId of estado.espia_ids) {
    const guess = adivinhacoes[espiaId] ?? null;
    const acertou = guess !== null && guess === rodada.evento_id;
    const pontos = acertou ? 3 : 2;
    await db.rpc("incrementar_pontuacao", { jogador_id: espiaId, delta: pontos });
  }

  await db
    .from("rodadas")
    .update({
      encerrada_em: new Date().toISOString(),
      estado: { ...estado, fase: "resultado" },
    })
    .eq("id", rodada_id);

  const { data: sala } = await db
    .from("salas")
    .select("rodada_atual, num_rodadas")
    .eq("id", rodada.sala_id)
    .single();

  if (sala) {
    if (sala.rodada_atual >= sala.num_rodadas) {
      await db.from("salas").update({ status: "encerrada" }).eq("id", rodada.sala_id);
    } else {
      await db.from("salas").update({ status: "aguardando" }).eq("id", rodada.sala_id);
    }
  }

  return { ok: true };
}
```

- [ ] **Step 2: Commit**

```bash
git add supabase/functions/game/handlers/finalizar-adivinhacao-fim-tempo.ts
git commit -m "feat(finalizar-adivinhacao-fim-tempo): pontua espias individualmente ao fim do tempo"
```

---

## Task 4: Handler `adivinhar-fim-tempo`

**Files:**
- Create: `supabase/functions/game/handlers/adivinhar-fim-tempo.ts`

- [ ] **Step 1: Criar o handler**

```typescript
// supabase/functions/game/handlers/adivinhar-fim-tempo.ts
import { getDb }    from "../lib/db.ts";
import { EVENTOS }  from "../lib/eventos.ts";
import { _finalizarAdivinhacaoFimTempo } from "./finalizar-adivinhacao-fim-tempo.ts";
import type { AdivinharFimTempoPayload } from "../lib/types.ts";

export async function adivinharFimTempo(userId: string, payload: unknown) {
  const { rodada_id, evento_id } = payload as AdivinharFimTempoPayload;
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
  if (estado.fase !== "adivinhacao_fim_tempo") {
    throw new Error(`Não é possível adivinhar na fase '${estado.fase}'`);
  }

  const { data: jogador } = await db
    .from("jogadores")
    .select("id")
    .eq("sala_id", rodada.sala_id)
    .eq("user_id", userId)
    .single();

  if (!jogador || !estado.espia_ids.includes(jogador.id)) {
    throw Object.assign(new Error("Apenas o espia pode adivinhar"), { status: 403 });
  }

  const adivinhacoes: Record<string, number | null> = estado.adivinhacoes_fim_tempo ?? {};
  if (adivinhacoes[jogador.id] !== null && adivinhacoes[jogador.id] !== undefined) {
    throw new Error("Você já adivinhou nesta rodada");
  }

  const eventoValido = EVENTOS.find((e) => e.id === evento_id);
  if (!eventoValido) throw new Error("Evento inválido");

  const novasAdivinhacoes = { ...adivinhacoes, [jogador.id]: evento_id };
  const novoEstado = { ...estado, adivinhacoes_fim_tempo: novasAdivinhacoes };

  const todosSouberam = estado.espia_ids.every(
    (id: string) => novasAdivinhacoes[id] !== null && novasAdivinhacoes[id] !== undefined
  );

  if (todosSouberam) {
    await db.from("rodadas")
      .update({ estado: novoEstado })
      .eq("id", rodada_id);
    return _finalizarAdivinhacaoFimTempo(db, rodada_id, rodada, novoEstado);
  }

  const { error } = await db
    .from("rodadas")
    .update({ estado: novoEstado })
    .eq("id", rodada_id);

  if (error) throw new Error("Falha ao registrar adivinhação: " + error.message);
  return { aguardando: true };
}
```

- [ ] **Step 2: Commit**

```bash
git add supabase/functions/game/handlers/adivinhar-fim-tempo.ts
git commit -m "feat(adivinhar-fim-tempo): registra adivinhacao individual do espia na fase fim_tempo"
```

---

## Task 5: Substituir lazy checks + registrar actions em `index.ts`

**Files:**
- Modify: `supabase/functions/game/handlers/proximo-turno.ts`
- Modify: `supabase/functions/game/handlers/dizer-palavra.ts`
- Modify: `supabase/functions/game/handlers/responder-pergunta.ts`
- Modify: `supabase/functions/game/index.ts`

- [ ] **Step 1: Substituir lazy check em `proximo-turno.ts`**

No topo do arquivo, adicionar import:
```typescript
import { encerrarPorTempo }     from "./encerrar-por-tempo.ts";
```

Substituir (linha ~23-25):
```typescript
  if (new Date() > new Date(estado.timer_end)) {
    return encerrarRodada(userId, { rodada_id, espia_pego: false, espia_adivinhou: false });
  }
```
Por:
```typescript
  if (new Date() > new Date(estado.timer_end)) {
    return encerrarPorTempo(userId, { rodada_id });
  }
```

- [ ] **Step 2: Substituir lazy check em `dizer-palavra.ts`**

No topo, adicionar import:
```typescript
import { encerrarPorTempo }     from "./encerrar-por-tempo.ts";
```

Substituir (linha ~31-33):
```typescript
  if (new Date() > new Date(estado.timer_end)) {
    return encerrarRodada(userId, { rodada_id, espia_pego: false, espia_adivinhou: false });
  }
```
Por:
```typescript
  if (new Date() > new Date(estado.timer_end)) {
    return encerrarPorTempo(userId, { rodada_id });
  }
```

Remover o import de `encerrarRodada` se não for mais usado em outro lugar nesse arquivo. (Verificar se ainda é necessário — se não, remover.)

- [ ] **Step 3: Substituir lazy check em `responder-pergunta.ts`**

Mesmo padrão — adicionar import de `encerrarPorTempo`, substituir o check:
```typescript
import { encerrarPorTempo }     from "./encerrar-por-tempo.ts";
```

```typescript
  if (new Date() > new Date(estado.timer_end)) {
    return encerrarPorTempo(userId, { rodada_id });
  }
```

- [ ] **Step 4: Registrar 3 novas actions em `index.ts`**

Adicionar imports:
```typescript
import { encerrarPorTempo }              from "./handlers/encerrar-por-tempo.ts";
import { adivinharFimTempo }             from "./handlers/adivinhar-fim-tempo.ts";
import { finalizarAdivinhacaoFimTempo }  from "./handlers/finalizar-adivinhacao-fim-tempo.ts";
```

Adicionar 3 casos no switch (após `case "adivinhar":`):
```typescript
case "encerrar_por_tempo":             return json(await encerrarPorTempo(user.id, payload));
case "adivinhar_fim_tempo":            return json(await adivinharFimTempo(user.id, payload));
case "finalizar_adivinhacao_fim_tempo": return json(await finalizarAdivinhacaoFimTempo(user.id, payload));
```

- [ ] **Step 5: Commit**

```bash
git add supabase/functions/game/handlers/proximo-turno.ts \
        supabase/functions/game/handlers/dizer-palavra.ts \
        supabase/functions/game/handlers/responder-pergunta.ts \
        supabase/functions/game/index.ts
git commit -m "feat(game): registra 3 novas actions; lazy checks delegam para encerrar_por_tempo"
```

---

## Task 6: Frontend — `game-actions.ts` + mock em `helpers.ts`

**Files:**
- Modify: `web/src/lib/game-actions.ts`
- Modify: `web/src/__tests__/helpers.ts`

- [ ] **Step 1: Adicionar 3 novas actions em `game-actions.ts`**

Após `adivinhar:`, adicionar:
```typescript
  encerrarPorTempo: (rodada_id: string) =>
    callGame<{ ok: boolean; timer_adivinhacao_end?: string }>("encerrar_por_tempo", { rodada_id }),

  adivinharFimTempo: (rodada_id: string, evento_id: number) =>
    callGame<{ aguardando?: boolean; ok?: boolean }>("adivinhar_fim_tempo", { rodada_id, evento_id }),

  finalizarAdivinhacaoFimTempo: (rodada_id: string) =>
    callGame<{ ok: boolean }>("finalizar_adivinhacao_fim_tempo", { rodada_id }),
```

- [ ] **Step 2: Adicionar os 3 mocks em `helpers.ts`**

No objeto `gameActionsMock.gameActions`, adicionar após `adivinhar: vi.fn()`:
```typescript
    encerrarPorTempo: vi.fn(),
    adivinharFimTempo: vi.fn(),
    finalizarAdivinhacaoFimTempo: vi.fn(),
```

- [ ] **Step 3: Verificar testes existentes**

```bash
cd web && npm run test -- --reporter=verbose 2>&1 | tail -5
```

Esperado: `91 passed`

- [ ] **Step 4: Commit**

```bash
git add web/src/lib/game-actions.ts web/src/__tests__/helpers.ts
git commit -m "feat(game-actions): adiciona encerrarPorTempo, adivinharFimTempo, finalizarAdivinhacaoFimTempo"
```

---

## Task 7: TDD — Timer trigger em `jogo/page.tsx`

**Files:**
- Create: `web/src/__tests__/jogo-fim-tempo.test.tsx`
- Modify: `web/src/app/sala/[code]/jogo/page.tsx`

- [ ] **Step 1: Escrever o teste com falha**

```typescript
// web/src/__tests__/jogo-fim-tempo.test.tsx
import React, { Suspense } from "react";
import { render, screen, act, waitFor } from "@testing-library/react";
import { vi, describe, it, expect, beforeEach } from "vitest";
import { makeRodada, makePlayer } from "./helpers";

vi.mock("next/navigation", () => ({ useRouter: () => ({ push: vi.fn() }) }));
vi.mock("@/lib/supabase", async () => (await import("./helpers")).makeSupabaseMock({ id: "sala-1", modo: "online" }));
vi.mock("@/hooks/usePlayers");
vi.mock("@/hooks/useGameState");
vi.mock("@/hooks/useAuth");
vi.mock("@/lib/game-actions", async () => (await import("./helpers")).gameActionsMock);
vi.mock("sonner", () => ({ toast: { error: vi.fn() } }));
vi.mock("@/lib/eventos", () => ({ EVENTOS: [{ id: 1, evento: "Criação", local: "Jardim do Éden", testament: "AT" }] }));
vi.mock("@/components/ui/design", async () => (await import("./helpers")).designMock);
vi.mock("motion/react", async () => (await import("./helpers")).motionMock);

import { usePlayers } from "@/hooks/usePlayers";
import { useGameState } from "@/hooks/useGameState";
import { useAuth } from "@/hooks/useAuth";
import { gameActions } from "@/lib/game-actions";
import JogoPage from "@/app/sala/[code]/jogo/page";

const ALICE = makePlayer({ id: "jogador-1", apelido: "Alice" });
const BOB   = makePlayer({ id: "jogador-2", user_id: "user-2", apelido: "Bob" });
const PARAMS = Promise.resolve({ code: "TEST" });

function renderJogo() {
  return render(
    <Suspense fallback={null}>
      <JogoPage params={PARAMS} />
    </Suspense>
  );
}

async function passarRevealScreen() {
  const btn = screen.queryByText("Memorizei");
  if (btn) await act(async () => { (btn as HTMLElement).click(); });
}

describe("Fim de tempo — trigger e UI", () => {
  beforeEach(() => {
    vi.mocked(useAuth).mockReturnValue({
      user: { id: "user-1" } as ReturnType<typeof useAuth>["user"],
      loading: false,
      isAnonymous: false,
      linkGoogle: vi.fn(),
    });
    vi.mocked(usePlayers).mockReturnValue([ALICE, BOB]);
    vi.clearAllMocks();
  });

  it("chama encerrarPorTempo quando timer_end já passou e fase é jogando", async () => {
    const pastTimer = new Date(Date.now() - 1000).toISOString();
    vi.mocked(gameActions.encerrarPorTempo).mockResolvedValue({ ok: true });
    vi.mocked(useGameState).mockReturnValue(
      makeRodada({}, { fase: "jogando", timer_end: pastTimer })
    );

    await act(async () => { renderJogo(); });
    await passarRevealScreen();

    await waitFor(() => {
      expect(vi.mocked(gameActions.encerrarPorTempo)).toHaveBeenCalledWith("rodada-1");
    });
  });

  it("não chama encerrarPorTempo quando timer ainda não expirou", async () => {
    const futureTimer = new Date(Date.now() + 300_000).toISOString();
    vi.mocked(gameActions.encerrarPorTempo).mockResolvedValue({ ok: true });
    vi.mocked(useGameState).mockReturnValue(
      makeRodada({}, { fase: "jogando", timer_end: futureTimer })
    );

    await act(async () => { renderJogo(); });
    await passarRevealScreen();

    await new Promise(r => setTimeout(r, 100));
    expect(vi.mocked(gameActions.encerrarPorTempo)).not.toHaveBeenCalled();
  });
});
```

- [ ] **Step 2: Rodar para confirmar falha**

```bash
cd web && npm run test -- --reporter=verbose jogo-fim-tempo 2>&1 | tail -20
```

Esperado: FAIL — `encerrarPorTempo is not a function` ou similar.

- [ ] **Step 3: Implementar o trigger em `jogo/page.tsx`**

Alterar a chamada do hook na linha `const { display, pct } = useTimer(...)`:
```typescript
const { display, secs, pct } = useTimer(rodada?.estado.timer_end ?? null);
const adivTimer = useTimer(rodada?.estado.timer_adivinhacao_end ?? null);
```

Adicionar refs e effects (após as declarações de estado existentes, antes do `useTimer`):
```typescript
const encerradoPorTempoRef = useRef(false);
const finalizadoFimTempoRef = useRef(false);
const lastRodadaIdRef = useRef<string | null>(null);

useEffect(() => {
  if (rodada?.id && rodada.id !== lastRodadaIdRef.current) {
    lastRodadaIdRef.current = rodada.id;
    encerradoPorTempoRef.current = false;
    finalizadoFimTempoRef.current = false;
  }
}, [rodada?.id]);

useEffect(() => {
  if (
    secs === 0 &&
    fase === "jogando" &&
    rodada &&
    !encerradoPorTempoRef.current &&
    new Date() > new Date(rodada.estado.timer_end)
  ) {
    encerradoPorTempoRef.current = true;
    gameActions.encerrarPorTempo(rodada.id).catch(() => {});
  }
}, [secs, fase, rodada]);

useEffect(() => {
  if (
    adivTimer.secs === 0 &&
    fase === "adivinhacao_fim_tempo" &&
    rodada?.estado.timer_adivinhacao_end &&
    !finalizadoFimTempoRef.current &&
    new Date() > new Date(rodada.estado.timer_adivinhacao_end)
  ) {
    finalizadoFimTempoRef.current = true;
    gameActions.finalizarAdivinhacaoFimTempo(rodada.id).catch(() => {});
  }
}, [adivTimer.secs, fase, rodada]);
```

- [ ] **Step 4: Rodar para confirmar sucesso**

```bash
cd web && npm run test -- --reporter=verbose jogo-fim-tempo 2>&1 | tail -10
```

Esperado: `2 passed`

- [ ] **Step 5: Commit**

```bash
git add web/src/__tests__/jogo-fim-tempo.test.tsx web/src/app/sala/\[code\]/jogo/page.tsx
git commit -m "feat(jogo): trigger encerrarPorTempo quando timer expira"
```

---

## Task 8: TDD — UI do espia em `adivinhacao_fim_tempo`

**Files:**
- Modify: `web/src/__tests__/jogo-fim-tempo.test.tsx`
- Modify: `web/src/app/sala/[code]/jogo/page.tsx`

- [ ] **Step 1: Escrever testes com falha**

Adicionar dentro do `describe("Fim de tempo — trigger e UI", ...)`:

```typescript
  it("espia vê sheet de adivinhação na fase adivinhacao_fim_tempo", async () => {
    vi.mocked(useGameState).mockReturnValue(
      makeRodada({}, {
        fase: "adivinhacao_fim_tempo",
        espia_ids: ["jogador-1"],
        timer_adivinhacao_end: new Date(Date.now() + 30_000).toISOString(),
        adivinhacoes_fim_tempo: { "jogador-1": null },
      })
    );

    await act(async () => { renderJogo(); });
    await passarRevealScreen();

    await waitFor(() => {
      expect(screen.getByText(/Onde você está/i)).toBeInTheDocument();
    });
  });

  it("espia submete adivinhação via adivinharFimTempo", async () => {
    vi.mocked(gameActions.adivinharFimTempo).mockResolvedValue({ aguardando: true });
    vi.mocked(useGameState).mockReturnValue(
      makeRodada({}, {
        fase: "adivinhacao_fim_tempo",
        espia_ids: ["jogador-1"],
        timer_adivinhacao_end: new Date(Date.now() + 30_000).toISOString(),
        adivinhacoes_fim_tempo: { "jogador-1": null },
      })
    );

    await act(async () => { renderJogo(); });
    await passarRevealScreen();

    // Selecionar primeiro evento da lista e confirmar
    await waitFor(() => screen.getByText("Criação"));
    await act(async () => { (screen.getByText("Criação").closest("button") as HTMLElement).click(); });
    await act(async () => { (screen.getByText(/Confirmar/i) as HTMLElement).click(); });

    await waitFor(() => {
      expect(vi.mocked(gameActions.adivinharFimTempo)).toHaveBeenCalledWith("rodada-1", 1);
    });
  });
```

- [ ] **Step 2: Rodar para confirmar falha**

```bash
cd web && npm run test -- --reporter=verbose jogo-fim-tempo 2>&1 | tail -10
```

Esperado: 2 novos testes FAIL.

- [ ] **Step 3: Implementar UI do espia em `jogo/page.tsx`**

Adicionar estado e handler (junto aos outros estados):
```typescript
const [showFimTempoGuess, setShowFimTempoGuess] = useState(false);
const [adivinheiNaFimTempo, setAdivinheiNaFimTempo] = useState(false);
```

Resetar ao trocar de rodada — no `useEffect` de reset de refs, adicionar:
```typescript
    setAdivinheiNaFimTempo(false);
    setShowFimTempoGuess(false);
```

Adicionar effect que abre o sheet automaticamente para espias:
```typescript
useEffect(() => {
  if (fase === "adivinhacao_fim_tempo" && isSpy && !adivinheiNaFimTempo) {
    setShowFimTempoGuess(true);
  }
}, [fase, isSpy, adivinheiNaFimTempo]);
```

Adicionar handler:
```typescript
async function handleAdivinharFimTempo() {
  if (!rodada || selectedGuessId === null) return;
  setActing(true);
  try {
    await gameActions.adivinharFimTempo(rodada.id, selectedGuessId);
    setAdivinheiNaFimTempo(true);
    setShowFimTempoGuess(false);
    setSelectedGuessId(null);
  } catch (err) {
    toast.error(err instanceof Error ? err.message : "Erro ao adivinhar");
  } finally {
    setActing(false);
  }
}
```

Adicionar o sheet no JSX (antes do fechamento do `</main>`, após o GUESS SHEET existente):

```tsx
{/* FIM DE TEMPO — GUESS SHEET (espia) */}
<AnimatePresence>
  {showFimTempoGuess && (
    <motion.div key="fimtempo-guess" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} style={{ position: "fixed", inset: 0, zIndex: 50, display: "flex", flexDirection: "column", justifyContent: "flex-end", background: "rgba(26,18,8,0.72)", backdropFilter: "blur(4px)" }}>
    <motion.div initial={{ y: "100%" }} animate={{ y: 0 }} exit={{ y: "100%" }} transition={SHEET_SPRING} style={{ background: T.card, borderRadius: "22px 22px 0 0", padding: "24px 20px 0", display: "flex", flexDirection: "column", gap: 14, maxWidth: 390, margin: "0 auto", width: "100%", position: "relative", maxHeight: "80dvh" }}>
      <InsetFrame color={T.sienna} inset={6} radius={22} opacity={0.3} opacity2={0.15} />
      <div style={{ width: 40, height: 4, background: T.hairlineStrong, borderRadius: 2, margin: "0 auto 4px" }} />
      <Eyebrow color={T.inkSoft}>Tempo Esgotado — Adivinha o Local</Eyebrow>
      <div style={{ fontFamily: F.serif, fontSize: 24, fontWeight: 600, color: T.ink }}>Onde você está?</div>
      <div style={{ display: "flex", flexDirection: "column", gap: 8, overflowY: "auto", paddingBottom: 8 }}>
        {EVENTOS.map(e => (
          <button key={e.id} onClick={() => setSelectedGuessId(e.id)} style={{ display: "flex", flexDirection: "column", padding: "12px 14px", borderRadius: 12, border: `2px solid ${selectedGuessId === e.id ? T.sienna : T.hairline}`, background: selectedGuessId === e.id ? T.siennaSoft : T.cardWarm, cursor: "pointer", textAlign: "left", transition: "all 150ms" }}>
            <span style={{ fontFamily: F.sans, fontWeight: 600, fontSize: 14, color: T.ink }}>{e.evento}</span>
            <span style={{ fontFamily: F.bodySerif, fontSize: 12, color: T.inkSoft, marginTop: 2 }}>{e.local}</span>
          </button>
        ))}
      </div>
      <div style={{ display: "flex", gap: 10, padding: "14px 0", borderTop: `1px solid ${T.hairline}`, background: T.card, position: "sticky", bottom: 0 }}>
        <button disabled={selectedGuessId === null || acting} onClick={handleAdivinharFimTempo} style={{ flex: 1, background: T.ink, color: T.cardWarm, border: "none", borderRadius: 999, padding: "13px", fontFamily: F.sans, fontSize: 12, fontWeight: 700, cursor: selectedGuessId !== null ? "pointer" : "not-allowed", opacity: selectedGuessId !== null ? 1 : 0.5, textTransform: "uppercase", letterSpacing: "0.08em" }}>
          Confirmar ✦
        </button>
      </div>
    </motion.div>
    </motion.div>
  )}
</AnimatePresence>
```

- [ ] **Step 4: Rodar para confirmar sucesso**

```bash
cd web && npm run test -- --reporter=verbose jogo-fim-tempo 2>&1 | tail -10
```

Esperado: `4 passed`

- [ ] **Step 5: Commit**

```bash
git add web/src/__tests__/jogo-fim-tempo.test.tsx web/src/app/sala/\[code\]/jogo/page.tsx
git commit -m "feat(jogo): sheet de adivinhacao_fim_tempo para o espia"
```

---

## Task 9: TDD — Banner do não-espia em `adivinhacao_fim_tempo`

**Files:**
- Modify: `web/src/__tests__/jogo-fim-tempo.test.tsx`
- Modify: `web/src/app/sala/[code]/jogo/page.tsx`

- [ ] **Step 1: Escrever teste com falha**

Adicionar no `describe`:

```typescript
  it("não-espia vê banner 'espias estão adivinhando' na fase adivinhacao_fim_tempo", async () => {
    vi.mocked(useGameState).mockReturnValue(
      makeRodada({}, {
        fase: "adivinhacao_fim_tempo",
        espia_ids: ["jogador-2"],
        timer_adivinhacao_end: new Date(Date.now() + 30_000).toISOString(),
        adivinhacoes_fim_tempo: { "jogador-2": null },
      })
    );

    await act(async () => { renderJogo(); });
    await passarRevealScreen();

    await waitFor(() => {
      expect(screen.getByText(/espias estão adivinhando/i)).toBeInTheDocument();
    });
  });
```

- [ ] **Step 2: Rodar para confirmar falha**

```bash
cd web && npm run test -- --reporter=verbose jogo-fim-tempo 2>&1 | tail -10
```

Esperado: 1 novo teste FAIL.

- [ ] **Step 3: Implementar banner em `jogo/page.tsx`**

Adicionar antes do fechamento do `</main>` (após os sheets existentes):

```tsx
{/* FIM DE TEMPO — BANNER não-espia */}
{fase === "adivinhacao_fim_tempo" && !isSpy && (
  <div style={{ position: "fixed", inset: 0, zIndex: 50, display: "flex", flexDirection: "column", justifyContent: "flex-end", background: "rgba(26,18,8,0.72)", backdropFilter: "blur(4px)" }}>
    <div style={{ background: T.card, borderRadius: "22px 22px 0 0", padding: "32px 20px", display: "flex", flexDirection: "column", gap: 12, alignItems: "center", maxWidth: 390, margin: "0 auto", width: "100%", position: "relative" }}>
      <InsetFrame color={T.sienna} inset={6} radius={22} opacity={0.3} opacity2={0.15} />
      <div style={{ position: "relative", textAlign: "center" }}>
        <div style={{ fontFamily: F.serif, fontSize: 26, fontWeight: 600, color: T.ink, lineHeight: 1.1 }}>O tempo esgotou!</div>
        <div style={{ fontFamily: F.bodySerif, fontSize: 15, color: T.inkSoft, marginTop: 8 }}>Os espias estão adivinhando o local…</div>
        <div style={{ fontFamily: F.mono, fontSize: 32, fontWeight: 700, color: T.sienna, marginTop: 16, fontVariantNumeric: "tabular-nums" }}>
          {adivTimer.display}
        </div>
      </div>
    </div>
  </div>
)}
```

- [ ] **Step 4: Rodar todos os testes**

```bash
cd web && npm run test -- --reporter=verbose 2>&1 | tail -5
```

Esperado: `96 passed` (91 + 5 novos)

- [ ] **Step 5: Commit**

```bash
git add web/src/__tests__/jogo-fim-tempo.test.tsx web/src/app/sala/\[code\]/jogo/page.tsx
git commit -m "feat(jogo): banner adivinhacao_fim_tempo para nao-espias"
```

---

## Task 10: TDD — `resultado/page.tsx` com `adivinhacoes_fim_tempo`

**Files:**
- Modify: `web/src/__tests__/resultado.test.tsx`
- Modify: `web/src/app/sala/[code]/resultado/page.tsx`

- [ ] **Step 1: Escrever testes com falha**

Adicionar no `describe("Página Resultado", ...)` de `resultado.test.tsx`:

```typescript
  it("exibe '+3 pt' quando espia acertou no fim de tempo", async () => {
    vi.mocked(useGameState).mockReturnValue(
      makeRodada({ evento_id: 1 }, {
        espia_ids: ["jogador-2"],
        adivinhacoes_fim_tempo: { "jogador-2": 1 },
      })
    );
    vi.mocked(usePlayers).mockReturnValue([ALICE, BOB_LIVRE]);

    await act(async () => { renderResultado(); });

    await waitFor(() => {
      expect(screen.getByText("+3 pt")).toBeInTheDocument();
    });
  });

  it("exibe '+2 pt' quando espia errou no fim de tempo", async () => {
    vi.mocked(useGameState).mockReturnValue(
      makeRodada({ evento_id: 1 }, {
        espia_ids: ["jogador-2"],
        adivinhacoes_fim_tempo: { "jogador-2": 5 },
      })
    );
    vi.mocked(usePlayers).mockReturnValue([ALICE, BOB_LIVRE]);

    await act(async () => { renderResultado(); });

    await waitFor(() => {
      expect(screen.getByText("+2 pt")).toBeInTheDocument();
    });
  });

  it("exibe '+2 pt' quando espia não enviou adivinhação no fim de tempo", async () => {
    vi.mocked(useGameState).mockReturnValue(
      makeRodada({ evento_id: 1 }, {
        espia_ids: ["jogador-2"],
        adivinhacoes_fim_tempo: { "jogador-2": null },
      })
    );
    vi.mocked(usePlayers).mockReturnValue([ALICE, BOB_LIVRE]);

    await act(async () => { renderResultado(); });

    await waitFor(() => {
      expect(screen.getByText("+2 pt")).toBeInTheDocument();
    });
  });
```

- [ ] **Step 2: Rodar para confirmar falha**

```bash
cd web && npm run test -- --reporter=verbose resultado 2>&1 | tail -15
```

Esperado: 3 novos testes FAIL.

- [ ] **Step 3: Implementar em `resultado/page.tsx`**

Adicionar após as linhas de `espiaAdivinhou` e `groupWon`:

```typescript
  const adivinhacoesFimTempo = rodada?.estado.adivinhacoes_fim_tempo;
  const isFimTempo = adivinhacoesFimTempo !== undefined && adivinhacoesFimTempo !== null;

  const badgeFimTempo = (espiaId: string): string => {
    if (!adivinhacoesFimTempo || !rodada) return "+2 pt";
    const guess = adivinhacoesFimTempo[espiaId] ?? null;
    return (guess !== null && guess === rodada.evento_id) ? "+3 pt" : "+2 pt";
  };
```

No bloco de render de cada espia (atualmente em torno da linha `{espiaAdivinhou ? "+1 pt" : "0 pt"}`), substituir:

```tsx
{/* Linha existente: */}
{espiaAdivinhou ? "+1 pt" : "0 pt"}
```

Por:

```tsx
{isFimTempo ? badgeFimTempo(espias[0].id) : (espiaAdivinhou ? "+1 pt" : "0 pt")}
```

E o label abaixo do avatar, em `{espiaAdivinhou ? "Adivinhou o local" : "Não adivinhou o local"}`:

```tsx
{isFimTempo
  ? (badgeFimTempo(espias[0].id) === "+3 pt" ? "Adivinhou o local" : "Não adivinhou o local")
  : (espiaAdivinhou ? "Adivinhou o local" : "Não adivinhou o local")}
```

- [ ] **Step 4: Rodar todos os testes**

```bash
cd web && npm run test -- --reporter=verbose 2>&1 | tail -5
```

Esperado: `99 passed`

- [ ] **Step 5: Commit**

```bash
git add web/src/__tests__/resultado.test.tsx web/src/app/sala/\[code\]/resultado/page.tsx
git commit -m "feat(resultado): exibe pontuação por espia para o caso adivinhacao_fim_tempo"
```

---

## Task 11: Bots — participar de `adivinhacao_fim_tempo`

**Files:**
- Modify: `scripts/bots.mjs`

- [ ] **Step 1: Adicionar detection e ação no loop de `playBot`**

No bloco do loop de jogo de `playBot`, após o bloco `else if (fase === "adivinhacao") { ... }`, adicionar:

```javascript
    // ── Fase: adivinhacao_fim_tempo ───────────────────────────────────────
    else if (fase === "adivinhacao_fim_tempo") {
      const sou_espia = estado.espia_ids.includes(jogadorId);
      if (!sou_espia || adivinheiNestaRodada) continue;

      await sleep(1000 + Math.random() * 2000);
      const ev = eventoAleatorio();
      try {
        await callGame(token, "adivinhar_fim_tempo", { rodada_id: rodada.id, evento_id: ev.id });
        adivinheiNestaRodada = true;
        log(`Fim de tempo! Adivinhei: "${ev.evento}" (${ev.local})`);
      } catch (e) {
        log(`Erro ao adivinhar no fim de tempo: ${e.message}`);
      }
    }
```

- [ ] **Step 2: Commit**

```bash
git add scripts/bots.mjs
git commit -m "feat(bots): participa da fase adivinhacao_fim_tempo"
```

---

## Verificação Final

- [ ] Rodar suite completa: `cd web && npm run test 2>&1 | tail -5` — esperado: todos passando
- [ ] Testar manualmente com bots: criar sala, iniciar rodada com timer curto, observar transição para `adivinhacao_fim_tempo`, confirmar que espias conseguem adivinhar e resultado mostra pontuação correta
