import React from "react";
import { render, screen, fireEvent, act, waitFor } from "@testing-library/react";
import { vi, describe, it, expect, beforeEach } from "vitest";

vi.mock("next/navigation", () => ({ useRouter: () => ({ push: vi.fn() }) }));
vi.mock("next/link", () => ({
  default: ({ children, href }: { children: React.ReactNode; href: string }) =>
    React.createElement("a", { href }, children),
}));
vi.mock("@/lib/game-actions", async () => (await import("./helpers")).gameActionsMock);
vi.mock("@/lib/eventos", () => ({
  EVENTOS: [
    { id: 1, evento: "Criação do Mundo", local: "Jardim do Éden", testament: "AT" },
    { id: 2, evento: "Batismo de Jesus", local: "Rio Jordão", testament: "NT" },
  ],
}));
vi.mock("@/components/ui/design", async () => (await import("./helpers")).designMock);
vi.mock("motion/react", async () => (await import("./helpers")).motionMock);
vi.mock("sonner", () => ({ toast: { error: vi.fn() } }));

import { gameActions } from "@/lib/game-actions";
import CriarPage from "@/app/criar/page";

function renderCriar() {
  return render(<CriarPage />);
}

function getSlider(name: string | RegExp) {
  return screen.getByRole("slider", { name });
}

async function submit() {
  const btn = screen.getByRole("button", { name: /Criar Sala/i });
  await act(async () => { btn.click(); });
}

beforeEach(() => {
  vi.mocked(gameActions.criarSala).mockResolvedValue({
    sala: { id: "sala-1", codigo: "ABCD", num_rodadas: 5, status: "aguardando" },
    jogador: { id: "j-1", apelido: "Alice" },
  });
});

describe("Configuração de duração na criação da sala", () => {
  it("duração padrão é baseada na fórmula com max_jogadores=12 (5+12-3=14)", () => {
    renderCriar();
    const slider = getSlider("Duração por Rodada");
    expect(slider).toHaveValue("14");
  });

  it("badge 'recomendado' aparece enquanto duração não foi alterada manualmente", () => {
    renderCriar();
    expect(screen.getByText("recomendado")).toBeInTheDocument();
  });

  it("badge 'recomendado' desaparece após alterar manualmente a duração", async () => {
    renderCriar();
    const slider = getSlider("Duração por Rodada");
    fireEvent.change(slider, { target: { value: "10" } });
    await waitFor(() => {
      expect(screen.queryByText("recomendado")).not.toBeInTheDocument();
    });
  });

  it("mudar max_jogadores atualiza duração para o recomendado (8 jogadores → 5+8-2=11)", async () => {
    renderCriar();
    const sliderJog = getSlider("Máx. de Jogadores");
    fireEvent.change(sliderJog, { target: { value: "8" } });
    await waitFor(() => {
      expect(getSlider("Duração por Rodada")).toHaveValue("11");
    });
  });

  it("mudar max_jogadores reseta badge 'recomendado' mesmo após ter alterado manualmente", async () => {
    renderCriar();
    // 1. altera manualmente a duração
    fireEvent.change(getSlider("Duração por Rodada"), { target: { value: "10" } });
    await waitFor(() => expect(screen.queryByText("recomendado")).not.toBeInTheDocument());

    // 2. muda jogadores → deve resetar badge
    fireEvent.change(getSlider("Máx. de Jogadores"), { target: { value: "8" } });
    await waitFor(() => {
      expect(screen.getByText("recomendado")).toBeInTheDocument();
    });
  });

  it("criarSala é chamado com duracao_minutos igual ao padrão (14)", async () => {
    renderCriar();
    fireEvent.change(screen.getByLabelText(/Seu Apelido/i), { target: { value: "Davi" } });
    await submit();
    await waitFor(() => {
      expect(vi.mocked(gameActions.criarSala)).toHaveBeenCalledWith(
        "Davi",
        expect.any(Number),
        expect.objectContaining({ duracao_minutos: 14 })
      );
    });
  });

  it("criarSala é chamado com duracao_minutos escolhida manualmente", async () => {
    renderCriar();
    fireEvent.change(getSlider("Duração por Rodada"), { target: { value: "7" } });
    fireEvent.change(screen.getByLabelText(/Seu Apelido/i), { target: { value: "Ester" } });
    await submit();
    await waitFor(() => {
      expect(vi.mocked(gameActions.criarSala)).toHaveBeenCalledWith(
        "Ester",
        expect.any(Number),
        expect.objectContaining({ duracao_minutos: 7 })
      );
    });
  });

  it("criarSala é chamado com max_jogadores escolhido", async () => {
    renderCriar();
    fireEvent.change(getSlider("Máx. de Jogadores"), { target: { value: "6" } });
    fireEvent.change(screen.getByLabelText(/Seu Apelido/i), { target: { value: "Noé" } });
    await submit();
    await waitFor(() => {
      expect(vi.mocked(gameActions.criarSala)).toHaveBeenCalledWith(
        "Noé",
        expect.any(Number),
        expect.objectContaining({ max_jogadores: 6 })
      );
    });
  });

  it("mudar jogadores e depois duração envia os dois valores corretos", async () => {
    renderCriar();
    fireEvent.change(getSlider("Máx. de Jogadores"), { target: { value: "6" } });
    fireEvent.change(getSlider("Duração por Rodada"), { target: { value: "9" } });
    fireEvent.change(screen.getByLabelText(/Seu Apelido/i), { target: { value: "Moisés" } });
    await submit();
    await waitFor(() => {
      expect(vi.mocked(gameActions.criarSala)).toHaveBeenCalledWith(
        "Moisés",
        expect.any(Number),
        expect.objectContaining({ max_jogadores: 6, duracao_minutos: 9 })
      );
    });
  });
});
