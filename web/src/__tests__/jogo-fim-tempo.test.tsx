// web/src/__tests__/jogo-fim-tempo.test.tsx
import React, { Suspense } from "react";
import { render, screen, act, waitFor } from "@testing-library/react";
import { vi, describe, it, expect, beforeEach } from "vitest";
import { makeRodada, makePlayer } from "./helpers";

vi.mock("next/navigation", () => ({ useRouter: () => ({ push: vi.fn() }) }));
vi.mock("@/lib/supabase", async () => (await import("./helpers")).makeSupabaseMock({ id: "sala-1", modo: "online", anfitriao: "user-1" }));
vi.mock("@/hooks/usePlayers");
vi.mock("@/hooks/useGameState");
vi.mock("@/hooks/useAuth");
vi.mock("@/lib/game-actions", async () => (await import("./helpers")).gameActionsMock);
vi.mock("sonner", () => ({ toast: { error: vi.fn() } }));
vi.mock("@/lib/eventos", () => ({ EVENTOS: [{ id: 1, evento: "Criação", local: "Jardim do Éden", testament: "AT" }] }));
vi.mock("@/components/ui/design", async () => (await import("./helpers")).designMock);
vi.mock("motion/react", async () => (await import("./helpers")).motionMock);

import { usePlayers } from "@/hooks/usePlayers";
import { useGameState } from "@/hooks/useGameState";
import { useAuth } from "@/hooks/useAuth";
import { gameActions } from "@/lib/game-actions";
import JogoPage from "@/app/sala/[code]/jogo/page";

const ALICE = makePlayer({ id: "jogador-1", apelido: "Alice" });
const BOB   = makePlayer({ id: "jogador-2", user_id: "user-2", apelido: "Bob" });
const PARAMS = Promise.resolve({ code: "TEST" });

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

describe("Fim de tempo — trigger e UI", () => {
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

  it("chama encerrarPorTempo quando timer_end já passou e fase é jogando", async () => {
    const pastTimer = new Date(Date.now() - 1000).toISOString();
    vi.mocked(gameActions.encerrarPorTempo).mockResolvedValue({ ok: true });
    vi.mocked(useGameState).mockReturnValue(
      makeRodada({}, { fase: "jogando", timer_end: pastTimer })
    );

    await act(async () => { renderJogo(); });
    await passarRevealScreen();

    await waitFor(() => {
      expect(vi.mocked(gameActions.encerrarPorTempo)).toHaveBeenCalledWith("rodada-1");
    });
  });

  it("chama encerrarPorTempo quando timer expirou e fase é aguardando_resposta", async () => {
    const pastTimer = new Date(Date.now() - 1000).toISOString();
    vi.mocked(gameActions.encerrarPorTempo).mockResolvedValue({ ok: true });
    vi.mocked(useGameState).mockReturnValue(
      makeRodada({}, {
        fase: "aguardando_resposta",
        timer_end: pastTimer,
        pergunta_atual: {
          perguntador_id: "jogador-2",
          perguntador_apelido: "Bob",
          destinatario_id: "jogador-1",
          destinatario_apelido: "Alice",
          texto: "O que você vê?",
        },
      })
    );

    await act(async () => { renderJogo(); });
    await passarRevealScreen();

    await waitFor(() => {
      expect(vi.mocked(gameActions.encerrarPorTempo)).toHaveBeenCalledWith("rodada-1");
    });
  });

  it("não chama encerrarPorTempo quando timer ainda não expirou", async () => {
    const futureTimer = new Date(Date.now() + 300_000).toISOString();
    vi.mocked(gameActions.encerrarPorTempo).mockResolvedValue({ ok: true });
    vi.mocked(useGameState).mockReturnValue(
      makeRodada({}, { fase: "jogando", timer_end: futureTimer })
    );

    await act(async () => { renderJogo(); });
    await passarRevealScreen();

    await new Promise(r => setTimeout(r, 100));
    expect(vi.mocked(gameActions.encerrarPorTempo)).not.toHaveBeenCalled();
  });

  it("espia vê sheet de adivinhação na fase adivinhacao_fim_tempo", async () => {
    vi.mocked(useGameState).mockReturnValue(
      makeRodada({}, {
        fase: "adivinhacao_fim_tempo",
        espia_ids: ["jogador-1"],
        timer_adivinhacao_end: new Date(Date.now() + 30_000).toISOString(),
        adivinhacoes_fim_tempo: { "jogador-1": null },
      })
    );

    await act(async () => { renderJogo(); });
    await passarRevealScreen();

    await waitFor(() => {
      expect(screen.getByText(/Onde você está/i)).toBeInTheDocument();
    });
  });

  it("não-espia vê banner 'espias estão adivinhando' na fase adivinhacao_fim_tempo", async () => {
    vi.mocked(useGameState).mockReturnValue(
      makeRodada({}, {
        fase: "adivinhacao_fim_tempo",
        espia_ids: ["jogador-2"],
        timer_adivinhacao_end: new Date(Date.now() + 30_000).toISOString(),
        adivinhacoes_fim_tempo: { "jogador-2": null },
      })
    );

    await act(async () => { renderJogo(); });
    await passarRevealScreen();

    await waitFor(() => {
      expect(screen.getByText(/espias estão adivinhando/i)).toBeInTheDocument();
    });
  });

  it("espia submete adivinhação via adivinharFimTempo", async () => {
    vi.mocked(gameActions.adivinharFimTempo).mockResolvedValue({ aguardando: true });
    vi.mocked(useGameState).mockReturnValue(
      makeRodada({}, {
        fase: "adivinhacao_fim_tempo",
        espia_ids: ["jogador-1"],
        timer_adivinhacao_end: new Date(Date.now() + 30_000).toISOString(),
        adivinhacoes_fim_tempo: { "jogador-1": null },
      })
    );

    await act(async () => { renderJogo(); });
    await passarRevealScreen();

    // Selecionar primeiro evento da lista e confirmar
    await waitFor(() => screen.getByText("Criação"));
    await act(async () => { (screen.getByText("Criação").closest("button") as HTMLElement).click(); });
    await act(async () => { (screen.getByText(/Confirmar/i) as HTMLElement).click(); });

    await waitFor(() => {
      expect(vi.mocked(gameActions.adivinharFimTempo)).toHaveBeenCalledWith("rodada-1", 1);
    });
  });
});
