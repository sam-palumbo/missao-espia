import React, { Suspense } from "react";
import { render, screen, fireEvent, act, waitFor } from "@testing-library/react";
import { vi, describe, it, expect, beforeEach } from "vitest";
import { makePlayer } from "./helpers";

const mockPush = vi.fn();

vi.mock("next/navigation", () => ({ useRouter: () => ({ push: mockPush }) }));
vi.mock("@/lib/supabase", async () => (await import("./helpers")).makeSupabaseMock({ id: "sala-1" }));
vi.mock("@/hooks/usePlayers");
vi.mock("@/components/ui/design", async () => (await import("./helpers")).designMock);

import { usePlayers } from "@/hooks/usePlayers";
import PlacarPage from "@/app/sala/[code]/placar/page";

const PARAMS = Promise.resolve({ code: "TEST" });

function renderPlacar() {
  return render(
    <Suspense fallback={null}>
      <PlacarPage params={PARAMS} />
    </Suspense>
  );
}

describe("Página Placar Final", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(usePlayers).mockReturnValue([
      makePlayer({ id: "j1", apelido: "Alice", pontuacao: 10 }),
      makePlayer({ id: "j2", apelido: "Bob",   pontuacao: 3  }),
    ]);
  });

  it("ordena jogadores por pontuação decrescente", async () => {
    vi.mocked(usePlayers).mockReturnValue([
      makePlayer({ id: "j1", apelido: "Alice",  pontuacao: 5  }),
      makePlayer({ id: "j2", apelido: "Bob",    pontuacao: 20 }),
      makePlayer({ id: "j3", apelido: "Carlos", pontuacao: 10 }),
    ]);

    await act(async () => { renderPlacar(); });

    await waitFor(() => {
      const nomes = screen.getAllByText(/^(Alice|Bob|Carlos)$/).map(el => el.textContent!);
      expect(nomes.indexOf("Bob")).toBeLessThan(nomes.indexOf("Carlos"));
      expect(nomes.indexOf("Carlos")).toBeLessThan(nomes.indexOf("Alice"));
    });
  });

  it("primeiro lugar com pontuação > 0 exibe '✦'", async () => {
    await act(async () => { renderPlacar(); });

    await waitFor(() => {
      expect(screen.getByText("✦")).toBeInTheDocument();
    });
  });

  it("segundo lugar exibe o número '2'", async () => {
    await act(async () => { renderPlacar(); });

    await waitFor(() => {
      expect(screen.getByText("2")).toBeInTheDocument();
    });
  });

  it("clique em 'Nova Partida' navega para '/'", async () => {
    await act(async () => { renderPlacar(); });

    await waitFor(() => screen.getByText("Nova Partida"));
    await act(async () => { fireEvent.click(screen.getByText("Nova Partida")); });

    expect(mockPush).toHaveBeenCalledWith("/");
  });

  it("clique em 'Encerrar' navega para '/'", async () => {
    await act(async () => { renderPlacar(); });

    await waitFor(() => screen.getByText("Encerrar"));
    await act(async () => { fireEvent.click(screen.getByText("Encerrar")); });

    expect(mockPush).toHaveBeenCalledWith("/");
  });
});
