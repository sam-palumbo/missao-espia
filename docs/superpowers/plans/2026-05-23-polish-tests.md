# Polish & Tests Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Extract duplicated test boilerplate into shared helpers, add unit tests for `resultado` and `placar` pages, and replace stub E2E tests with real smoke tests for the `criar` page.

**Architecture:** A shared `helpers.ts` module exports mock objects and fixture builders; test files use dynamic imports inside `vi.mock` factories to reference these without hoisting issues. Two new unit test files cover the untested pages. Three stub E2E files are deleted and replaced by a single `criar.spec.ts` that tests form behavior without requiring a backend.

**Tech Stack:** Vitest + React Testing Library (unit), Playwright (E2E), Next.js 16, TypeScript.

---

## File Map

| Action | Path |
|--------|------|
| Create | `web/src/__tests__/helpers.ts` |
| Modify | `web/src/__tests__/jogo-acusar.test.tsx` |
| Modify | `web/src/__tests__/jogo-carta.test.tsx` |
| Modify | `web/src/__tests__/jogo-eliminado.test.tsx` |
| Modify | `web/src/__tests__/jogo-historico-votacao.test.tsx` |
| Modify | `web/src/__tests__/jogo-presencial-historico.test.tsx` |
| Modify | `web/src/__tests__/jogo-presencial-turno.test.tsx` |
| Modify | `web/src/__tests__/jogo-responder.test.tsx` |
| Modify | `web/src/__tests__/jogo-turno-modal.test.tsx` |
| Modify | `web/src/__tests__/jogo-votacao.test.tsx` |
| Modify | `web/src/__tests__/lobby-modo-toggle.test.tsx` |
| Create | `web/src/__tests__/resultado.test.tsx` |
| Create | `web/src/__tests__/placar.test.tsx` |
| Create | `web/e2e/criar.spec.ts` |
| Delete | `web/e2e/perguntas.spec.ts` |
| Delete | `web/e2e/primeira-rodada.spec.ts` |
| Delete | `web/e2e/timer.spec.ts` |

---

## Task 1: Create shared helpers

**Files:**
- Create: `web/src/__tests__/helpers.ts`

- [ ] **Step 1: Write `helpers.ts`**

```typescript
// web/src/__tests__/helpers.ts
import React from "react";
import { vi } from "vitest";
import type { Player } from "@/hooks/usePlayers";
import type { RodadaAtual } from "@/hooks/useGameState";

// ── Mock objects ───────────────────────────────────────────────
// Use via dynamic import inside vi.mock factories:
//   vi.mock("motion/react", async () => (await import("./helpers")).motionMock);

export const motionMock = {
  motion: new Proxy({} as Record<string, unknown>, {
    get: (_: unknown, tag: string) =>
      function MotionEl({
        children,
        initial: _i,
        animate: _a,
        exit: _e,
        transition: _t,
        whileTap: _wt,
        whileHover: _wh,
        variants: _v,
        ...rest
      }: Record<string, unknown>) {
        return React.createElement(
          tag as keyof JSX.IntrinsicElements,
          rest as React.HTMLAttributes<HTMLElement>,
          children as React.ReactNode
        );
      },
  }),
  AnimatePresence: ({ children }: { children: React.ReactNode }) => children,
};

const T = new Proxy({}, { get: () => "" });
const F = new Proxy({}, { get: () => "" });

export const designMock = {
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
    disabled,
  }: {
    children: React.ReactNode;
    onClick?: () => void;
    disabled?: boolean;
  }) => React.createElement("button", { onClick, disabled }, children),
  OutlineBtn: ({
    children,
    onClick,
  }: {
    children: React.ReactNode;
    onClick?: () => void;
  }) => React.createElement("button", { onClick }, children),
  T,
  F,
};

export const gameActionsMock = {
  gameActions: {
    criarSala: vi.fn(),
    entrarSala: vi.fn(),
    definirModo: vi.fn(),
    iniciarRodada: vi.fn(),
    proximoTurno: vi.fn(),
    dizerPalavra: vi.fn(),
    fazerPergunta: vi.fn(),
    responderPergunta: vi.fn(),
    acusar: vi.fn(),
    votar: vi.fn(),
    adivinhar: vi.fn(),
  },
};

export function makeSupabaseMock(data: Record<string, unknown>) {
  return {
    createClient: () => ({
      from: () => ({
        select: () => ({
          eq: () => ({
            single: () => Promise.resolve({ data }),
          }),
        }),
      }),
    }),
  };
}

// ── Fixture builders ──────────────────────────────────────────

export function makePlayer(overrides: Partial<Player> = {}): Player {
  return {
    id: "jogador-1",
    sala_id: "sala-1",
    user_id: "user-1",
    apelido: "Alice",
    pontuacao: 0,
    ativo: true,
    conectado: true,
    entrou_em: "2026-01-01T00:00:00Z",
    ...overrides,
  };
}

export function makeRodada(
  top: Partial<Omit<RodadaAtual, "estado">> = {},
  estado: Partial<RodadaAtual["estado"]> = {}
): RodadaAtual {
  return {
    id: "rodada-1",
    numero: 1,
    evento_id: 1,
    encerrada_em: null,
    ...top,
    estado: {
      fase: "jogando",
      turno_atual: "jogador-1",
      ordem_turnos: ["jogador-1", "jogador-2"],
      espia_ids: [],
      timer_end: new Date(Date.now() + 300_000).toISOString(),
      eliminacoes_erradas: 0,
      acusado_id: null,
      acusou_neste_turno: false,
      adivinhou_evento_id: null,
      pergunta_atual: null,
      historico: [],
      primeira_rodada: false,
      palavras_primeira_rodada: [],
      ...estado,
    },
  };
}
```

- [ ] **Step 2: Type-check**

```bash
cd web && npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add web/src/__tests__/helpers.ts
git commit -m "test: helpers compartilhados — mocks e fixtures reutilizáveis"
```

---

## Task 2: Refactor all 10 existing test files

**Files:** all files in `web/src/__tests__/` except `setup.ts`

For each file, apply the following substitutions. Run `npm run test` after finishing all 10 to confirm all 66 tests still pass.

### Pattern A — replace the motion/react mock block

**Before** (~15 lines):
```ts
vi.mock("motion/react", async () => {
  const { createElement } = await import("react");
  return {
    motion: new Proxy({} as Record<string, unknown>, {
      get: (_, tag: string) =>
        function MotionEl({ children, initial, animate, exit, transition, whileTap, whileHover, variants, ...rest }: Record<string, unknown>) {
          return createElement(tag as keyof JSX.IntrinsicElements, rest as React.HTMLAttributes<HTMLElement>, children as React.ReactNode);
        },
    }),
    AnimatePresence: ({ children }: { children: React.ReactNode }) => children,
  };
});
```

**After** (1 line):
```ts
vi.mock("motion/react", async () => (await import("./helpers")).motionMock);
```

### Pattern B — replace the design mock block

**Before** (~20 lines):
```ts
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
    PrimaryBtn: ({ children, onClick }: { children: React.ReactNode; onClick: () => void }) =>
      React.createElement("button", { onClick }, children),
    T,
    F,
  };
});
```

**After** (1 line):
```ts
vi.mock("@/components/ui/design", async () => (await import("./helpers")).designMock);
```

### Pattern C — replace the game-actions mock block

**Before** (~10 lines):
```ts
vi.mock("@/lib/game-actions", () => ({
  gameActions: {
    fazerPergunta: vi.fn(),
    responderPergunta: vi.fn(),
    dizerPalavra: vi.fn(),
    acusar: vi.fn(),
    votar: vi.fn(),
    adivinhar: vi.fn(),
    proximoTurno: vi.fn(),
  },
}));
```

**After** (1 line):
```ts
vi.mock("@/lib/game-actions", async () => (await import("./helpers")).gameActionsMock);
```

### Pattern D — replace the supabase mock block

**Before**:
```ts
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
```

**After**:
```ts
vi.mock("@/lib/supabase", async () => (await import("./helpers")).makeSupabaseMock({ id: "sala-1" }));
```

**Exception:** `jogo-acusar.test.tsx` uses `{ id: "sala-1", modo: "online" }` — use that data object instead.

### Pattern E — replace inline fixture functions

Add this import at the top of each file (after other imports):
```ts
import { makeRodada, makePlayer } from "./helpers";
```

Then simplify inline fixture functions. Example from `jogo-carta.test.tsx`:

**Before**:
```ts
function rodadaNaoEspia(): RodadaAtual {
  return {
    id: "rodada-1",
    numero: 1,
    evento_id: 1,
    encerrada_em: null,
    estado: {
      fase: "jogando",
      turno_atual: "jogador-2",
      ordem_turnos: ["jogador-1", "jogador-2"],
      espia_ids: ["jogador-2"],
      timer_end: new Date(Date.now() + 300_000).toISOString(),
      eliminacoes_erradas: 0,
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
```

**After**:
```ts
const rodadaNaoEspia = () => makeRodada({}, { turno_atual: "jogador-2", espia_ids: ["jogador-2"] });
```

Apply the same simplification to every inline fixture in all 10 files. Only pass fields that differ from `makeRodada`'s defaults. Inline `ALICE`/`BOB`/`CARLOS` const declarations can be simplified using `makePlayer` too:

```ts
const ALICE  = makePlayer({ id: "jogador-1", apelido: "Alice" });
const BOB    = makePlayer({ id: "jogador-2", user_id: "user-2", apelido: "Bob" });
const CARLOS = makePlayer({ id: "jogador-3", user_id: "user-3", apelido: "Carlos" });
```

- [ ] **Step 1: Apply patterns A–E to all 10 test files**

- [ ] **Step 2: Run all tests**

```bash
cd web && npm run test
```

Expected:
```
Test Files  10 passed (10)
     Tests  66 passed (66)
```

If any test fails, compare the failing fixture values against `makeRodada`'s defaults and add the missing overrides.

- [ ] **Step 3: Commit**

```bash
git add web/src/__tests__/
git commit -m "refactor: testes usam helpers compartilhados — sem duplicação de mocks"
```

---

## Task 3: Unit tests for `resultado/page.tsx`

**Files:**
- Create: `web/src/__tests__/resultado.test.tsx`

Key logic in the page to test:
```ts
const espias = players.filter(p => espiaIds.includes(p.id));
const espiaPego = espias.some(p => !p.ativo);          // spy was caught
const espiaAdivinhou = rodada.estado.adivinhou_evento_id !== null;
const groupWon = espiaPego && !espiaAdivinhou;          // group wins
```
The `salaEncerrada` flag comes from `supabase.from("salas").select("id, status")...` — controlled via a module-level `mockSalaData` variable so individual tests can flip the value.

- [ ] **Step 1: Write the test file**

```typescript
// web/src/__tests__/resultado.test.tsx
import React, { Suspense } from "react";
import { render, screen, fireEvent, act, waitFor } from "@testing-library/react";
import { vi, describe, it, expect, beforeEach } from "vitest";
import { makeRodada, makePlayer } from "./helpers";

// ── Configurable supabase mock ─────────────────────────────────
let mockSalaData: Record<string, unknown> = { id: "sala-1", status: "jogando" };

vi.mock("next/navigation", () => ({ useRouter: () => ({ push: vi.fn() }) }));
vi.mock("@/lib/supabase", () => ({
  createClient: () => ({
    from: () => ({
      select: () => ({
        eq: () => ({ single: () => Promise.resolve({ data: mockSalaData }) }),
      }),
    }),
  }),
}));
vi.mock("@/hooks/usePlayers");
vi.mock("@/hooks/useGameState");
vi.mock("@/lib/eventos", () => ({
  EVENTOS: [{ id: 1, evento: "Criação", local: "Jardim do Éden", testament: "AT" }],
}));
vi.mock("motion/react", async () => (await import("./helpers")).motionMock);
vi.mock("@/components/ui/design", async () => (await import("./helpers")).designMock);

import { usePlayers } from "@/hooks/usePlayers";
import { useGameState } from "@/hooks/useGameState";
import ResultadoPage from "@/app/sala/[code]/resultado/page";

const PARAMS = Promise.resolve({ code: "TEST" });

const ALICE = makePlayer({ id: "jogador-1", apelido: "Alice", pontuacao: 3, ativo: true });
const BOB_PEGO  = makePlayer({ id: "jogador-2", apelido: "Bob",   pontuacao: 1, ativo: false });
const BOB_LIVRE = makePlayer({ id: "jogador-2", apelido: "Bob",   pontuacao: 1, ativo: true  });
const CARLOS = makePlayer({ id: "jogador-3", apelido: "Carlos", pontuacao: 2, ativo: true });

const espiaPegoRodada = (adivinhou = false) =>
  makeRodada({}, { espia_ids: ["jogador-2"], adivinhou_evento_id: adivinhou ? 1 : null });

const espiaLivreRodada = () =>
  makeRodada({}, { espia_ids: ["jogador-2"], adivinhou_evento_id: null });

function renderResultado() {
  return render(
    <Suspense fallback={null}>
      <ResultadoPage params={PARAMS} />
    </Suspense>
  );
}

describe("Página Resultado", () => {
  beforeEach(() => {
    mockSalaData = { id: "sala-1", status: "jogando" };
    vi.clearAllMocks();
  });

  it("mostra 'Espia caçado!' quando espia foi pego e não adivinhou", async () => {
    vi.mocked(useGameState).mockReturnValue(espiaPegoRodada(false));
    vi.mocked(usePlayers).mockReturnValue([ALICE, BOB_PEGO]);

    await act(async () => { renderResultado(); });

    await waitFor(() => {
      expect(screen.getByText("Espia caçado!")).toBeInTheDocument();
    });
  });

  it("mostra 'Missão cumprida' quando espia não foi pego", async () => {
    vi.mocked(useGameState).mockReturnValue(espiaLivreRodada());
    vi.mocked(usePlayers).mockReturnValue([ALICE, BOB_LIVRE]);

    await act(async () => { renderResultado(); });

    await waitFor(() => {
      expect(screen.getByText("Missão cumprida")).toBeInTheDocument();
    });
  });

  it("mostra 'Missão cumprida' quando espia foi pego mas adivinhou", async () => {
    vi.mocked(useGameState).mockReturnValue(espiaPegoRodada(true));
    vi.mocked(usePlayers).mockReturnValue([ALICE, BOB_PEGO]);

    await act(async () => { renderResultado(); });

    await waitFor(() => {
      expect(screen.getByText("Missão cumprida")).toBeInTheDocument();
    });
  });

  it("mostra o apelido do espia", async () => {
    vi.mocked(useGameState).mockReturnValue(espiaPegoRodada(false));
    vi.mocked(usePlayers).mockReturnValue([ALICE, BOB_PEGO]);

    await act(async () => { renderResultado(); });

    await waitFor(() => {
      expect(screen.getByText("Bob")).toBeInTheDocument();
    });
  });

  it("mostra 'Toque para revelar' antes de clicar", async () => {
    vi.mocked(useGameState).mockReturnValue(espiaPegoRodada(false));
    vi.mocked(usePlayers).mockReturnValue([ALICE, BOB_PEGO]);

    await act(async () => { renderResultado(); });

    await waitFor(() => {
      expect(screen.getByText("Toque para revelar")).toBeInTheDocument();
    });
  });

  it("revela o local ao clicar em 'Toque para revelar'", async () => {
    vi.mocked(useGameState).mockReturnValue(espiaPegoRodada(false));
    vi.mocked(usePlayers).mockReturnValue([ALICE, BOB_PEGO]);

    await act(async () => { renderResultado(); });

    await waitFor(() => screen.getByText("Toque para revelar"));
    await act(async () => {
      fireEvent.click(screen.getByText("Toque para revelar"));
    });

    await waitFor(() => {
      expect(screen.getByText("Jardim do Éden")).toBeInTheDocument();
    });
  });

  it("mostra '+1 pt' quando espia adivinhou", async () => {
    vi.mocked(useGameState).mockReturnValue(espiaPegoRodada(true));
    vi.mocked(usePlayers).mockReturnValue([ALICE, BOB_PEGO]);

    await act(async () => { renderResultado(); });

    await waitFor(() => {
      expect(screen.getByText("+1 pt")).toBeInTheDocument();
    });
  });

  it("mostra '0 pt' quando espia não adivinhou", async () => {
    vi.mocked(useGameState).mockReturnValue(espiaPegoRodada(false));
    vi.mocked(usePlayers).mockReturnValue([ALICE, BOB_PEGO]);

    await act(async () => { renderResultado(); });

    await waitFor(() => {
      expect(screen.getByText("0 pt")).toBeInTheDocument();
    });
  });

  it("ordena jogadores por pontuação decrescente", async () => {
    // espia_ids vazio → nenhuma seção de espia → nomes aparecem só na lista de pontuação
    vi.mocked(useGameState).mockReturnValue(makeRodada());
    vi.mocked(usePlayers).mockReturnValue([
      makePlayer({ id: "j1", apelido: "Xena",   pontuacao: 5  }),
      makePlayer({ id: "j2", apelido: "Yasmin", pontuacao: 20 }),
      makePlayer({ id: "j3", apelido: "Zara",   pontuacao: 10 }),
    ]);

    await act(async () => { renderResultado(); });

    await waitFor(() => {
      const nomes = screen.getAllByText(/Xena|Yasmin|Zara/).map(el => el.textContent!);
      expect(nomes.indexOf("Yasmin")).toBeLessThan(nomes.indexOf("Zara"));
      expect(nomes.indexOf("Zara")).toBeLessThan(nomes.indexOf("Xena"));
    });
  });

  it("mostra 'Próxima Rodada' quando sala não está encerrada", async () => {
    mockSalaData = { id: "sala-1", status: "jogando" };
    vi.mocked(useGameState).mockReturnValue(espiaPegoRodada(false));
    vi.mocked(usePlayers).mockReturnValue([ALICE, BOB_PEGO]);

    await act(async () => { renderResultado(); });

    await waitFor(() => {
      expect(screen.getByText("Próxima Rodada")).toBeInTheDocument();
    });
  });

  it("mostra 'Ver Placar Final' quando sala está encerrada", async () => {
    mockSalaData = { id: "sala-1", status: "encerrada" };
    vi.mocked(useGameState).mockReturnValue(espiaPegoRodada(false));
    vi.mocked(usePlayers).mockReturnValue([ALICE, BOB_PEGO]);

    await act(async () => { renderResultado(); });

    await waitFor(() => {
      expect(screen.getByText("Ver Placar Final")).toBeInTheDocument();
    });
  });
});
```

- [ ] **Step 2: Run the new tests**

```bash
cd web && npm run test -- resultado
```

Expected:
```
Tests  11 passed (11)
```

If a test fails with "Unable to find text X", open `web/src/app/sala/[code]/resultado/page.tsx` and search for the exact string being rendered in that branch. Update the selector to match.

- [ ] **Step 3: Run all tests to confirm no regressions**

```bash
cd web && npm run test
```

Expected:
```
Test Files  11 passed (11)
     Tests  77 passed (77)
```

- [ ] **Step 4: Commit**

```bash
git add web/src/__tests__/resultado.test.tsx
git commit -m "test: TDD — página resultado (11 casos)"
```

---

## Task 4: Unit tests for `placar/page.tsx`

**Files:**
- Create: `web/src/__tests__/placar.test.tsx`

The placar page does not use `motion/react`, `useGameState`, or `useAuth` — only `usePlayers`, `createClient`, `useRouter`, and design components. A module-level `mockPush` captures router navigation calls.

- [ ] **Step 1: Write the test file**

```typescript
// web/src/__tests__/placar.test.tsx
import React, { Suspense } from "react";
import { render, screen, fireEvent, act, waitFor } from "@testing-library/react";
import { vi, describe, it, expect, beforeEach } from "vitest";
import { makePlayer } from "./helpers";

const mockPush = vi.fn();

vi.mock("next/navigation", () => ({ useRouter: () => ({ push: mockPush }) }));
vi.mock("@/lib/supabase", async () => (await import("./helpers")).makeSupabaseMock({ id: "sala-1" }));
vi.mock("@/hooks/usePlayers");
vi.mock("@/components/ui/design", async () => (await import("./helpers")).designMock);

import { usePlayers } from "@/hooks/usePlayers";
import PlacarPage from "@/app/sala/[code]/placar/page";

const PARAMS = Promise.resolve({ code: "TEST" });

function renderPlacar() {
  return render(
    <Suspense fallback={null}>
      <PlacarPage params={PARAMS} />
    </Suspense>
  );
}

describe("Página Placar Final", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(usePlayers).mockReturnValue([
      makePlayer({ id: "j1", apelido: "Alice", pontuacao: 10 }),
      makePlayer({ id: "j2", apelido: "Bob",   pontuacao: 3  }),
    ]);
  });

  it("ordena jogadores por pontuação decrescente", async () => {
    vi.mocked(usePlayers).mockReturnValue([
      makePlayer({ id: "j1", apelido: "Alice",  pontuacao: 5  }),
      makePlayer({ id: "j2", apelido: "Bob",    pontuacao: 20 }),
      makePlayer({ id: "j3", apelido: "Carlos", pontuacao: 10 }),
    ]);

    await act(async () => { renderPlacar(); });

    await waitFor(() => {
      const nomes = screen.getAllByText(/^(Alice|Bob|Carlos)$/).map(el => el.textContent!);
      expect(nomes.indexOf("Bob")).toBeLessThan(nomes.indexOf("Carlos"));
      expect(nomes.indexOf("Carlos")).toBeLessThan(nomes.indexOf("Alice"));
    });
  });

  it("primeiro lugar com pontuação > 0 exibe '✦'", async () => {
    await act(async () => { renderPlacar(); });

    await waitFor(() => {
      expect(screen.getByText("✦")).toBeInTheDocument();
    });
  });

  it("segundo lugar exibe o número '2'", async () => {
    await act(async () => { renderPlacar(); });

    await waitFor(() => {
      expect(screen.getByText("2")).toBeInTheDocument();
    });
  });

  it("clique em 'Nova Partida' navega para '/'", async () => {
    await act(async () => { renderPlacar(); });

    await waitFor(() => screen.getByText("Nova Partida"));
    await act(async () => { fireEvent.click(screen.getByText("Nova Partida")); });

    expect(mockPush).toHaveBeenCalledWith("/");
  });

  it("clique em 'Encerrar' navega para '/'", async () => {
    await act(async () => { renderPlacar(); });

    await waitFor(() => screen.getByText("Encerrar"));
    await act(async () => { fireEvent.click(screen.getByText("Encerrar")); });

    expect(mockPush).toHaveBeenCalledWith("/");
  });
});
```

- [ ] **Step 2: Run the new tests**

```bash
cd web && npm run test -- placar
```

Expected:
```
Tests  5 passed (5)
```

- [ ] **Step 3: Run all tests to confirm no regressions**

```bash
cd web && npm run test
```

Expected:
```
Test Files  12 passed (12)
     Tests  82 passed (82)
```

- [ ] **Step 4: Commit**

```bash
git add web/src/__tests__/placar.test.tsx
git commit -m "test: TDD — página placar final (5 casos)"
```

---

## Task 5: E2E — criar.spec.ts

**Files:**
- Delete: `web/e2e/perguntas.spec.ts`, `web/e2e/primeira-rodada.spec.ts`, `web/e2e/timer.spec.ts`
- Create: `web/e2e/criar.spec.ts`

The `criar` page button `canCreate = (atSel || ntSel) && apelido.trim()`. Both AT and NT are selected by default, so the button only depends on the apelido field. Round buttons (3, 5, 7, 10) are `<motion.button>` elements. The dev server runs on port 3001 (see `playwright.config.ts`).

- [ ] **Step 1: Delete stub files**

```bash
git rm web/e2e/perguntas.spec.ts web/e2e/primeira-rodada.spec.ts web/e2e/timer.spec.ts
```

- [ ] **Step 2: Write `criar.spec.ts`**

```typescript
// web/e2e/criar.spec.ts
import { test, expect } from "@playwright/test";

test.describe("Página Criar Sala", () => {
  test("exibe campo de apelido com placeholder correto", async ({ page }) => {
    await page.goto("/criar");

    await expect(page.locator('input[placeholder*="Davi, Ester"]')).toBeVisible();
  });

  test("botão 'Criar Sala' está desabilitado com apelido vazio", async ({ page }) => {
    await page.goto("/criar");

    await expect(page.locator('button:has-text("Criar Sala")')).toBeDisabled();
  });

  test("botão habilita ao preencher apelido", async ({ page }) => {
    await page.goto("/criar");

    await page.locator('input[placeholder*="Davi, Ester"]').fill("Moisés");

    await expect(page.locator('button:has-text("Criar Sala")')).toBeEnabled();
  });

  test("limpar apelido desabilita o botão novamente", async ({ page }) => {
    await page.goto("/criar");

    const input = page.locator('input[placeholder*="Davi, Ester"]');
    await input.fill("Moisés");
    await expect(page.locator('button:has-text("Criar Sala")')).toBeEnabled();

    await input.clear();
    await expect(page.locator('button:has-text("Criar Sala")')).toBeDisabled();
  });

  test("exibe os 4 botões de número de rodadas", async ({ page }) => {
    await page.goto("/criar");

    for (const n of ["3", "5", "7", "10"]) {
      await expect(page.locator(`button:has-text("${n}")`).first()).toBeVisible();
    }
  });

  test("exibe campo de senha opcional", async ({ page }) => {
    await page.goto("/criar");

    await expect(page.locator('input[placeholder*="Sala pública"]')).toBeVisible();
  });
});
```

- [ ] **Step 3: Run the new E2E tests** (Playwright auto-starts the dev server via `webServer` config)

```bash
cd web && npx playwright test e2e/criar.spec.ts
```

Expected:
```
6 passed (6s)
```

If a test fails with "Timeout waiting for locator", the dev server may have failed to start. Check `npm run dev` manually on port 3001.

- [ ] **Step 4: Run all E2E tests to confirm no regressions**

```bash
cd web && npx playwright test
```

Expected: `entrar-codigo.spec.ts` (8) + `criar.spec.ts` (6) = **14 passed**.

- [ ] **Step 5: Commit**

```bash
git add web/e2e/criar.spec.ts
git commit -m "test: E2E smoke — página criar (6 casos); remove stubs sem cobertura"
```

---

## Final verification

- [ ] **Run full unit test suite**

```bash
cd web && npm run test
```

Expected: 12 test files, 82 tests, all passed.

- [ ] **Run full E2E suite**

```bash
cd web && npx playwright test
```

Expected: 14 tests passed.

- [ ] **Build check**

```bash
cd web && npm run build
```

Expected: clean build, no TypeScript errors.
