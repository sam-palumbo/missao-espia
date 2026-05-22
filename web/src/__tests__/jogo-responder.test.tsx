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
    fazerPergunta: vi.fn(),
    responderPergunta: vi.fn(),
    dizerPalavra: vi.fn(),
    acusar: vi.fn(),
    votar: vi.fn(),
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
    MEAvatar: ({ initial }: { initial: string }) => React.createElement("span", null, initial),
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

// ── Helpers ────────────────────────────────────────────────────

import { usePlayers } from "@/hooks/usePlayers";
import { useGameState } from "@/hooks/useGameState";
import { useAuth } from "@/hooks/useAuth";
import JogoPage from "@/app/sala/[code]/jogo/page";

const JOGADOR_1 = { id: "jogador-1", user_id: "user-1", apelido: "Alice", ativo: true };
const JOGADOR_2 = { id: "jogador-2", user_id: "user-2", apelido: "Bob", ativo: true };

function rodadaAguardandoResposta(destinatarioId: string): RodadaAtual {
  return {
    id: "rodada-1",
    numero: 1,
    evento_id: 1,
    encerrada_em: null,
    estado: {
      fase: "aguardando_resposta",
      turno_atual: "jogador-2",
      ordem_turnos: ["jogador-1", "jogador-2"],
      espia_ids: [],
      timer_end: new Date(Date.now() + 300_000).toISOString(),
      eliminacoes_erradas: 0,
      acusado_id: null,
      acusou_neste_turno: false,
      adivinhou_evento_id: null,
      pergunta_atual: {
        perguntador_id: "jogador-2",
        perguntador_apelido: "Bob",
        destinatario_id: destinatarioId,
        destinatario_apelido: destinatarioId === "jogador-1" ? "Alice" : "Bob",
        texto: "Qual é sua relação com este lugar?",
      },
      historico: [],
      primeira_rodada: false,
      palavras_primeira_rodada: [],
    },
  };
}

function rodadaJogando(): RodadaAtual {
  return {
    id: "rodada-1",
    numero: 1,
    evento_id: 1,
    encerrada_em: null,
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
    },
  };
}

const PARAMS = Promise.resolve({ code: "TEST" });

function renderJogo() {
  return render(
    <Suspense fallback={null}>
      <JogoPage params={PARAMS} />
    </Suspense>
  );
}

function passarRevealScreen() {
  const btn = screen.queryByText("Memorizei");
  if (btn) fireEvent.click(btn);
}

// ── Tests ──────────────────────────────────────────────────────

describe("Sheet de responder pergunta", () => {
  beforeEach(() => {
    vi.mocked(useAuth).mockReturnValue({
      user: { id: "user-1" } as ReturnType<typeof useAuth>["user"],
      loading: false,
      isAnonymous: false,
      linkGoogle: vi.fn(),
    });
    vi.mocked(usePlayers).mockReturnValue([JOGADOR_1, JOGADOR_2]);
  });

  it("abre quando a fase é aguardando_resposta e o jogador é o destinatário", async () => {
    vi.mocked(useGameState).mockReturnValue(rodadaAguardandoResposta("jogador-1"));

    await act(async () => { renderJogo(); });
    await act(async () => { passarRevealScreen(); });

    await waitFor(() => {
      expect(screen.getByText("Responder Pergunta")).toBeInTheDocument();
    });
  });

  it("não abre quando o jogador não é o destinatário", async () => {
    vi.mocked(useGameState).mockReturnValue(rodadaAguardandoResposta("jogador-2"));

    await act(async () => { renderJogo(); });
    await act(async () => { passarRevealScreen(); });

    await waitFor(() => {
      expect(screen.queryByText("Responder Pergunta")).not.toBeInTheDocument();
    });
  });

  it("não mostra modal quando nova pergunta chega para outro jogador, após o jogador ter respondido antes", async () => {
    // Passo 1: Alice (jogador-1) recebe uma pergunta → modal abre
    vi.mocked(useGameState).mockReturnValue(rodadaAguardandoResposta("jogador-1"));

    let rerender: ReturnType<typeof render>["rerender"];
    await act(async () => {
      ({ rerender } = renderJogo());
    });
    await act(async () => { passarRevealScreen(); });

    await waitFor(() => {
      expect(screen.getByText("Responder Pergunta")).toBeInTheDocument();
    });

    // Passo 2: Alice respondeu → fase jogando, pergunta_atual = null
    vi.mocked(useGameState).mockReturnValue(rodadaJogando());
    await act(async () => {
      rerender(<Suspense fallback={null}><JogoPage params={PARAMS} /></Suspense>);
    });

    // Passo 3: Nova pergunta chega, mas desta vez o destinatário é Bob (jogador-2)
    // Com o bug: showAnswerQuestion fica true → modal reaparece para Alice
    // Com o fix: showAnswerQuestion foi resetado → modal não aparece para Alice
    vi.mocked(useGameState).mockReturnValue(rodadaAguardandoResposta("jogador-2"));
    await act(async () => {
      rerender(<Suspense fallback={null}><JogoPage params={PARAMS} /></Suspense>);
    });

    await waitFor(() => {
      expect(screen.queryByText("Responder Pergunta")).not.toBeInTheDocument();
    });
  });
});
