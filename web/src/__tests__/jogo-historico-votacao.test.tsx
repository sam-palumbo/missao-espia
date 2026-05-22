import React, { Suspense } from "react";
import { render, screen, act, waitFor } from "@testing-library/react";
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

// ── Imports ────────────────────────────────────────────────────

import { usePlayers } from "@/hooks/usePlayers";
import { useGameState } from "@/hooks/useGameState";
import { useAuth } from "@/hooks/useAuth";
import JogoPage from "@/app/sala/[code]/jogo/page";

// ── Fixtures ───────────────────────────────────────────────────

const ALICE = { id: "jogador-1", user_id: "user-1", apelido: "Alice", ativo: true };
const BOB   = { id: "jogador-2", user_id: "user-2", apelido: "Bob",   ativo: true };
const CARLOS = { id: "jogador-3", user_id: "user-3", apelido: "Carlos", ativo: true };

const PARAMS = Promise.resolve({ code: "TEST" });

function rodadaComVotacao(resultado: "eliminado" | "sobreviveu" | "espia_pego"): RodadaAtual {
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
      historico: [
        {
          tipo: "votacao",
          acusado_apelido: "Bob",
          votos: [
            { votante_apelido: "Alice",  aprovado: true },
            { votante_apelido: "Carlos", aprovado: false },
          ],
          resultado,
        },
      ],
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
  if (btn) await act(async () => { (btn as HTMLElement).click(); });
}

// ── Tests ──────────────────────────────────────────────────────

describe("Histórico de votações", () => {
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

  it("mostra o nome do acusado no painel de histórico", async () => {
    vi.mocked(useGameState).mockReturnValue(rodadaComVotacao("eliminado"));

    await act(async () => { renderJogo(); });
    await passarRevealScreen();

    await waitFor(() => {
      expect(screen.getByText(/acusado:\s*bob/i)).toBeInTheDocument();
    });
  });

  it("mostra cada votante com seu voto (Sim/Não)", async () => {
    vi.mocked(useGameState).mockReturnValue(rodadaComVotacao("eliminado"));

    await act(async () => { renderJogo(); });
    await passarRevealScreen();

    await waitFor(() => {
      // Alice votou 👍 Sim, Carlos votou 👎 Não — confirma rótulos específicos da votação
      expect(screen.getByText(/👍 sim/i)).toBeInTheDocument();
      expect(screen.getByText(/👎 não/i)).toBeInTheDocument();
    });
  });

  it("mostra resultado 'eliminado' quando o acusado foi eliminado", async () => {
    vi.mocked(useGameState).mockReturnValue(rodadaComVotacao("eliminado"));

    await act(async () => { renderJogo(); });
    await passarRevealScreen();

    await waitFor(() => {
      expect(screen.getByText(/eliminad/i)).toBeInTheDocument();
    });
  });

  it("mostra resultado 'sobreviveu' quando a votação foi rejeitada", async () => {
    vi.mocked(useGameState).mockReturnValue(rodadaComVotacao("sobreviveu"));

    await act(async () => { renderJogo(); });
    await passarRevealScreen();

    await waitFor(() => {
      expect(screen.getByText(/sobrevive/i)).toBeInTheDocument();
    });
  });

  it("mostra resultado 'espia pego' quando o espia foi descoberto", async () => {
    vi.mocked(useGameState).mockReturnValue(rodadaComVotacao("espia_pego"));

    await act(async () => { renderJogo(); });
    await passarRevealScreen();

    await waitFor(() => {
      expect(screen.getByText(/espia pego/i)).toBeInTheDocument();
    });
  });
});
