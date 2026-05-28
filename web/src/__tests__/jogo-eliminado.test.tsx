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

vi.mock("motion/react", async () => (await import("./helpers")).motionMock);

vi.mock("@/components/ui/design", async () => (await import("./helpers")).designMock);

// ── Imports ────────────────────────────────────────────────────

import { usePlayers } from "@/hooks/usePlayers";
import { useGameState } from "@/hooks/useGameState";
import { useAuth } from "@/hooks/useAuth";
import JogoPage from "@/app/sala/[code]/jogo/page";

// ── Fixtures ───────────────────────────────────────────────────

const ALICE_ATIVA     = makePlayer({ id: "jogador-1", apelido: "Alice" });
const ALICE_ELIMINADA = makePlayer({ id: "jogador-1", apelido: "Alice", ativo: false });
const BOB             = makePlayer({ id: "jogador-2", user_id: "user-2", apelido: "Bob" });
const CARLOS          = makePlayer({ id: "jogador-3", user_id: "user-3", apelido: "Carlos" });

const PARAMS = Promise.resolve({ code: "TEST" });

// ── Factories de rodada ────────────────────────────────────────

function rodadaJogandoComEliminada() {
  return makeRodada(
    {},
    {
      turno_atual: "jogador-2",
      ordem_turnos: ["jogador-2", "jogador-3"],
      eliminacoes_erradas: 1,
    }
  );
}

function rodadaVotacaoComEliminada() {
  return makeRodada(
    {},
    {
      turno_atual: "jogador-2",
      ordem_turnos: ["jogador-2", "jogador-3"],
      eliminacoes_erradas: 1,
      fase: "votacao",
      acusado_id: "jogador-2",
      acusou_neste_turno: true,
    }
  );
}

function rodadaBobTurno() {
  return makeRodada(
    {},
    {
      turno_atual: "jogador-2",
      ordem_turnos: ["jogador-1", "jogador-2", "jogador-3"],
    }
  );
}

function rodadaAdivinhacaoEspiaPego() {
  return makeRodada(
    {},
    {
      fase: "adivinhacao",
      turno_atual: "jogador-2", // Bob acusou, turno continua dele
      ordem_turnos: ["jogador-2", "jogador-3"], // Alice (espia pega) removida da ordem
      espia_ids: ["jogador-1"], // Alice é espia
      acusado_id: "jogador-1", // Alice foi acusada
      acusou_neste_turno: true,
    }
  );
}

// ── Helpers ────────────────────────────────────────────────────

function mockAuth(userId: string) {
  vi.mocked(useAuth).mockReturnValue({
    user: { id: userId } as ReturnType<typeof useAuth>["user"],
    loading: false,
    isAnonymous: false,
  } as ReturnType<typeof useAuth>);
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
    vi.clearAllMocks();
    mockAuth("user-1");
    vi.mocked(usePlayers).mockReturnValue([ALICE_ELIMINADA, BOB, CARLOS]);
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
      expect(screen.getByText(/Você foi eliminado/i)).toBeInTheDocument();
    });
    expect(screen.queryByRole("button", { name: /^acusar$/i })).not.toBeInTheDocument();
  });

  it("não mostra botão Fazer Pergunta quando jogador está eliminado", async () => {
    vi.mocked(useGameState).mockReturnValue(rodadaJogandoComEliminada());

    await act(async () => { renderJogo(); });
    await passarRevealScreen();

    await waitFor(() => {
      expect(screen.getByText(/Você foi eliminado/i)).toBeInTheDocument();
    });
    expect(screen.queryByRole("button", { name: /fazer pergunta/i })).not.toBeInTheDocument();
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
      expect(screen.getByText(/Você foi eliminado/i)).toBeInTheDocument();
    });
  });

  it("não mostra botão Acusar durante votação (overlay cobre a tela)", async () => {
    vi.mocked(useGameState).mockReturnValue(rodadaVotacaoComEliminada());

    await act(async () => { renderJogo(); });
    await passarRevealScreen();

    await waitFor(() => {
      expect(screen.getByText(/Votação/)).toBeInTheDocument();
    });
    expect(screen.queryByRole("button", { name: /^acusar$/i })).not.toBeInTheDocument();
  });

  it("não mostra botão Diga uma palavra quando jogador está eliminado na fase turno_palavras", async () => {
    const rodadaTurnoPalavras = makeRodada(
      {},
      {
        turno_atual: "jogador-1",
        fase: "turno_palavras" as const,
        ordem_turnos: ["jogador-1", "jogador-2", "jogador-3"],
      }
    );

    vi.mocked(useGameState).mockReturnValue(rodadaTurnoPalavras);

    await act(async () => { renderJogo(); });
    await passarRevealScreen();

    await waitFor(() => {
      expect(screen.getByText(/Você foi eliminado/i)).toBeInTheDocument();
    });
    expect(screen.queryByRole("button", { name: /diga uma palavra/i })).not.toBeInTheDocument();
  });
});

// ── Regressão: jogador ativo vê botões de ação ─────────────────

describe("Regressão — jogador ativo vê botões de ação", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockAuth("user-2");
    vi.mocked(usePlayers).mockReturnValue([ALICE_ATIVA, BOB, CARLOS]);
  });

  it("mostra botão Fazer Pergunta para jogador ativo no seu turno", async () => {
    vi.mocked(useGameState).mockReturnValue(rodadaBobTurno());
    await act(async () => { renderJogo(); });
    await passarRevealScreen();
    await waitFor(() => {
      expect(screen.getByRole("button", { name: /fazer pergunta/i })).toBeInTheDocument();
    });
  });

  it("mostra botão Acusar para jogador ativo quando há histórico (não é primeiro turno)", async () => {
    const rodada = rodadaBobTurno();
    rodada.estado.historico.push({ tipo: "pergunta" as const, turno_numero: 1, perguntador_apelido: "Alice", destinatario_apelido: "Bob", pergunta: "?", resposta: "!" });
    vi.mocked(useGameState).mockReturnValue(rodada);
    await act(async () => { renderJogo(); });
    await passarRevealScreen();
    await waitFor(() => {
      expect(screen.getByRole("button", { name: /acusar/i })).toBeInTheDocument();
    });
  });

  it("mostra botão Diga uma palavra para jogador ativo em turno_palavras", async () => {
    const rodada = makeRodada({}, {
      fase: "turno_palavras" as const,
      turno_atual: "jogador-2",
      ordem_turnos: ["jogador-1", "jogador-2", "jogador-3"],
    });
    vi.mocked(useGameState).mockReturnValue(rodada);
    await act(async () => { renderJogo(); });
    await passarRevealScreen();
    await waitFor(() => {
      expect(screen.getByRole("button", { name: /diga uma palavra/i })).toBeInTheDocument();
    });
  });

  it("não mostra banner de observador para jogador ativo", async () => {
    vi.mocked(useGameState).mockReturnValue(rodadaBobTurno());
    await act(async () => { renderJogo(); });
    await passarRevealScreen();
    await waitFor(() => {
      expect(screen.getByText(/É sua vez/i)).toBeInTheDocument();
    });
    expect(screen.queryByText(/Você foi eliminado/i)).not.toBeInTheDocument();
  });
});

// ── Race condition: ativo stale, ausente de ordem_turnos ───────

describe("meuEliminado — race: ativo=true mas fora de ordem_turnos", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockAuth("user-1");
    // Alice ainda ativa em usePlayers (stale)
    vi.mocked(usePlayers).mockReturnValue([ALICE_ATIVA, BOB, CARLOS]);
  });

  it("mostra banner de observador quando ativo=true mas ausente de ordem_turnos", async () => {
    // useGameState já removeu Alice de ordem_turnos
    vi.mocked(useGameState).mockReturnValue(rodadaJogandoComEliminada());
    await act(async () => { renderJogo(); });
    await passarRevealScreen();
    await waitFor(() => {
      expect(screen.getByText(/Você foi eliminado/i)).toBeInTheDocument();
    });
  });

  it("oculta botão Fazer Pergunta quando ativo=true mas ausente de ordem_turnos", async () => {
    vi.mocked(useGameState).mockReturnValue(rodadaJogandoComEliminada());
    await act(async () => { renderJogo(); });
    await passarRevealScreen();
    await waitFor(() => {
      expect(screen.getByText(/Você foi eliminado/i)).toBeInTheDocument();
    });
    expect(screen.queryByRole("button", { name: /fazer pergunta/i })).not.toBeInTheDocument();
  });

  it("oculta botão Acusar quando ativo=true mas ausente de ordem_turnos", async () => {
    vi.mocked(useGameState).mockReturnValue(rodadaJogandoComEliminada());
    await act(async () => { renderJogo(); });
    await passarRevealScreen();
    await waitFor(() => {
      expect(screen.getByText(/Você foi eliminado/i)).toBeInTheDocument();
    });
    expect(screen.queryByRole("button", { name: /^acusar$/i })).not.toBeInTheDocument();
  });

  it("NÃO trata como eliminado quando ordem_turnos está vazia (edge case transitório)", async () => {
    const base = rodadaJogandoComEliminada();
    const rodadaOrdemVazia = {
      ...base,
      estado: { ...base.estado, ordem_turnos: [] },
    };
    vi.mocked(useGameState).mockReturnValue(rodadaOrdemVazia);
    await act(async () => { renderJogo(); });
    await passarRevealScreen();
    // Não pode tratar como eliminado se ordem_turnos vier vazia transitoriamente
    expect(screen.queryByText(/Você foi eliminado/i)).not.toBeInTheDocument();
  });
});

// ── Espia pego por votação — fase adivinhacao ──────────────────

describe("Espia pego por votação — fase adivinhacao", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockAuth("user-1");
    vi.mocked(usePlayers).mockReturnValue([ALICE_ATIVA, BOB, CARLOS]);
  });

  it("espia pego ainda vê o botão Adivinhar", async () => {
    vi.mocked(useGameState).mockReturnValue(rodadaAdivinhacaoEspiaPego());

    await act(async () => { renderJogo(); });
    await passarRevealScreen();

    await waitFor(() => {
      expect(screen.getByRole("button", { name: /adivinhar/i })).toBeInTheDocument();
    });
  });

  it("espia pego não vê o banner de observador", async () => {
    vi.mocked(useGameState).mockReturnValue(rodadaAdivinhacaoEspiaPego());

    await act(async () => { renderJogo(); });
    await passarRevealScreen();

    await waitFor(() => {
      expect(screen.getByRole("button", { name: /adivinhar/i })).toBeInTheDocument();
    });
    expect(screen.queryByText(/Você foi eliminado/i)).not.toBeInTheDocument();
  });

  it("espia pego não vê botão Fazer Pergunta", async () => {
    vi.mocked(useGameState).mockReturnValue(rodadaAdivinhacaoEspiaPego());

    await act(async () => { renderJogo(); });
    await passarRevealScreen();

    await waitFor(() => {
      expect(screen.getByRole("button", { name: /adivinhar/i })).toBeInTheDocument();
    });
    expect(screen.queryByRole("button", { name: /fazer pergunta/i })).not.toBeInTheDocument();
  });

  it("espia pego não vê botão Acusar", async () => {
    vi.mocked(useGameState).mockReturnValue(rodadaAdivinhacaoEspiaPego());

    await act(async () => { renderJogo(); });
    await passarRevealScreen();

    await waitFor(() => {
      expect(screen.getByRole("button", { name: /adivinhar/i })).toBeInTheDocument();
    });
    expect(screen.queryByRole("button", { name: /^acusar$/i })).not.toBeInTheDocument();
  });
});

// ── meuJogador ausente ─────────────────────────────────────────

describe("meuJogador ausente — sem crash nem banner", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("não mostra banner de observador quando usuário não está na lista de jogadores", async () => {
    mockAuth("user-999");
    vi.mocked(usePlayers).mockReturnValue([ALICE_ATIVA, BOB, CARLOS]);
    vi.mocked(useGameState).mockReturnValue(rodadaBobTurno());

    await act(async () => { renderJogo(); });
    await passarRevealScreen();

    expect(screen.queryByText(/Você foi eliminado/i)).not.toBeInTheDocument();
  });
});

// ── Sheet fecha quando jogador é eliminado ─────────────────────

describe("Sheets fecham automaticamente quando jogador é eliminado", () => {
  function rodadaAliceTurnoNumero2() {
    return makeRodada({ numero: 2 }, { turno_atual: "jogador-1", ordem_turnos: ["jogador-1", "jogador-2", "jogador-3"] });
  }

  beforeEach(() => {
    vi.clearAllMocks();
    mockAuth("user-1");
  });

  it("fecha o sheet de 'Fazer Pergunta' quando o jogador é eliminado", async () => {
    vi.mocked(usePlayers).mockReturnValue([ALICE_ATIVA, BOB, CARLOS]);
    vi.mocked(useGameState).mockReturnValue(rodadaAliceTurnoNumero2());

    const { rerender } = renderJogo();
    await act(async () => {});
    await passarRevealScreen();

    await waitFor(() => screen.getByRole("button", { name: /fazer pergunta/i }));
    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: /fazer pergunta/i }));
    });
    expect(screen.getByText(/Para quem perguntar/i)).toBeInTheDocument();

    // Alice é eliminada
    vi.mocked(usePlayers).mockReturnValue([ALICE_ELIMINADA, BOB, CARLOS]);
    vi.mocked(useGameState).mockReturnValue(rodadaJogandoComEliminada());

    await act(async () => {
      rerender(
        <Suspense fallback={null}>
          <JogoPage params={PARAMS} />
        </Suspense>
      );
    });

    expect(screen.queryByText(/Para quem perguntar/i)).not.toBeInTheDocument();
  });

  it("fecha o sheet de 'Acusar' quando o jogador é eliminado", async () => {
    const rodadaComHistorico = rodadaAliceTurnoNumero2();
    rodadaComHistorico.estado.historico.push({ tipo: "pergunta" as const, turno_numero: 1, perguntador_apelido: "Alice", destinatario_apelido: "Bob", pergunta: "?", resposta: "!" });
    vi.mocked(usePlayers).mockReturnValue([ALICE_ATIVA, BOB, CARLOS]);
    vi.mocked(useGameState).mockReturnValue(rodadaComHistorico);

    const { rerender } = renderJogo();
    await act(async () => {});
    await passarRevealScreen();

    await waitFor(() => screen.getByText("Acusar"));
    await act(async () => {
      fireEvent.click(screen.getByText("Acusar"));
    });
    expect(screen.getByText(/Quem é o Espia/i)).toBeInTheDocument();

    vi.mocked(usePlayers).mockReturnValue([ALICE_ELIMINADA, BOB, CARLOS]);
    vi.mocked(useGameState).mockReturnValue(rodadaJogandoComEliminada());

    await act(async () => {
      rerender(
        <Suspense fallback={null}>
          <JogoPage params={PARAMS} />
        </Suspense>
      );
    });

    expect(screen.queryByText(/Quem é o Espia/i)).not.toBeInTheDocument();
  });
});
