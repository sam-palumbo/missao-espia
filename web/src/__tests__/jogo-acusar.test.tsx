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

// ── Imports e helpers ──────────────────────────────────────────

import { usePlayers } from "@/hooks/usePlayers";
import { useGameState } from "@/hooks/useGameState";
import { useAuth } from "@/hooks/useAuth";
import JogoPage from "@/app/sala/[code]/jogo/page";

const ALICE = { id: "jogador-1", user_id: "user-1", apelido: "Alice", ativo: true };
const BOB   = { id: "jogador-2", user_id: "user-2", apelido: "Bob",   ativo: true };

const PARAMS = Promise.resolve({ code: "TEST" });

function rodadaJogando({ acusouNesteTurno = false, turnoAtual = "jogador-1", primeiraRodada = false } = {}): RodadaAtual {
  return {
    id: "rodada-2",
    numero: 2,
    evento_id: 1,
    encerrada_em: null,
    estado: {
      fase: "jogando",
      turno_atual: turnoAtual,
      ordem_turnos: ["jogador-1", "jogador-2"],
      espia_ids: [],
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
  if (btn) await act(async () => { (btn as HTMLElement).click(); });
}

async function abrirModalTurno() {
  await waitFor(() => screen.getByText("Sua vez"));
  await act(async () => { fireEvent.click(screen.getByText("Sua vez")); });
}

// ── Tests ──────────────────────────────────────────────────────

describe("Botão Acusar", () => {
  beforeEach(() => {
    vi.mocked(useAuth).mockReturnValue({
      user: { id: "user-1" } as ReturnType<typeof useAuth>["user"],
      loading: false,
      isAnonymous: false,
      linkGoogle: vi.fn(),
    });
    vi.mocked(usePlayers).mockReturnValue([ALICE, BOB]);
  });

  it("aparece quando é o turno do jogador e ainda não acusou", async () => {
    vi.mocked(useGameState).mockReturnValue(
      rodadaJogando({ acusouNesteTurno: false, turnoAtual: "jogador-1" }),
    );

    await act(async () => { renderJogo(); });
    await passarRevealScreen();
    await abrirModalTurno();

    await waitFor(() => {
      expect(screen.getByText("Acusar")).toBeInTheDocument();
    });
  });

  it("não aparece quando o jogador já acusou neste turno", async () => {
    vi.mocked(useGameState).mockReturnValue(
      rodadaJogando({ acusouNesteTurno: true, turnoAtual: "jogador-1" }),
    );

    await act(async () => { renderJogo(); });
    await passarRevealScreen();

    await waitFor(() => {
      expect(screen.queryByText("Acusar")).not.toBeInTheDocument();
    });
  });

  it("não aparece quando não é o turno do jogador", async () => {
    vi.mocked(useGameState).mockReturnValue(
      rodadaJogando({ acusouNesteTurno: false, turnoAtual: "jogador-2" }),
    );

    await act(async () => { renderJogo(); });
    await passarRevealScreen();

    await waitFor(() => {
      expect(screen.queryByText("Acusar")).not.toBeInTheDocument();
    });
  });

  it("não aparece na primeira rodada mesmo sendo o turno do jogador", async () => {
    vi.mocked(useGameState).mockReturnValue(
      rodadaJogando({ primeiraRodada: true, acusouNesteTurno: false, turnoAtual: "jogador-1" }),
    );

    await act(async () => { renderJogo(); });
    await passarRevealScreen();

    await waitFor(() => {
      expect(screen.queryByText("Acusar")).not.toBeInTheDocument();
    });
  });

  it("reaparece quando o turno passa para o mesmo jogador novamente (acusou_neste_turno resetado)", async () => {
    const { rerender } = renderJogo();

    // Turno de Alice, já acusou
    vi.mocked(useGameState).mockReturnValue(
      rodadaJogando({ acusouNesteTurno: true, turnoAtual: "jogador-1" }),
    );
    await act(async () => {
      rerender(<Suspense fallback={null}><JogoPage params={PARAMS} /></Suspense>);
    });
    await passarRevealScreen();

    await waitFor(() => {
      expect(screen.queryByText("Acusar")).not.toBeInTheDocument();
    });

    // Turno passa para Bob e volta para Alice com flag resetada
    vi.mocked(useGameState).mockReturnValue(
      rodadaJogando({ acusouNesteTurno: false, turnoAtual: "jogador-1" }),
    );
    await act(async () => {
      rerender(<Suspense fallback={null}><JogoPage params={PARAMS} /></Suspense>);
    });

    await abrirModalTurno();

    await waitFor(() => {
      expect(screen.getByText("Acusar")).toBeInTheDocument();
    });
  });
});
