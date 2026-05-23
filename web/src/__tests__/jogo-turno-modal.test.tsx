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
          single: () => Promise.resolve({ data: { id: "sala-1", modo: "online" } }),
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

function rodada({ primeiraRodada = false, isSpy = false, acusouNesteTurno = false, comHistorico = false } = {}): RodadaAtual {
  return {
    id: "rodada-1",
    numero: primeiraRodada ? 1 : 2,
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
      historico: comHistorico ? [{ tipo: "pergunta" as const, perguntador_apelido: "Alice", destinatario_apelido: "Bob", pergunta: "?", resposta: "!" }] : [],
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

// ── Tests ──────────────────────────────────────────────────────

describe("Ações do turno aparecem diretamente no rodapé", () => {
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

  it("Fazer Pergunta aparece diretamente na rodada normal", async () => {
    vi.mocked(useGameState).mockReturnValue(rodada());

    await act(async () => { renderJogo(); });
    await passarRevealScreen();

    await waitFor(() => {
      expect(screen.getByRole("button", { name: /fazer pergunta/i })).toBeInTheDocument();
    });
  });

  it("Acusar aparece diretamente a partir do 2º turno da rodada", async () => {
    vi.mocked(useGameState).mockReturnValue(rodada({ comHistorico: true }));

    await act(async () => { renderJogo(); });
    await passarRevealScreen();

    await waitFor(() => {
      expect(screen.getByText("Acusar")).toBeInTheDocument();
    });
  });

  it("Dizer Palavra aparece na primeira rodada, mas não Acusar ou Fazer Pergunta", async () => {
    vi.mocked(useGameState).mockReturnValue(rodada({ primeiraRodada: true }));

    await act(async () => { renderJogo(); });
    await passarRevealScreen();

    await waitFor(() => {
      expect(screen.getByRole("button", { name: /diga uma palavra/i })).toBeInTheDocument();
    });
    expect(screen.queryByRole("button", { name: /fazer pergunta/i })).not.toBeInTheDocument();
    expect(screen.queryByText("Acusar")).not.toBeInTheDocument();
  });

  it("Adivinhar aparece quando é espia", async () => {
    vi.mocked(useGameState).mockReturnValue(rodada({ isSpy: true }));

    await act(async () => { renderJogo(); });
    await passarRevealScreen();

    await waitFor(() => {
      expect(screen.getByRole("button", { name: /adivinhar/i })).toBeInTheDocument();
    });
  });

  it("Concluí turno NÃO aparece em modo online (turno avança automaticamente)", async () => {
    vi.mocked(useGameState).mockReturnValue(rodada());

    await act(async () => { renderJogo(); });
    await passarRevealScreen();

    await waitFor(() => {
      expect(screen.queryByRole("button", { name: /conclu[íi] turno/i })).not.toBeInTheDocument();
    });
  });

  it("ações não aparecem quando não é o turno do jogador", async () => {
    vi.mocked(useGameState).mockReturnValue(rodada());
    // Make Bob the current turn
    vi.mocked(useGameState).mockReturnValue({
      ...rodada(),
      estado: { ...rodada().estado, turno_atual: "jogador-2" },
    });

    await act(async () => { renderJogo(); });
    await passarRevealScreen();

    await waitFor(() => {
      expect(screen.queryByRole("button", { name: /fazer pergunta/i })).not.toBeInTheDocument();
      expect(screen.queryByText("Acusar")).not.toBeInTheDocument();
    });
  });

  it("não mostra Acusar quando já acusou neste turno", async () => {
    vi.mocked(useGameState).mockReturnValue(rodada({ acusouNesteTurno: true }));

    await act(async () => { renderJogo(); });
    await passarRevealScreen();

    await waitFor(() => {
      expect(screen.getByRole("button", { name: /fazer pergunta/i })).toBeInTheDocument();
    });
    expect(screen.queryByText("Acusar")).not.toBeInTheDocument();
  });
});
