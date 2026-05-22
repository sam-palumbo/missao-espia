import React, { Suspense } from "react";
import { render, screen, fireEvent, act, waitFor } from "@testing-library/react";
import { vi, describe, it, expect, beforeEach } from "vitest";
import type { RodadaAtual } from "@/hooks/useGameState";

// ── Mocks (idênticos ao jogo-responder.test.tsx) ───────────────

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
import { gameActions } from "@/lib/game-actions";
import { toast } from "sonner";
import JogoPage from "@/app/sala/[code]/jogo/page";

const ALICE  = { id: "jogador-1", user_id: "user-1", apelido: "Alice",  ativo: true };
const BOB    = { id: "jogador-2", user_id: "user-2", apelido: "Bob",    ativo: true };
const CARLOS = { id: "jogador-3", user_id: "user-3", apelido: "Carlos", ativo: true };

const PARAMS = Promise.resolve({ code: "TEST" });

function rodadaVotacao(acusadoId: string): RodadaAtual {
  return {
    id: "rodada-1",
    numero: 1,
    evento_id: 1,
    encerrada_em: null,
    estado: {
      fase: "votacao",
      turno_atual: "jogador-1",
      ordem_turnos: ["jogador-1", "jogador-2", "jogador-3"],
      espia_ids: [],
      timer_end: new Date(Date.now() + 300_000).toISOString(),
      eliminacoes_erradas: 0,
      acusado_id: acusadoId,
      acusou_neste_turno: true,
      adivinhou_evento_id: null,
      pergunta_atual: null,
      historico: [],
      primeira_rodada: false,
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

describe("Overlay de votação", () => {
  beforeEach(() => {
    vi.mocked(useAuth).mockReturnValue({
      user: { id: "user-1" } as ReturnType<typeof useAuth>["user"],
      loading: false,
      isAnonymous: false,
      linkGoogle: vi.fn(),
    });
    vi.mocked(usePlayers).mockReturnValue([ALICE, BOB, CARLOS]);
    vi.clearAllMocks();
  });

  it("mostra overlay de votação quando fase é votacao", async () => {
    vi.mocked(useGameState).mockReturnValue(rodadaVotacao("jogador-2"));

    await act(async () => { renderJogo(); });
    await passarRevealScreen();

    await waitFor(() => {
      expect(screen.getByText("Votação")).toBeInTheDocument();
    });
  });

  it("mostra nome do acusado na pergunta de votação", async () => {
    vi.mocked(useGameState).mockReturnValue(rodadaVotacao("jogador-2"));

    await act(async () => { renderJogo(); });
    await passarRevealScreen();

    await waitFor(() => {
      expect(screen.getByText(/Bob é o espia/i)).toBeInTheDocument();
    });
  });

  it("mostra botões de voto para quem não é o acusado", async () => {
    // Alice (user-1) vota, Bob (jogador-2) é o acusado
    vi.mocked(useGameState).mockReturnValue(rodadaVotacao("jogador-2"));

    await act(async () => { renderJogo(); });
    await passarRevealScreen();

    await waitFor(() => {
      expect(screen.getByText(/Sim/)).toBeInTheDocument();
      expect(screen.getByText(/Não/)).toBeInTheDocument();
    });
  });

  it("mostra 'Aguardando votação' para o acusado em vez dos botões", async () => {
    // Alice (user-1) é a acusada
    vi.mocked(useGameState).mockReturnValue(rodadaVotacao("jogador-1"));

    await act(async () => { renderJogo(); });
    await passarRevealScreen();

    await waitFor(() => {
      expect(screen.getByText(/Aguardando votação/i)).toBeInTheDocument();
      expect(screen.queryByText(/👍 Sim/)).not.toBeInTheDocument();
    });
  });

  it("chama gameActions.votar com aprovado=true ao clicar Sim", async () => {
    vi.mocked(useGameState).mockReturnValue(rodadaVotacao("jogador-2"));
    vi.mocked(gameActions.votar).mockResolvedValue(undefined);

    await act(async () => { renderJogo(); });
    await passarRevealScreen();

    await waitFor(() => screen.getByText(/Sim/));
    await act(async () => {
      fireEvent.click(screen.getByText(/Sim/));
    });

    expect(vi.mocked(gameActions.votar)).toHaveBeenCalledWith("rodada-1", true);
  });

  it("chama gameActions.votar com aprovado=false ao clicar Não", async () => {
    vi.mocked(useGameState).mockReturnValue(rodadaVotacao("jogador-2"));
    vi.mocked(gameActions.votar).mockResolvedValue(undefined);

    await act(async () => { renderJogo(); });
    await passarRevealScreen();

    await waitFor(() => screen.getByText(/Não/));
    await act(async () => {
      fireEvent.click(screen.getByText(/Não/));
    });

    expect(vi.mocked(gameActions.votar)).toHaveBeenCalledWith("rodada-1", false);
  });

  it("exibe toast de erro quando voto falha (ex: já votou)", async () => {
    vi.mocked(useGameState).mockReturnValue(rodadaVotacao("jogador-2"));
    vi.mocked(gameActions.votar).mockRejectedValue(
      new Error("Você já votou nesta acusação"),
    );

    await act(async () => { renderJogo(); });
    await passarRevealScreen();

    await waitFor(() => screen.getByText(/Sim/));
    await act(async () => {
      fireEvent.click(screen.getByText(/Sim/));
    });

    await waitFor(() => {
      expect(vi.mocked(toast.error)).toHaveBeenCalledWith(
        "Você já votou nesta acusação",
      );
    });
  });
});
