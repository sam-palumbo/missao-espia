import React, { Suspense } from "react";
import { render, screen, fireEvent, act, waitFor } from "@testing-library/react";
import { vi, describe, it, expect, beforeEach } from "vitest";
import { makeRodada, makePlayer } from "./helpers";

// ── Mocks ──────────────────────────────────────────────────────

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn() }),
}));

vi.mock("@/lib/supabase", async () => (await import("./helpers")).makeSupabaseMock({ id: "sala-1" }));

vi.mock("@/hooks/usePlayers");
vi.mock("@/hooks/useGameState");
vi.mock("@/hooks/useAuth");

vi.mock("@/lib/game-actions", async () => (await import("./helpers")).gameActionsMock);

vi.mock("sonner", () => ({ toast: { error: vi.fn() } }));
vi.mock("@/lib/eventos", () => ({ EVENTOS: [] }));

vi.mock("@/components/ui/design", async () => (await import("./helpers")).designMock);

// ── Helpers ────────────────────────────────────────────────────

import { usePlayers } from "@/hooks/usePlayers";
import { useGameState } from "@/hooks/useGameState";
import { useAuth } from "@/hooks/useAuth";
import JogoPage from "@/app/sala/[code]/jogo/page";

const JOGADOR_1 = makePlayer({ id: "jogador-1", apelido: "Alice" });
const JOGADOR_2 = makePlayer({ id: "jogador-2", user_id: "user-2", apelido: "Bob" });

function rodadaAguardandoResposta(destinatarioId: string) {
  return makeRodada(
    {},
    {
      fase: "aguardando_resposta",
      turno_atual: "jogador-2",
      pergunta_atual: {
        perguntador_id: "jogador-2",
        perguntador_apelido: "Bob",
        destinatario_id: destinatarioId,
        destinatario_apelido: destinatarioId === "jogador-1" ? "Alice" : "Bob",
        texto: "Qual é sua relação com este lugar?",
      },
    }
  );
}

function rodadaJogando() {
  return makeRodada({}, {});
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

describe("Não existe opção de passar turno", () => {
  beforeEach(() => {
    vi.mocked(useAuth).mockReturnValue({
      user: { id: "user-1" } as ReturnType<typeof useAuth>["user"],
      loading: false,
      isAnonymous: false,
    } as ReturnType<typeof useAuth>);
    vi.mocked(usePlayers).mockReturnValue([JOGADOR_1, JOGADOR_2]);
  });

  it("botão Passar não aparece quando é o turno do jogador fora da primeira rodada", async () => {
    vi.mocked(useGameState).mockReturnValue(rodadaJogando());

    await act(async () => { renderJogo(); });
    passarRevealScreen();

    await waitFor(() => {
      expect(screen.getByText(/É sua vez/i)).toBeInTheDocument();
    });
    expect(screen.queryByRole("button", { name: /passar/i })).not.toBeInTheDocument();
  });
});

describe("Sheet de responder pergunta", () => {
  beforeEach(() => {
    vi.mocked(useAuth).mockReturnValue({
      user: { id: "user-1" } as ReturnType<typeof useAuth>["user"],
      loading: false,
      isAnonymous: false,
    } as ReturnType<typeof useAuth>);
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
