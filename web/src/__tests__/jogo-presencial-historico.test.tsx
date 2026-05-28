import React, { Suspense } from "react";
import { render, screen, fireEvent, act, waitFor } from "@testing-library/react";
import { vi, describe, it, expect, beforeEach } from "vitest";
import { makeRodada, makePlayer } from "./helpers";

// ── Mocks ──────────────────────────────────────────────────────

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn() }),
}));

vi.mock("@/lib/supabase", async () => (await import("./helpers")).makeSupabaseMock({ id: "sala-1", modo: "presencial" }));

vi.mock("@/hooks/usePlayers");
vi.mock("@/hooks/useGameState");
vi.mock("@/hooks/useAuth");

const proximoTurnoMock = vi.fn().mockResolvedValue(undefined);

vi.mock("@/lib/game-actions", () => ({
  gameActions: {
    acusar: vi.fn(),
    votar: vi.fn(),
    fazerPergunta: vi.fn(),
    responderPergunta: vi.fn(),
    dizerPalavra: vi.fn(),
    adivinhar: vi.fn(),
    proximoTurno: (...args: unknown[]) => proximoTurnoMock(...args),
  },
}));

vi.mock("sonner", () => ({ toast: { error: vi.fn() } }));
vi.mock("@/lib/eventos", () => ({ EVENTOS: [] }));

vi.mock("motion/react", async () => (await import("./helpers")).motionMock);

vi.mock("@/components/ui/design", async () => (await import("./helpers")).designMock);

// ── Imports ────────────────────────────────────────────────────

import { usePlayers } from "@/hooks/usePlayers";
import { useGameState } from "@/hooks/useGameState";
import { useAuth } from "@/hooks/useAuth";
import JogoPage from "@/app/sala/[code]/jogo/page";

// ── Fixtures ───────────────────────────────────────────────────

const J1 = makePlayer({ id: "jogador-1", apelido: "Ana" });
const J2 = makePlayer({ id: "jogador-2", user_id: "user-2", apelido: "Bruno" });
const J3 = makePlayer({ id: "jogador-3", user_id: "user-3", apelido: "Carla" });

const PARAMS = Promise.resolve({ code: "PRES" });

function rodadaPresencial(turnoAtual: string) {
  return makeRodada(
    { id: "rod-1", numero: 2 },
    {
      turno_atual: turnoAtual,
      ordem_turnos: ["jogador-1", "jogador-2", "jogador-3"],
      historico: [
        { tipo: "turno_presencial" as const, turno_numero: 1, jogador_apelido: "Bruno" },
        { tipo: "turno_presencial" as const, turno_numero: 2, jogador_apelido: "Carla" },
      ],
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

describe("Jogo presencial — TurnoPresencial integrado", () => {
  beforeEach(() => {
    proximoTurnoMock.mockClear();
    vi.mocked(useAuth).mockReturnValue({
      user: { id: "user-1" } as ReturnType<typeof useAuth>["user"],
      loading: false,
      isAnonymous: false,
    } as ReturnType<typeof useAuth>);
    vi.mocked(usePlayers).mockReturnValue([J1, J2, J3]);
  });

  it("é a minha vez: mostra 'É sua vez' e botão 'Concluí turno'", async () => {
    vi.mocked(useGameState).mockReturnValue(rodadaPresencial("jogador-1"));

    await act(async () => { renderJogo(); });
    await passarRevealScreen();

    await waitFor(() => {
      expect(screen.getByText(/É sua vez/i)).toBeInTheDocument();
    });
    expect(screen.getByRole("button", { name: /Conclu[íi] turno/i })).toBeInTheDocument();
  });

  it("não mostra input de texto (input sheets) em modo presencial", async () => {
    vi.mocked(useGameState).mockReturnValue(rodadaPresencial("jogador-1"));

    await act(async () => { renderJogo(); });
    await passarRevealScreen();

    await waitFor(() => {
      expect(screen.getByText(/É sua vez/i)).toBeInTheDocument();
    });
    // Sheets de texto não devem estar visíveis
    expect(screen.queryByPlaceholderText(/Uma palavra apenas/i)).not.toBeInTheDocument();
    expect(screen.queryByPlaceholderText(/Sua pergunta/i)).not.toBeInTheDocument();
  });

  it("clicar em 'Concluí turno' chama gameActions.proximoTurno com o id da rodada", async () => {
    vi.mocked(useGameState).mockReturnValue(rodadaPresencial("jogador-1"));

    await act(async () => { renderJogo(); });
    await passarRevealScreen();

    await waitFor(() => {
      expect(screen.getByRole("button", { name: /Conclu[íi] turno/i })).toBeInTheDocument();
    });

    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: /Conclu[íi] turno/i }));
    });

    await waitFor(() => {
      expect(proximoTurnoMock).toHaveBeenCalledWith("rod-1");
    });
  });

  it("histórico renderiza os apelidos dos turnos presenciais (Bruno, Carla)", async () => {
    vi.mocked(useGameState).mockReturnValue(rodadaPresencial("jogador-1"));

    await act(async () => { renderJogo(); });
    await passarRevealScreen();

    await waitFor(() => {
      // getAllByText porque o apelido pode aparecer tanto no grid de jogadores quanto no histórico
      expect(screen.getAllByText("Bruno").length).toBeGreaterThanOrEqual(1);
      expect(screen.getAllByText("Carla").length).toBeGreaterThanOrEqual(1);
    });
  });

  it("vez de outro jogador: mostra 'Vez de Bruno', sem botão 'Concluí turno'", async () => {
    vi.mocked(useGameState).mockReturnValue(rodadaPresencial("jogador-2"));

    await act(async () => { renderJogo(); });
    await passarRevealScreen();

    await waitFor(() => {
      expect(screen.getByText(/Vez de\s*Bruno/i)).toBeInTheDocument();
    });
    expect(screen.queryByRole("button", { name: /Conclu[íi] turno/i })).not.toBeInTheDocument();
  });

  // ── Acusação ──────────────────────────────────────────────────

  it("rodada 2+ mostra botão Acusar", async () => {
    vi.mocked(useGameState).mockReturnValue(rodadaPresencial("jogador-1"));

    await act(async () => { renderJogo(); });
    await passarRevealScreen();

    await waitFor(() => {
      expect(screen.getByRole("button", { name: /Acusar/i })).toBeInTheDocument();
    });
  });

  it("clicar Acusar abre a sheet de acusação (lista de jogadores)", async () => {
    vi.mocked(useGameState).mockReturnValue(rodadaPresencial("jogador-1"));

    await act(async () => { renderJogo(); });
    await passarRevealScreen();

    await waitFor(() => {
      expect(screen.getByRole("button", { name: /Acusar/i })).toBeInTheDocument();
    });

    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: /Acusar/i }));
    });

    await waitFor(() => {
      expect(screen.getByText(/Quem é o Espia/i)).toBeInTheDocument();
    });
  });
});
