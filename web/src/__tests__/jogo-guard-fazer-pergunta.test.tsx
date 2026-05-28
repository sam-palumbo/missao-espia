/**
 * Testa o guard em handleFazerPergunta que previne chamar a API durante
 * o turno de palavras — situação que ocorre em race condition quando uma
 * nova rodada começa (fase "turno_palavras") enquanto o sheet de perguntas
 * ainda está aberto da rodada anterior.
 */
import React, { Suspense } from "react";
import { render, screen, fireEvent, act, waitFor, within } from "@testing-library/react";
import { vi, describe, it, expect, beforeEach } from "vitest";
import { makeRodada, makePlayer } from "./helpers";

// ── Mocks ──────────────────────────────────────────────────────

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn() }),
}));

vi.mock("@/lib/supabase", async () =>
  (await import("./helpers")).makeSupabaseMock({ id: "sala-1", modo: "online" })
);

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
import { gameActions } from "@/lib/game-actions";
import JogoPage from "@/app/sala/[code]/jogo/page";

// ── Fixtures ───────────────────────────────────────────────────

const ALICE = makePlayer({ id: "jogador-1", apelido: "Alice" });
const BOB   = makePlayer({ id: "jogador-2", user_id: "user-2", apelido: "Bob" });
const PARAMS = Promise.resolve({ code: "TEST" });

function rodadaPerguntas() {
  return makeRodada(
    { id: "rodada-1" },
    {
      historico: [{ tipo: "pergunta" as const, turno_numero: 1, perguntador_apelido: "Alice", destinatario_apelido: "Bob", pergunta: "?", resposta: "!" }],
    }
  );
}

function rodadaNovaComPalavras() {
  // Nova rodada — fase "turno_palavras"
  return makeRodada(
    { id: "rodada-2", numero: 2 },
    { fase: "turno_palavras" as const, palavras_turno: [] }
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

describe("handleFazerPergunta — guard contra fase turno_palavras", () => {
  beforeEach(() => {
    vi.mocked(useAuth).mockReturnValue({
      user: { id: "user-1" } as ReturnType<typeof useAuth>["user"],
      loading: false,
      isAnonymous: false,
    } as ReturnType<typeof useAuth>);
    vi.mocked(usePlayers).mockReturnValue([ALICE, BOB]);
    vi.clearAllMocks();
  });

  it("não chama fazerPergunta se fase virou turno_palavras antes do submit", async () => {
    // Passo 1: rodada normal (fase=jogando) — sheet de pergunta pode abrir
    vi.mocked(useGameState).mockReturnValue(rodadaPerguntas());

    let rerender: ReturnType<typeof render>["rerender"];
    await act(async () => { ({ rerender } = renderJogo()); });
    await passarRevealScreen();

    // Verificar que o botão "Fazer Pergunta" aparece
    await waitFor(() => {
      expect(screen.getByRole("button", { name: /fazer pergunta/i })).toBeInTheDocument();
    });

    // Passo 2: abrir o sheet clicando em "Fazer Pergunta"
    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: /fazer pergunta/i }));
    });

    // Passo 3: selecionar destinatário (Bob) dentro do sheet (evita ambiguidade com o grid)
    await waitFor(() => {
      expect(screen.getByText("Para quem perguntar?")).toBeInTheDocument();
    });
    // sobe ao container pai que engloba todo o conteúdo do sheet
    const sheetContainer = screen.getByText("Para quem perguntar?").parentElement!;
    await act(async () => { fireEvent.click(within(sheetContainer).getByText("Bob")); });

    // Passo 4: estado muda para nova rodada com fase=turno_palavras (race condition)
    vi.mocked(useGameState).mockReturnValue(rodadaNovaComPalavras());
    await act(async () => {
      rerender(<Suspense fallback={null}><JogoPage params={PARAMS} /></Suspense>);
    });

    // Passo 5: tentar clicar Enviar — o guard deve impedir a chamada à API
    const btnEnviar = screen.queryByRole("button", { name: /enviar/i });
    if (btnEnviar) {
      await act(async () => { fireEvent.click(btnEnviar); });
    }

    expect(gameActions.fazerPergunta).not.toHaveBeenCalled();
  });

  it("chama fazerPergunta normalmente quando fase=jogando e dados válidos", async () => {
    vi.mocked(useGameState).mockReturnValue(rodadaPerguntas());
    vi.mocked(gameActions.fazerPergunta as ReturnType<typeof vi.fn>).mockResolvedValue({ ok: true });

    await act(async () => { renderJogo(); });
    await passarRevealScreen();

    // Abrir sheet
    await waitFor(() => {
      expect(screen.getByRole("button", { name: /fazer pergunta/i })).toBeInTheDocument();
    });
    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: /fazer pergunta/i }));
    });

    // Selecionar Bob dentro do sheet
    await waitFor(() => { expect(screen.getByText("Para quem perguntar?")).toBeInTheDocument(); });
    const sheetContainer2 = screen.getByText("Para quem perguntar?").parentElement!;
    await act(async () => { fireEvent.click(within(sheetContainer2).getByText("Bob")); });

    // Digitar pergunta
    await waitFor(() => {
      expect(screen.getByPlaceholderText(/sua pergunta/i)).toBeInTheDocument();
    });
    await act(async () => {
      fireEvent.change(screen.getByPlaceholderText(/sua pergunta/i), {
        target: { value: "O que você viu?" },
      });
    });

    // Enviar
    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: /enviar/i }));
    });

    expect(gameActions.fazerPergunta).toHaveBeenCalledWith("rodada-1", "jogador-2", "O que você viu?");
  });
});
