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

vi.mock("@/lib/eventos", () => ({
  EVENTOS: [
    { id: 1, evento: "Criação",  local: "Jardim do Éden", testament: "AT" },
    { id: 2, evento: "Dilúvio", local: "Arca de Noé",    testament: "AT" },
  ],
}));

vi.mock("motion/react", async () => (await import("./helpers")).motionMock);

vi.mock("@/components/ui/design", async () => (await import("./helpers")).designMock);

// ── Imports ────────────────────────────────────────────────────

import { usePlayers } from "@/hooks/usePlayers";
import { useGameState } from "@/hooks/useGameState";
import { useAuth } from "@/hooks/useAuth";
import JogoPage from "@/app/sala/[code]/jogo/page";

// ── Fixtures ───────────────────────────────────────────────────

const ALICE = makePlayer({ id: "jogador-1", apelido: "Alice" });
const BOB   = makePlayer({ id: "jogador-2", user_id: "user-2", apelido: "Bob" });

const PARAMS = Promise.resolve({ code: "TEST" });

function rodadaNaoEspia() {
  return makeRodada(
    {},
    {
      turno_atual: "jogador-2",
      espia_ids: ["jogador-2"], // Bob é espia, Alice não é
    }
  );
}

function rodadaEspia() {
  return makeRodada(
    {},
    {
      turno_atual: "jogador-1",
      espia_ids: ["jogador-1"], // Alice é espia
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
  if (btn) await act(async () => { fireEvent.click(btn); });
}

// ── Tests ──────────────────────────────────────────────────────

describe("Rever minha carta", () => {
  beforeEach(() => {
    vi.mocked(useAuth).mockReturnValue({
      user: { id: "user-1" } as ReturnType<typeof useAuth>["user"],
      loading: false,
      isAnonymous: false,
    } as ReturnType<typeof useAuth>);
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

  it("sheet exibe seção 'Cenários possíveis' para o espia", async () => {
    vi.mocked(useGameState).mockReturnValue(rodadaEspia());

    await act(async () => { renderJogo(); });
    await passarRevealScreen();

    await waitFor(() => screen.getByRole("button", { name: /minha carta/i }));
    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: /minha carta/i }));
    });

    await waitFor(() => {
      expect(screen.getByText(/cenários possíveis/i)).toBeInTheDocument();
    });
  });

  it("sheet exibe todos os cenários para o espia", async () => {
    vi.mocked(useGameState).mockReturnValue(rodadaEspia());

    await act(async () => { renderJogo(); });
    await passarRevealScreen();

    await waitFor(() => screen.getByRole("button", { name: /minha carta/i }));
    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: /minha carta/i }));
    });

    await waitFor(() => {
      expect(screen.getByText("Criação")).toBeInTheDocument();
      expect(screen.getByText("Jardim do Éden")).toBeInTheDocument();
      expect(screen.getByText("Dilúvio")).toBeInTheDocument();
      expect(screen.getByText("Arca de Noé")).toBeInTheDocument();
    });
  });

  it("sheet não exibe 'Cenários possíveis' para jogador não-espia", async () => {
    vi.mocked(useGameState).mockReturnValue(rodadaNaoEspia());

    await act(async () => { renderJogo(); });
    await passarRevealScreen();

    await waitFor(() => screen.getByRole("button", { name: /minha carta/i }));
    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: /minha carta/i }));
    });

    await waitFor(() => screen.getByRole("button", { name: /fechar/i }));
    expect(screen.queryByText(/cenários possíveis/i)).not.toBeInTheDocument();
  });

  it("sheet não exibe eventos de outros cenários para jogador não-espia", async () => {
    vi.mocked(useGameState).mockReturnValue(rodadaNaoEspia());

    await act(async () => { renderJogo(); });
    await passarRevealScreen();

    await waitFor(() => screen.getByRole("button", { name: /minha carta/i }));
    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: /minha carta/i }));
    });

    await waitFor(() => screen.getByRole("button", { name: /fechar/i }));
    // evento_id: 1 → Criação deve aparecer; Dilúvio (id 2) não deve aparecer
    expect(screen.queryByText("Dilúvio")).not.toBeInTheDocument();
    expect(screen.queryByText("Arca de Noé")).not.toBeInTheDocument();
  });
});
