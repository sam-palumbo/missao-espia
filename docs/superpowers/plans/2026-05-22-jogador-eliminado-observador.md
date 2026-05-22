# Jogador Eliminado como Observador — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Jogador eliminado por votação errada passa a ser observador — não participa de mais nenhuma ação na rodada (sem turno, sem voto, sem acusação, sem pergunta/resposta), e aparece na grade com visual de eliminado.

**Architecture:** O backend já marca `ativo: false` no jogador eliminado; a única mudança necessária é remover o ID eliminado de `estado.ordem_turnos` ao persistir o estado pós-eliminação em `votar.ts`. O frontend deriva `meuEliminado` a partir de `meuJogador?.ativo === false` e usa essa flag para ocultar botões de ação, mostrar banner de observador, e adaptar o overlay de votação. A grade de jogadores passa a mostrar todos (ativos + eliminados), com estilo acinzentado para os eliminados.

**Tech Stack:** Deno + Supabase Edge Functions (backend); Next.js App Router + React + Vitest/RTL (frontend)

---

## Files Changed

| File | Change |
|---|---|
| `supabase/functions/game/handlers/votar.ts` | Filtrar eliminado de `ordem_turnos` ao persistir estado |
| `web/src/__tests__/jogo-eliminado.test.tsx` | Criar — testes do estado de observador |
| `web/src/app/sala/[code]/jogo/page.tsx` | Implementar observer state |
| `regras.md` | Documentar que eliminado não participa do restante da rodada |
| `scope.md` | Documentar estado de observador na tela de jogo |

---

## Task 1: Backend — remover eliminado de `ordem_turnos`

**Files:**
- Modify: `supabase/functions/game/handlers/votar.ts`

- [ ] **Step 1: Localizar e modificar o bloco de eliminação errada**

Em `votar.ts`, no bloco "Continuar jogo com eliminação registrada" (última atualização de `rodadas`), adicionar filtragem de `ordem_turnos`:

```ts
// Continuar jogo com eliminação registrada
const novaOrdem = estado.ordem_turnos.filter((id) => id !== estado.acusado_id);

await db
  .from("rodadas")
  .update({
    estado: {
      ...estado,
      fase: "jogando",
      acusado_id: null,
      eliminacoes_erradas: novasElim,
      ordem_turnos: novaOrdem,
    },
  })
  .eq("id", rodada_id);

return { resultado_votacao: "aprovado", espia_pego: false, eliminacoes_erradas: novasElim };
```

O bloco inteiro a substituir (linhas ~95–101 do `votar.ts` original):

```ts
// Continuar jogo com eliminação registrada
await db
  .from("rodadas")
  .update({ estado: { ...estado, fase: "jogando", acusado_id: null, eliminacoes_erradas: novasElim } })
  .eq("id", rodada_id);

return { resultado_votacao: "aprovado", espia_pego: false, eliminacoes_erradas: novasElim };
```

- [ ] **Step 2: Rodar testes Deno existentes para confirmar que nada quebrou**

```bash
deno test supabase/functions/game/lib/votacao_test.ts supabase/functions/game/lib/espias_test.ts supabase/functions/game/lib/pontuacao_test.ts --allow-all
```

Expected: todos passando.

- [ ] **Step 3: Commit**

```bash
git add supabase/functions/game/handlers/votar.ts
git commit -m "fix: remove jogador eliminado de ordem_turnos ao eliminar por votação"
```

---

## Task 2: Frontend — testes do estado de observador

**Files:**
- Create: `web/src/__tests__/jogo-eliminado.test.tsx`

- [ ] **Step 1: Criar arquivo de testes**

Criar `web/src/__tests__/jogo-eliminado.test.tsx`:

```tsx
import React, { Suspense } from "react";
import { render, screen, fireEvent, act, waitFor } from "@testing-library/react";
import { vi, describe, it, expect, beforeEach } from "vitest";
import type { RodadaAtual } from "@/hooks/useGameState";

// ── Mocks ──────────────────────────────────────────────────────

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn() }),
}));

vi.mock("@/lib/supabase", () => ({
  createClient: () => ({
    from: () => ({
      select: () => ({
        eq: () => ({
          single: () => Promise.resolve({ data: { id: "sala-1" } }),
        }),
      }),
    }),
  }),
}));

vi.mock("@/hooks/usePlayers");
vi.mock("@/hooks/useGameState");
vi.mock("@/hooks/useAuth");

vi.mock("@/lib/game-actions", () => ({
  gameActions: {
    votar: vi.fn(),
    fazerPergunta: vi.fn(),
    responderPergunta: vi.fn(),
    dizerPalavra: vi.fn(),
    acusar: vi.fn(),
    adivinhar: vi.fn(),
    proximoTurno: vi.fn(),
  },
}));

vi.mock("sonner", () => ({ toast: { error: vi.fn() } }));
vi.mock("@/lib/eventos", () => ({ EVENTOS: [] }));

vi.mock("@/components/ui/design", () => {
  const T = new Proxy({}, { get: () => "" });
  const F = new Proxy({}, { get: () => "" });
  return {
    ParchmentBg: () => null,
    InsetFrame: () => null,
    MEMedallion: () => null,
    MEAvatar: ({ initial }: { initial: string }) =>
      React.createElement("span", null, initial),
    MERule: () => null,
    MEIcon: () => null,
    Eyebrow: ({ children }: { children: React.ReactNode }) =>
      React.createElement("span", null, children),
    PrimaryBtn: ({
      children,
      onClick,
    }: {
      children: React.ReactNode;
      onClick: () => void;
    }) => React.createElement("button", { onClick }, children),
    T,
    F,
  };
});

// ── Imports ────────────────────────────────────────────────────

import { usePlayers } from "@/hooks/usePlayers";
import { useGameState } from "@/hooks/useGameState";
import { useAuth } from "@/hooks/useAuth";
import JogoPage from "@/app/sala/[code]/jogo/page";

// ── Fixtures ───────────────────────────────────────────────────

const ALICE_ELIMINADA = {
  id: "jogador-1",
  user_id: "user-1",
  apelido: "Alice",
  ativo: false,
};
const BOB = { id: "jogador-2", user_id: "user-2", apelido: "Bob", ativo: true };
const CARLOS = {
  id: "jogador-3",
  user_id: "user-3",
  apelido: "Carlos",
  ativo: true,
};

const PARAMS = Promise.resolve({ code: "TEST" });

function rodadaJogandoComEliminada(): RodadaAtual {
  return {
    id: "rodada-1",
    numero: 1,
    evento_id: 1,
    encerrada_em: null,
    estado: {
      fase: "jogando",
      turno_atual: "jogador-2",
      ordem_turnos: ["jogador-2", "jogador-3"],
      espia_ids: [],
      timer_end: new Date(Date.now() + 300_000).toISOString(),
      eliminacoes_erradas: 1,
      acusado_id: null,
      acusou_neste_turno: false,
      adivinhou_evento_id: null,
      pergunta_atual: null,
      historico: [],
      primeira_rodada: false,
      palavras_primeira_rodada: [],
    },
  };
}

function rodadaVotacaoComEliminada(): RodadaAtual {
  return {
    ...rodadaJogandoComEliminada(),
    estado: {
      ...rodadaJogandoComEliminada().estado,
      fase: "votacao",
      acusado_id: "jogador-2",
      acusou_neste_turno: true,
    },
  };
}

function renderJogo() {
  return render(
    <Suspense fallback={null}>
      <JogoPage params={PARAMS} />
    </Suspense>
  );
}

async function passarRevealScreen() {
  const btn = screen.queryByText("Memorizei");
  if (btn) await act(async () => { fireEvent.click(btn); });
}

// ── Tests ──────────────────────────────────────────────────────

describe("Jogador eliminado — estado de observador", () => {
  beforeEach(() => {
    vi.mocked(useAuth).mockReturnValue({
      user: { id: "user-1" } as ReturnType<typeof useAuth>["user"],
      loading: false,
      isAnonymous: false,
      linkGoogle: vi.fn(),
    });
    vi.mocked(usePlayers).mockReturnValue([ALICE_ELIMINADA, BOB, CARLOS]);
    vi.clearAllMocks();
  });

  it("mostra banner de observador quando jogador está eliminado", async () => {
    vi.mocked(useGameState).mockReturnValue(rodadaJogandoComEliminada());

    await act(async () => { renderJogo(); });
    await passarRevealScreen();

    await waitFor(() => {
      expect(screen.getByText(/Você foi eliminado/i)).toBeInTheDocument();
    });
  });

  it("não mostra botão Acusar quando jogador está eliminado", async () => {
    vi.mocked(useGameState).mockReturnValue(rodadaJogandoComEliminada());

    await act(async () => { renderJogo(); });
    await passarRevealScreen();

    await waitFor(() => {
      expect(
        screen.queryByRole("button", { name: /^acusar$/i })
      ).not.toBeInTheDocument();
    });
  });

  it("não mostra botão Fazer Pergunta quando jogador está eliminado", async () => {
    vi.mocked(useGameState).mockReturnValue(rodadaJogandoComEliminada());

    await act(async () => { renderJogo(); });
    await passarRevealScreen();

    await waitFor(() => {
      expect(
        screen.queryByRole("button", { name: /fazer pergunta/i })
      ).not.toBeInTheDocument();
    });
  });

  it("mostra Alice eliminada na lista de jogadores", async () => {
    vi.mocked(useGameState).mockReturnValue(rodadaJogandoComEliminada());

    await act(async () => { renderJogo(); });
    await passarRevealScreen();

    await waitFor(() => {
      expect(screen.getByText("Alice")).toBeInTheDocument();
    });
  });

  it("overlay de votação mostra mensagem de observador para jogador eliminado", async () => {
    vi.mocked(useGameState).mockReturnValue(rodadaVotacaoComEliminada());

    await act(async () => { renderJogo(); });
    await passarRevealScreen();

    await waitFor(() => {
      expect(screen.getByText(/Votação/)).toBeInTheDocument();
      expect(screen.queryByText(/👍 Sim/)).not.toBeInTheDocument();
      expect(screen.queryByText(/👎 Não/)).not.toBeInTheDocument();
      expect(screen.getByText(/eliminado/i)).toBeInTheDocument();
    });
  });
});
```

- [ ] **Step 2: Rodar e confirmar que os testes falham**

```bash
cd web && npx vitest run src/__tests__/jogo-eliminado.test.tsx
```

Expected: 5 testes falhando (componente ainda não implementa o estado de observador).

---

## Task 3: Frontend — implementar estado de observador em `jogo/page.tsx`

**Files:**
- Modify: `web/src/app/sala/[code]/jogo/page.tsx`

- [ ] **Step 1: Derivar `meuEliminado` (linha ~141)**

Após a linha `const acusouNesteTurno = ...`, adicionar:

```ts
const meuEliminado = meuJogador?.ativo === false;
```

- [ ] **Step 2: Mostrar todos os jogadores na grade (linha ~271)**

Trocar `.filter(p => p.ativo)` por `.map` sem filtro e adicionar estilo visual para eliminados:

```tsx
{players.map(p => {
  const isActive = p.id === rodada?.estado.turno_atual;
  const isEliminated = !p.ativo;
  return (
    <button
      key={p.id}
      onClick={ehMeuTurno && !isEliminated ? handleProximoTurno : undefined}
      disabled={!ehMeuTurno || isEliminated}
      style={{
        flexShrink: 0,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        gap: 6,
        background: "none",
        border: "none",
        cursor: ehMeuTurno && !isEliminated ? "pointer" : "default",
        padding: "4px 2px",
        opacity: isEliminated ? 0.4 : 1,
      }}
    >
      <div style={{
        width: 44,
        height: 44,
        borderRadius: "50%",
        border: `2px solid ${isActive ? T.gold : T.hairlineStrong}`,
        background: isEliminated ? T.hairline : isActive ? T.goldSoft : T.cardWarm,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        transition: "all 0.2s",
      }}>
        <span style={{
          fontFamily: F.serif,
          fontSize: 14,
          fontWeight: 600,
          color: isActive ? T.sienna : T.inkSoft,
          textDecoration: isEliminated ? "line-through" : "none",
        }}>
          {p.apelido.slice(0, 2).toUpperCase()}
        </span>
      </div>
      <span style={{
        fontFamily: F.sans,
        fontSize: 10,
        color: isActive ? T.ink : T.muted,
        fontWeight: isActive ? 700 : 400,
      }}>
        {p.apelido.split(" ")[0]}
      </span>
    </button>
  );
})}
```

- [ ] **Step 3: Adicionar banner de observador após os botões de ação**

Logo após o bloco `{/* Action buttons */}` (linha ~336), adicionar:

```tsx
{/* ELIMINATED OBSERVER BANNER */}
{meuEliminado && (
  <div style={{
    position: "relative",
    zIndex: 1,
    background: T.brick,
    borderRadius: 14,
    padding: "12px 16px",
    textAlign: "center",
  }}>
    <span style={{
      fontFamily: F.sans,
      fontSize: 13,
      fontWeight: 700,
      color: "white",
      letterSpacing: "0.05em",
      textTransform: "uppercase",
    }}>
      Você foi eliminado — apenas observe
    </span>
  </div>
)}
```

- [ ] **Step 4: Ocultar botões de ação quando eliminado (linha ~337–353)**

Adicionar `!meuEliminado &&` em cada botão de ação:

```tsx
{/* Action buttons */}
<div style={{ position: "relative", zIndex: 1, display: "flex", gap: 10 }}>
  {!meuEliminado && isSpy && (fase === "jogando" || fase === "adivinhacao") && (
    <button onClick={() => setShowGuess(true)} ...>
      Adivinhar
    </button>
  )}
  {!meuEliminado && ehMeuTurno && fase === "jogando" && !primeiraRodada && (
    <button onClick={() => setShowAskQuestion(true)} ...>
      Fazer Pergunta
    </button>
  )}
  {!meuEliminado && ehMeuTurno && fase === "jogando" && !acusouNesteTurno && (
    <button onClick={() => setShowAccuse(true)} ...>
      <MEIcon name="spy" size={15} color="white" />
      Acusar
    </button>
  )}
</div>
```

- [ ] **Step 5: Adaptar overlay de votação para observador (linha ~363)**

Substituir a condição ternária de votação:

```tsx
{meuEliminado ? (
  <div style={{ textAlign: "center", fontFamily: F.bodySerif, fontStyle: "italic", fontSize: 15, color: T.inkSoft, padding: "10px 0" }}>
    Você foi eliminado — apenas observe.
  </div>
) : meuJogador?.id !== rodada?.estado.acusado_id ? (
  <div style={{ display: "flex", gap: 10 }}>
    <button disabled={acting} onClick={() => handleVotar(true)} style={{ flex: 1, background: T.ink, color: T.cardWarm, border: "none", borderRadius: 999, padding: "15px", fontFamily: F.sans, fontSize: 15, fontWeight: 700, cursor: "pointer" }}>
      👍 Sim
    </button>
    <button disabled={acting} onClick={() => handleVotar(false)} style={{ flex: 1, background: T.card, color: T.ink, border: `1.5px solid ${T.hairlineStrong}`, borderRadius: 999, padding: "15px", fontFamily: F.sans, fontSize: 15, fontWeight: 700, cursor: "pointer" }}>
      👎 Não
    </button>
  </div>
) : (
  <div style={{ textAlign: "center", fontFamily: F.bodySerif, fontStyle: "italic", fontSize: 15, color: T.inkSoft, padding: "10px 0" }}>Aguardando votação…</div>
)}
```

- [ ] **Step 6: Rodar testes**

```bash
cd web && npx vitest run src/__tests__/jogo-eliminado.test.tsx
```

Expected: 5 testes passando.

- [ ] **Step 7: Rodar todos os testes para garantir ausência de regressões**

```bash
cd web && npx vitest run
```

Expected: todos os testes passando.

- [ ] **Step 8: Commit**

```bash
git add web/src/__tests__/jogo-eliminado.test.tsx web/src/app/sala/[code]/jogo/page.tsx
git commit -m "feat: jogador eliminado vira observador — sem ações, grade com visual de eliminado"
```

---

## Task 4: Documentação

**Files:**
- Modify: `regras.md`
- Modify: `scope.md`

- [ ] **Step 1: Atualizar `regras.md` — seção Acusação**

Na seção `### Tolerância a Eliminações Erradas`, após o parágrafo "Se o número de eliminações erradas **ultrapassar o limite**…", adicionar:

```markdown
### Jogador Eliminado

Um jogador eliminado por votação errada **permanece na partida como observador**: continua vendo a tela do jogo, aparece na lista de jogadores (com visual de eliminado), mas não pode agir — não vota, não acusa, não faz nem responde perguntas, e não pontua ao final da rodada.
```

- [ ] **Step 2: Atualizar `scope.md` — seção "Tela do Jogo"**

Após o bloco da seção `### 6. Tela do Jogo — Espia`, adicionar nova seção:

```markdown
### 7. Tela do Jogo — Jogador Eliminado

- Exibe banner: **"Você foi eliminado — apenas observe"**
- Todos os botões de ação ficam ocultos (Acusar, Fazer Pergunta, Adivinhar)
- Overlay de votação exibe mensagem de observador em vez dos botões de voto
- O jogador eliminado permanece visível na grade de jogadores com estilo acinzentado e texto riscado
- Seu turno é removido de `ordem_turnos` no backend — o jogo nunca para esperando sua ação
```

Renumerar as seções seguintes (7 → 8, 8 → 9, 9 → 10, 10 → 11).

- [ ] **Step 3: Commit**

```bash
git add regras.md scope.md
git commit -m "docs: documentar estado de observador para jogador eliminado"
```
