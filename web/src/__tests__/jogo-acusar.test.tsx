import React, { Suspense } from "react";
import { render, screen, fireEvent, act, waitFor } from "@testing-library/react";
import { vi, describe, it, expect, beforeEach } from "vitest";
import { makeRodada, makePlayer } from "./helpers";

// ── Mocks ──────────────────────────────────────────────────────

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn() }),
}));

vi.mock("@/lib/supabase", async () => (await import("./helpers")).makeSupabaseMock({ id: "sala-1", modo: "online" }));

vi.mock("@/hooks/usePlayers");
vi.mock("@/hooks/useGameState");
vi.mock("@/hooks/useAuth");

vi.mock("@/lib/game-actions", async () => (await import("./helpers")).gameActionsMock);

vi.mock("sonner", () => ({ toast: { error: vi.fn() } }));
vi.mock("@/lib/eventos", () => ({ EVENTOS: [] }));

vi.mock("motion/react", async () => (await import("./helpers")).motionMock);

vi.mock("@/components/ui/design", async () => (await import("./helpers")).designMock);

// ── Imports e helpers ──────────────────────────────────────────

import { usePlayers } from "@/hooks/usePlayers";
import { useGameState } from "@/hooks/useGameState";
import { useAuth } from "@/hooks/useAuth";
import JogoPage from "@/app/sala/[code]/jogo/page";

const ALICE = makePlayer({ id: "jogador-1", apelido: "Alice" });
const BOB   = makePlayer({ id: "jogador-2", user_id: "user-2", apelido: "Bob" });

const PARAMS = Promise.resolve({ code: "TEST" });

function rodadaJogando({ acusouNesteTurno = false, turnoAtual = "jogador-1", turnoPalavras = false, comHistorico = false } = {}) {
  return makeRodada(
    { id: "rodada-2", numero: 2 },
    {
      turno_atual: turnoAtual,
      acusou_neste_turno: acusouNesteTurno,
      turno_palavras: turnoPalavras,
      historico: comHistorico ? [{ tipo: "pergunta" as const, turno_numero: 1, perguntador_apelido: "Alice", destinatario_apelido: "Bob", pergunta: "?", resposta: "!" }] : [],
    }
  );
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

// ── Tests ──────────────────────────────────────────────────────

describe("Botão Acusar (online, ação no rodapé)", () => {
  beforeEach(() => {
    vi.mocked(useAuth).mockReturnValue({
      user: { id: "user-1" } as ReturnType<typeof useAuth>["user"],
      loading: false,
      isAnonymous: false,
      linkGoogle: vi.fn(),
    });
    vi.mocked(usePlayers).mockReturnValue([ALICE, BOB]);
  });

  it("aparece quando é o turno do jogador e ainda não acusou (turno 2+)", async () => {
    vi.mocked(useGameState).mockReturnValue(
      rodadaJogando({ acusouNesteTurno: false, turnoAtual: "jogador-1", comHistorico: true }),
    );

    await act(async () => { renderJogo(); });
    await passarRevealScreen();

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

  it("não aparece no primeiro turno da rodada", async () => {
    vi.mocked(useGameState).mockReturnValue(
      rodadaJogando({ comHistorico: false, acusouNesteTurno: false, turnoAtual: "jogador-1" }),
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
      rodadaJogando({ acusouNesteTurno: false, turnoAtual: "jogador-1", comHistorico: true }),
    );
    await act(async () => {
      rerender(<Suspense fallback={null}><JogoPage params={PARAMS} /></Suspense>);
    });

    await waitFor(() => {
      expect(screen.getByText("Acusar")).toBeInTheDocument();
    });
  });
});
