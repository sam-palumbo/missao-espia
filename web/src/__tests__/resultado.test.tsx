// web/src/__tests__/resultado.test.tsx
import React, { Suspense } from "react";
import { render, screen, fireEvent, act, waitFor } from "@testing-library/react";
import { vi, describe, it, expect, beforeEach } from "vitest";
import { makeRodada, makePlayer } from "./helpers";

// ── Configurable supabase mock ─────────────────────────────────
let mockSalaData: Record<string, unknown> = { id: "sala-1", status: "jogando" };

vi.mock("next/navigation", () => ({ useRouter: () => ({ push: vi.fn() }) }));
vi.mock("@/lib/supabase", () => ({
  createClient: () => ({
    from: () => ({
      select: () => ({
        eq: () => ({ single: () => Promise.resolve({ data: mockSalaData }) }),
      }),
    }),
  }),
}));
vi.mock("@/hooks/usePlayers");
vi.mock("@/hooks/useGameState");
vi.mock("@/lib/eventos", () => ({
  EVENTOS: [{ id: 1, evento: "Criação", local: "Jardim do Éden", testament: "AT" }],
}));
vi.mock("motion/react", async () => (await import("./helpers")).motionMock);
vi.mock("@/components/ui/design", async () => (await import("./helpers")).designMock);

import { usePlayers } from "@/hooks/usePlayers";
import { useGameState } from "@/hooks/useGameState";
import ResultadoPage from "@/app/sala/[code]/resultado/page";

const PARAMS = Promise.resolve({ code: "TEST" });

const ALICE    = makePlayer({ id: "jogador-1", apelido: "Alice",  pontuacao: 3, ativo: true  });
const BOB_PEGO = makePlayer({ id: "jogador-2", apelido: "Bob",    pontuacao: 1, ativo: false });
const BOB_LIVRE = makePlayer({ id: "jogador-2", apelido: "Bob",   pontuacao: 1, ativo: true  });
const CARLOS   = makePlayer({ id: "jogador-3", apelido: "Carlos", pontuacao: 2, ativo: true  });

const espiaPegoRodada = (adivinhou = false) =>
  makeRodada({}, { espia_ids: ["jogador-2"], adivinhou_evento_id: adivinhou ? 1 : null });

const espiaLivreRodada = () =>
  makeRodada({}, { espia_ids: ["jogador-2"], adivinhou_evento_id: null });

function renderResultado() {
  return render(
    <Suspense fallback={null}>
      <ResultadoPage params={PARAMS} />
    </Suspense>
  );
}

describe("Página Resultado", () => {
  beforeEach(() => {
    mockSalaData = { id: "sala-1", status: "jogando" };
    vi.clearAllMocks();
  });

  it("mostra 'Espia caçado!' quando espia foi pego e não adivinhou", async () => {
    vi.mocked(useGameState).mockReturnValue(espiaPegoRodada(false));
    vi.mocked(usePlayers).mockReturnValue([ALICE, BOB_PEGO]);

    await act(async () => { renderResultado(); });

    await waitFor(() => {
      expect(screen.getByText("Espia caçado!")).toBeInTheDocument();
    });
  });

  it("mostra 'Missão cumprida' quando espia não foi pego", async () => {
    vi.mocked(useGameState).mockReturnValue(espiaLivreRodada());
    vi.mocked(usePlayers).mockReturnValue([ALICE, BOB_LIVRE]);

    await act(async () => { renderResultado(); });

    await waitFor(() => {
      expect(screen.getByText("Missão cumprida")).toBeInTheDocument();
    });
  });

  it("mostra 'Missão cumprida' quando espia foi pego mas adivinhou", async () => {
    vi.mocked(useGameState).mockReturnValue(espiaPegoRodada(true));
    vi.mocked(usePlayers).mockReturnValue([ALICE, BOB_PEGO]);

    await act(async () => { renderResultado(); });

    await waitFor(() => {
      expect(screen.getByText("Missão cumprida")).toBeInTheDocument();
    });
  });

  it("mostra o apelido do espia", async () => {
    vi.mocked(useGameState).mockReturnValue(espiaPegoRodada(false));
    vi.mocked(usePlayers).mockReturnValue([ALICE, BOB_PEGO]);

    await act(async () => { renderResultado(); });

    await waitFor(() => {
      const spySection = screen.getByText("O espia era").closest("div");
      expect(spySection).toHaveTextContent("Bob");
    });
  });

  it("mostra 'Toque para revelar' antes de clicar", async () => {
    vi.mocked(useGameState).mockReturnValue(espiaPegoRodada(false));
    vi.mocked(usePlayers).mockReturnValue([ALICE, BOB_PEGO]);

    await act(async () => { renderResultado(); });

    await waitFor(() => {
      expect(screen.getByText("Toque para revelar")).toBeInTheDocument();
    });
  });

  it("revela o local ao clicar em 'Toque para revelar'", async () => {
    vi.mocked(useGameState).mockReturnValue(espiaPegoRodada(false));
    vi.mocked(usePlayers).mockReturnValue([ALICE, BOB_PEGO]);

    await act(async () => { renderResultado(); });

    await waitFor(() => screen.getByText("Toque para revelar"));
    await act(async () => {
      fireEvent.click(screen.getByText("Toque para revelar"));
    });

    await waitFor(() => {
      expect(screen.getByText("Jardim do Éden")).toBeInTheDocument();
    });
  });

  it("mostra '+1 pt' quando espia adivinhou", async () => {
    vi.mocked(useGameState).mockReturnValue(espiaPegoRodada(true));
    vi.mocked(usePlayers).mockReturnValue([ALICE, BOB_PEGO]);

    await act(async () => { renderResultado(); });

    await waitFor(() => {
      expect(screen.getByText("+1 pt")).toBeInTheDocument();
    });
  });

  it("mostra '0 pt' quando espia não adivinhou", async () => {
    vi.mocked(useGameState).mockReturnValue(espiaPegoRodada(false));
    vi.mocked(usePlayers).mockReturnValue([ALICE, BOB_PEGO]);

    await act(async () => { renderResultado(); });

    await waitFor(() => {
      expect(screen.getByText("0 pt")).toBeInTheDocument();
    });
  });

  it("ordena jogadores por pontuação decrescente", async () => {
    // espia_ids vazio → nenhuma seção de espia → nomes aparecem só na lista de pontuação
    vi.mocked(useGameState).mockReturnValue(makeRodada());
    vi.mocked(usePlayers).mockReturnValue([
      makePlayer({ id: "j1", apelido: "Xena",   pontuacao: 5  }),
      makePlayer({ id: "j2", apelido: "Yasmin", pontuacao: 20 }),
      makePlayer({ id: "j3", apelido: "Zara",   pontuacao: 10 }),
    ]);

    await act(async () => { renderResultado(); });

    await waitFor(() => {
      const nomes = screen.getAllByText(/Xena|Yasmin|Zara/).map(el => el.textContent!);
      expect(nomes.indexOf("Yasmin")).toBeLessThan(nomes.indexOf("Zara"));
      expect(nomes.indexOf("Zara")).toBeLessThan(nomes.indexOf("Xena"));
    });
  });

  it("mostra 'Próxima Rodada' quando sala não está encerrada", async () => {
    mockSalaData = { id: "sala-1", status: "jogando" };
    vi.mocked(useGameState).mockReturnValue(espiaPegoRodada(false));
    vi.mocked(usePlayers).mockReturnValue([ALICE, BOB_PEGO]);

    await act(async () => { renderResultado(); });

    await waitFor(() => {
      expect(screen.getByText("Próxima Rodada")).toBeInTheDocument();
    });
  });

  it("mostra 'Ver Placar Final' quando sala está encerrada", async () => {
    mockSalaData = { id: "sala-1", status: "encerrada" };
    vi.mocked(useGameState).mockReturnValue(espiaPegoRodada(false));
    vi.mocked(usePlayers).mockReturnValue([ALICE, BOB_PEGO]);

    await act(async () => { renderResultado(); });

    await waitFor(() => {
      expect(screen.getByText("Ver Placar Final")).toBeInTheDocument();
    });
  });
});
