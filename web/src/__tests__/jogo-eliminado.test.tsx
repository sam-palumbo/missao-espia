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
  const base = rodadaJogandoComEliminada();
  return {
    ...base,
    estado: {
      ...base.estado,
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
