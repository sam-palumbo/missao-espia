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

vi.mock("motion/react", async () => {
  const { createElement } = await import("react");
  return {
    motion: new Proxy({} as Record<string, unknown>, {
      get: (_, tag: string) =>
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
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

async function abrirModalTurno() {
  await waitFor(() => screen.getByText(/É sua vez/i));
  await act(async () => {
    // No modal anymore — button is directly at the bottom
  });
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
      expect(screen.getByText(/Você foi eliminado/i)).toBeInTheDocument();
    });
  });

  it("não mostra botões Adivinhar/Acusar (fase votacao mostra só overlay)", async () => {
    vi.mocked(useGameState).mockReturnValue(rodadaVotacaoComEliminada());

    await act(async () => { renderJogo(); });
    await passarRevealScreen();

    await waitFor(() => {
      expect(screen.getByText(/Votação/)).toBeInTheDocument();
    });
    expect(screen.queryByRole("button", { name: /^acusar$/i })).not.toBeInTheDocument();
  });

  it("não mostra botão Dizer Palavra quando jogador está eliminado e é primeira rodada", async () => {
    const rodadaPrimeiraRodada: RodadaAtual = {
      id: "rodada-1",
      numero: 1,
      evento_id: 1,
      encerrada_em: null,
      estado: {
        fase: "jogando",
        turno_atual: "jogador-1",
        ordem_turnos: ["jogador-1", "jogador-2", "jogador-3"],
        espia_ids: [],
        timer_end: new Date(Date.now() + 300_000).toISOString(),
        eliminacoes_erradas: 0,
        acusado_id: null,
        acusou_neste_turno: false,
        adivinhou_evento_id: null,
        pergunta_atual: null,
        historico: [],
        primeira_rodada: true,
        palavras_primeira_rodada: [],
      },
    };

    vi.mocked(useGameState).mockReturnValue(rodadaPrimeiraRodada);

    await act(async () => { renderJogo(); });
    await passarRevealScreen();

    await waitFor(() => {
      expect(
        screen.queryByRole("button", { name: /dizer palavra/i })
      ).not.toBeInTheDocument();
    });
  });
});

// ── Fixtures adicionais ────────────────────────────────────────

const ALICE_ATIVA = {
  id: "jogador-1",
  user_id: "user-1",
  apelido: "Alice",
  ativo: true,
};

function rodadaAliceTurno(): RodadaAtual {
  return {
    id: "rodada-1",
    numero: 1,
    evento_id: 1,
    encerrada_em: null,
    estado: {
      fase: "jogando",
      turno_atual: "jogador-1",
      ordem_turnos: ["jogador-1", "jogador-2", "jogador-3"],
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

function rodadaBobTurno(): RodadaAtual {
  const base = rodadaAliceTurno();
  return { ...base, estado: { ...base.estado, turno_atual: "jogador-2" } };
}

// ── Regressão: jogador ativo vê botões de ação ─────────────────

describe("Regressão — jogador ativo vê botões de ação", () => {
  beforeEach(() => {
    vi.mocked(useAuth).mockReturnValue({
      user: { id: "user-2" } as ReturnType<typeof useAuth>["user"],
      loading: false,
      isAnonymous: false,
      linkGoogle: vi.fn(),
    });
    vi.mocked(usePlayers).mockReturnValue([ALICE_ATIVA, BOB, CARLOS]);
    vi.clearAllMocks();
  });

  it("mostra botão Fazer Pergunta para jogador ativo no seu turno", async () => {
    vi.mocked(useGameState).mockReturnValue(rodadaBobTurno());
    await act(async () => { renderJogo(); });
    await passarRevealScreen();
    await waitFor(() => {
      expect(screen.getByRole("button", { name: /fazer pergunta/i })).toBeInTheDocument();
    });
  });

  it("mostra botão Acusar para jogador ativo no seu turno", async () => {
    const rodada = rodadaBobTurno();
    vi.mocked(useGameState).mockReturnValue({ ...rodada, numero: 2 });
    await act(async () => { renderJogo(); });
    await passarRevealScreen();
    await waitFor(() => {
      expect(screen.getByRole("button", { name: /acusar/i })).toBeInTheDocument();
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
    vi.mocked(useAuth).mockReturnValue({
      user: { id: "user-1" } as ReturnType<typeof useAuth>["user"],
      loading: false,
      isAnonymous: false,
      linkGoogle: vi.fn(),
    });
    // Alice ainda ativa em usePlayers (stale)
    vi.mocked(usePlayers).mockReturnValue([ALICE_ATIVA, BOB, CARLOS]);
    vi.clearAllMocks();
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
    const rodadaOrdemVazia: RodadaAtual = {
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

const ALICE_ESPIA_PEGA = {
  id: "jogador-1",
  user_id: "user-1",
  apelido: "Alice",
  ativo: true, // ainda ativa (só elimina ao errar o palpite)
};

function rodadaAdivinhacaoEspiaPego(): RodadaAtual {
  return {
    id: "rodada-1",
    numero: 1,
    evento_id: 1,
    encerrada_em: null,
    estado: {
      fase: "adivinhacao",
      turno_atual: "jogador-2", // Bob acusou, turno continua dele
      ordem_turnos: ["jogador-2", "jogador-3"], // Alice (espia pega) removida da ordem
      espia_ids: ["jogador-1"], // Alice é espia
      timer_end: new Date(Date.now() + 300_000).toISOString(),
      eliminacoes_erradas: 0,
      acusado_id: "jogador-1", // Alice foi acusada
      acusou_neste_turno: true,
      adivinhou_evento_id: null,
      pergunta_atual: null,
      historico: [],
      primeira_rodada: false,
      palavras_primeira_rodada: [],
    },
  };
}

describe("Espia pego por votação — fase adivinhacao", () => {
  beforeEach(() => {
    vi.mocked(useAuth).mockReturnValue({
      user: { id: "user-1" } as ReturnType<typeof useAuth>["user"],
      loading: false,
      isAnonymous: false,
      linkGoogle: vi.fn(),
    });
    vi.mocked(usePlayers).mockReturnValue([ALICE_ESPIA_PEGA, BOB, CARLOS]);
    vi.clearAllMocks();
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
    vi.mocked(useAuth).mockReturnValue({
      user: { id: "user-999" } as ReturnType<typeof useAuth>["user"],
      loading: false,
      isAnonymous: false,
      linkGoogle: vi.fn(),
    });
    vi.mocked(usePlayers).mockReturnValue([ALICE_ATIVA, BOB, CARLOS]);
    vi.mocked(useGameState).mockReturnValue(rodadaBobTurno());

    await act(async () => { renderJogo(); });
    await passarRevealScreen();

    expect(screen.queryByText(/Você foi eliminado/i)).not.toBeInTheDocument();
  });
});

// ── Sheet fecha quando jogador é eliminado ─────────────────────

describe("Sheets fecham automaticamente quando jogador é eliminado", () => {
  beforeEach(() => {
    vi.mocked(useAuth).mockReturnValue({
      user: { id: "user-1" } as ReturnType<typeof useAuth>["user"],
      loading: false,
      isAnonymous: false,
      linkGoogle: vi.fn(),
    });
    vi.clearAllMocks();
  });

  function rodadaAliceTurnoNumero2(): RodadaAtual {
    const base = rodadaAliceTurno();
    return { ...base, numero: 2 };
  }

  it("fecha o sheet de 'Fazer Pergunta' quando o jogador é eliminado", async () => {
    vi.mocked(usePlayers).mockReturnValue([ALICE_ATIVA, BOB, CARLOS]);
    vi.mocked(useGameState).mockReturnValue(rodadaAliceTurnoNumero2());

    const { rerender } = render(
      <Suspense fallback={null}>
        <JogoPage params={PARAMS} />
      </Suspense>
    );
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
    vi.mocked(usePlayers).mockReturnValue([ALICE_ATIVA, BOB, CARLOS]);
    vi.mocked(useGameState).mockReturnValue(rodadaAliceTurnoNumero2());

    const { rerender } = render(
      <Suspense fallback={null}>
        <JogoPage params={PARAMS} />
      </Suspense>
    );
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
