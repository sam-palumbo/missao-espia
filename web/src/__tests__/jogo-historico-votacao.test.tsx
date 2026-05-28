import React, { Suspense } from "react";
import { render, screen, act, waitFor } from "@testing-library/react";
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

const ALICE  = makePlayer({ id: "jogador-1", apelido: "Alice" });
const BOB    = makePlayer({ id: "jogador-2", user_id: "user-2", apelido: "Bob" });
const CARLOS = makePlayer({ id: "jogador-3", user_id: "user-3", apelido: "Carlos" });

const PARAMS = Promise.resolve({ code: "TEST" });

function rodadaComVotacao(resultado: "eliminado" | "sobreviveu" | "espia_pego") {
  return makeRodada(
    {},
    {
      ordem_turnos: ["jogador-1", "jogador-2", "jogador-3"],
      historico: [
        {
          tipo: "votacao" as const,
          acusado_apelido: "Bob",
          votos: [
            { votante_apelido: "Alice",  aprovado: true },
            { votante_apelido: "Carlos", aprovado: false },
          ],
          resultado,
        },
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

describe("Histórico de votações", () => {
  beforeEach(() => {
    vi.mocked(useAuth).mockReturnValue({
      user: { id: "user-1" } as ReturnType<typeof useAuth>["user"],
      loading: false,
      isAnonymous: false,
    } as ReturnType<typeof useAuth>);
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
