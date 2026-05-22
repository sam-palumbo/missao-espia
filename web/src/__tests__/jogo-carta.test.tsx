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

vi.mock("@/lib/eventos", () => ({
  EVENTOS: [
    { id: 1, evento: "Criação", local: "Jardim do Éden", testament: "AT" },
  ],
}));

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

function rodadaNaoEspia(): RodadaAtual {
  return {
    id: "rodada-1",
    numero: 1,
    evento_id: 1, // Criação / Jardim do Éden
    encerrada_em: null,
    estado: {
      fase: "jogando",
      turno_atual: "jogador-2",
      ordem_turnos: ["jogador-1", "jogador-2"],
      espia_ids: ["jogador-2"], // Bob é espia, Alice não é
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

function rodadaEspia(): RodadaAtual {
  return {
    ...rodadaNaoEspia(),
    estado: {
      ...rodadaNaoEspia().estado,
      turno_atual: "jogador-1",
      espia_ids: ["jogador-1"], // Alice é espia
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

describe("Rever minha carta", () => {
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

  it("botão Minha Carta está visível durante o jogo", async () => {
    vi.mocked(useGameState).mockReturnValue(rodadaNaoEspia());

    await act(async () => { renderJogo(); });
    await passarRevealScreen();

    await waitFor(() => {
      expect(screen.getByRole("button", { name: /minha carta/i })).toBeInTheDocument();
    });
  });

  it("clicar em Minha Carta abre sheet com botão Fechar", async () => {
    vi.mocked(useGameState).mockReturnValue(rodadaNaoEspia());

    await act(async () => { renderJogo(); });
    await passarRevealScreen();

    await waitFor(() => screen.getByRole("button", { name: /minha carta/i }));
    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: /minha carta/i }));
    });

    await waitFor(() => {
      expect(screen.getByRole("button", { name: /fechar/i })).toBeInTheDocument();
    });
  });

  it("sheet exibe evento e local para jogador não-espia", async () => {
    vi.mocked(useGameState).mockReturnValue(rodadaNaoEspia());

    await act(async () => { renderJogo(); });
    await passarRevealScreen();

    await waitFor(() => screen.getByRole("button", { name: /minha carta/i }));
    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: /minha carta/i }));
    });

    await waitFor(() => {
      expect(screen.getByText("Criação")).toBeInTheDocument();
      expect(screen.getByText("Jardim do Éden")).toBeInTheDocument();
    });
  });

  it("sheet exibe 'Espia' para o jogador espia", async () => {
    vi.mocked(useGameState).mockReturnValue(rodadaEspia());

    await act(async () => { renderJogo(); });
    await passarRevealScreen();

    await waitFor(() => screen.getByRole("button", { name: /minha carta/i }));
    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: /minha carta/i }));
    });

    await waitFor(() => {
      expect(screen.getByText(/espia/i)).toBeInTheDocument();
    });
  });
});
