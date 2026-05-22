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
    acusar: vi.fn(),
    votar: vi.fn(),
    fazerPergunta: vi.fn(),
    responderPergunta: vi.fn(),
    dizerPalavra: vi.fn(),
    adivinhar: vi.fn(),
    proximoTurno: vi.fn(),
  },
}));

vi.mock("sonner", () => ({ toast: { error: vi.fn() } }));
vi.mock("@/lib/eventos", () => ({ EVENTOS: [] }));

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

// ── Imports ────────────────────────────────────────────────────

import { usePlayers } from "@/hooks/usePlayers";
import { useGameState } from "@/hooks/useGameState";
import { useAuth } from "@/hooks/useAuth";
import JogoPage from "@/app/sala/[code]/jogo/page";

// ── Fixtures ───────────────────────────────────────────────────

const ALICE = { id: "jogador-1", user_id: "user-1", apelido: "Alice", ativo: true };
const BOB   = { id: "jogador-2", user_id: "user-2", apelido: "Bob",   ativo: true };
const PARAMS = Promise.resolve({ code: "TEST" });

function rodada({ primeiraRodada = false, isSpy = false, acusouNesteTurno = false } = {}): RodadaAtual {
  return {
    id: "rodada-1",
    numero: 1,
    evento_id: 1,
    encerrada_em: null,
    estado: {
      fase: "jogando",
      turno_atual: "jogador-1",
      ordem_turnos: ["jogador-1", "jogador-2"],
      espia_ids: isSpy ? ["jogador-1"] : [],
      timer_end: new Date(Date.now() + 300_000).toISOString(),
      eliminacoes_erradas: 0,
      acusado_id: null,
      acusou_neste_turno: acusouNesteTurno,
      adivinhou_evento_id: null,
      pergunta_atual: null,
      historico: [],
      primeira_rodada: primeiraRodada,
      palavras_primeira_rodada: [],
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

async function abrirModalTurno() {
  await waitFor(() => screen.getByText("Sua vez"));
  await act(async () => {
    fireEvent.click(screen.getByText("Sua vez"));
  });
}

// ── Tests ──────────────────────────────────────────────────────

describe("Ações do turno ficam dentro do modal — não aparecem diretamente", () => {
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

  it("Fazer Pergunta não está visível antes de abrir o modal", async () => {
    vi.mocked(useGameState).mockReturnValue(rodada());

    await act(async () => { renderJogo(); });
    await passarRevealScreen();

    await waitFor(() => screen.getByText("Sua vez"));
    expect(screen.queryByRole("button", { name: /fazer pergunta/i })).not.toBeInTheDocument();
  });

  it("Acusar não está visível antes de abrir o modal", async () => {
    vi.mocked(useGameState).mockReturnValue(rodada());

    await act(async () => { renderJogo(); });
    await passarRevealScreen();

    await waitFor(() => screen.getByText("Sua vez"));
    expect(screen.queryByRole("button", { name: /^acusar$/i })).not.toBeInTheDocument();
  });

  it("Dizer Palavra não está visível antes de abrir o modal na primeira rodada", async () => {
    vi.mocked(useGameState).mockReturnValue(rodada({ primeiraRodada: true }));

    await act(async () => { renderJogo(); });
    await passarRevealScreen();

    await waitFor(() => screen.getByText("Sua vez"));
    expect(screen.queryByRole("button", { name: /dizer palavra/i })).not.toBeInTheDocument();
  });
});

describe("Modal de ações abre ao clicar em 'Sua vez'", () => {
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

  it("abre com Fazer Pergunta e Acusar na rodada normal", async () => {
    vi.mocked(useGameState).mockReturnValue(rodada());

    await act(async () => { renderJogo(); });
    await passarRevealScreen();
    await abrirModalTurno();

    await waitFor(() => {
      expect(screen.getByRole("button", { name: /fazer pergunta/i })).toBeInTheDocument();
      expect(screen.getByRole("button", { name: /^acusar$/i })).toBeInTheDocument();
    });
  });

  it("abre com Dizer Palavra na primeira rodada", async () => {
    vi.mocked(useGameState).mockReturnValue(rodada({ primeiraRodada: true }));

    await act(async () => { renderJogo(); });
    await passarRevealScreen();
    await abrirModalTurno();

    await waitFor(() => {
      expect(screen.getByRole("button", { name: /dizer palavra/i })).toBeInTheDocument();
    });
    expect(screen.queryByRole("button", { name: /fazer pergunta/i })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /^acusar$/i })).not.toBeInTheDocument();
  });

  it("abre com Adivinhar quando é espia", async () => {
    vi.mocked(useGameState).mockReturnValue(rodada({ isSpy: true }));

    await act(async () => { renderJogo(); });
    await passarRevealScreen();
    await abrirModalTurno();

    await waitFor(() => {
      expect(screen.getByRole("button", { name: /adivinhar/i })).toBeInTheDocument();
    });
  });

  it("não mostra Acusar no modal quando já acusou neste turno", async () => {
    vi.mocked(useGameState).mockReturnValue(rodada({ acusouNesteTurno: true }));

    await act(async () => { renderJogo(); });
    await passarRevealScreen();
    await abrirModalTurno();

    await waitFor(() => {
      expect(screen.getByRole("button", { name: /fazer pergunta/i })).toBeInTheDocument();
    });
    expect(screen.queryByRole("button", { name: /^acusar$/i })).not.toBeInTheDocument();
  });
});
