import React, { Suspense } from "react";
import { render, screen, fireEvent, act, waitFor } from "@testing-library/react";
import { vi, describe, it, expect, beforeEach } from "vitest";
import { makeRodada, makePlayer } from "./helpers";

// ── Mocks (idênticos ao jogo-responder.test.tsx) ───────────────

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

// ── Imports ────────────────────────────────────────────────────

import { usePlayers } from "@/hooks/usePlayers";
import { useGameState } from "@/hooks/useGameState";
import { useAuth } from "@/hooks/useAuth";
import JogoPage from "@/app/sala/[code]/jogo/page";

// ── Fixtures ───────────────────────────────────────────────────

const ALICE = makePlayer({ id: "jogador-1", apelido: "Alice" });
const BOB   = makePlayer({ id: "jogador-2", user_id: "user-2", apelido: "Bob" });
const PARAMS = Promise.resolve({ code: "TEST" });

function rodada({ turnoPalavras = false, isSpy = false, acusouNesteTurno = false, comHistorico = false } = {}) {
  return makeRodada(
    { numero: turnoPalavras ? 1 : 2 },
    {
      espia_ids: isSpy ? ["jogador-1"] : [],
      acusou_neste_turno: acusouNesteTurno,
      historico: comHistorico ? [{ tipo: "pergunta" as const, turno_numero: 1, perguntador_apelido: "Alice", destinatario_apelido: "Bob", pergunta: "?", resposta: "!" }] : [],
      turno_palavras: turnoPalavras,
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

describe("Ações do turno aparecem diretamente no rodapé", () => {
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

  it("Fazer Pergunta aparece diretamente na rodada normal", async () => {
    vi.mocked(useGameState).mockReturnValue(rodada());

    await act(async () => { renderJogo(); });
    await passarRevealScreen();

    await waitFor(() => {
      expect(screen.getByRole("button", { name: /fazer pergunta/i })).toBeInTheDocument();
    });
  });

  it("Acusar aparece diretamente a partir do 2º turno da rodada", async () => {
    vi.mocked(useGameState).mockReturnValue(rodada({ comHistorico: true }));

    await act(async () => { renderJogo(); });
    await passarRevealScreen();

    await waitFor(() => {
      expect(screen.getByText("Acusar")).toBeInTheDocument();
    });
  });

  it("Dizer Palavra aparece na primeira rodada, mas não Acusar ou Fazer Pergunta", async () => {
    vi.mocked(useGameState).mockReturnValue(rodada({ turnoPalavras: true }));

    await act(async () => { renderJogo(); });
    await passarRevealScreen();

    await waitFor(() => {
      expect(screen.getByRole("button", { name: /diga uma palavra/i })).toBeInTheDocument();
    });
    expect(screen.queryByRole("button", { name: /fazer pergunta/i })).not.toBeInTheDocument();
    expect(screen.queryByText("Acusar")).not.toBeInTheDocument();
  });

  it("Adivinhar aparece quando é espia", async () => {
    vi.mocked(useGameState).mockReturnValue(rodada({ isSpy: true }));

    await act(async () => { renderJogo(); });
    await passarRevealScreen();

    await waitFor(() => {
      expect(screen.getByRole("button", { name: /adivinhar/i })).toBeInTheDocument();
    });
  });

  it("Concluí turno NÃO aparece em modo online (turno avança automaticamente)", async () => {
    vi.mocked(useGameState).mockReturnValue(rodada());

    await act(async () => { renderJogo(); });
    await passarRevealScreen();

    await waitFor(() => {
      expect(screen.queryByRole("button", { name: /conclu[íi] turno/i })).not.toBeInTheDocument();
    });
  });

  it("ações não aparecem quando não é o turno do jogador", async () => {
    vi.mocked(useGameState).mockReturnValue(rodada());
    // Make Bob the current turn
    vi.mocked(useGameState).mockReturnValue({
      ...rodada(),
      estado: { ...rodada().estado, turno_atual: "jogador-2" },
    });

    await act(async () => { renderJogo(); });
    await passarRevealScreen();

    await waitFor(() => {
      expect(screen.queryByRole("button", { name: /fazer pergunta/i })).not.toBeInTheDocument();
      expect(screen.queryByText("Acusar")).not.toBeInTheDocument();
    });
  });

  it("não mostra Acusar quando já acusou neste turno", async () => {
    vi.mocked(useGameState).mockReturnValue(rodada({ acusouNesteTurno: true }));

    await act(async () => { renderJogo(); });
    await passarRevealScreen();

    await waitFor(() => {
      expect(screen.getByRole("button", { name: /fazer pergunta/i })).toBeInTheDocument();
    });
    expect(screen.queryByText("Acusar")).not.toBeInTheDocument();
  });
});
