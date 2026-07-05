import React from "react";
import { render, screen, fireEvent, act, waitFor } from "@testing-library/react";
import { vi, describe, it, expect, beforeEach } from "vitest";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn(), replace: vi.fn() }),
  useSearchParams: () => new URLSearchParams(),
}));
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
vi.mock("@/hooks/useAuth", () => ({
  useAuth: () => ({ isAnonymous: true, loading: false, sair: vi.fn() }),
}));

import { gameActions } from "@/lib/game-actions";
import CriarPage from "@/app/criar/page";
import EntrarPage from "@/app/entrar/page";

// O jsdom desta config não expõe localStorage — stub em memória.
const storage = new Map<string, string>();
vi.stubGlobal("localStorage", {
  getItem: (k: string) => storage.get(k) ?? null,
  setItem: (k: string, v: string) => { storage.set(k, String(v)); },
  removeItem: (k: string) => { storage.delete(k); },
  clear: () => { storage.clear(); },
});

beforeEach(() => {
  localStorage.clear();
  vi.mocked(gameActions.criarSala).mockResolvedValue({
    sala: { id: "sala-1", codigo: "ABCD", num_rodadas: 5, status: "aguardando" },
    jogador: { id: "j-1", apelido: "Davi" },
  });
  vi.mocked(gameActions.entrarSala).mockResolvedValue({
    sala: { id: "sala-1", codigo: "ABCD", num_rodadas: 5, status: "aguardando" },
    jogador: { id: "j-2", apelido: "Ester" },
  });
});

describe("Apelido lembrado entre formulários (localStorage)", () => {
  it("criar sala salva o apelido para a próxima visita", async () => {
    render(<CriarPage />);
    fireEvent.change(screen.getByLabelText(/Seu Apelido/i), { target: { value: "Davi" } });
    await act(async () => { screen.getByRole("button", { name: /Criar Sala/i }).click(); });
    await waitFor(() => {
      expect(localStorage.getItem("me:apelido")).toBe("Davi");
    });
  });

  it("entrar na sala salva o apelido para a próxima visita", async () => {
    const { container } = render(<EntrarPage />);
    fireEvent.change(screen.getByLabelText(/Seu Apelido/i), { target: { value: "Ester" } });
    // O input do código é invisível e sem label — localizado pelo maxLength=4.
    fireEvent.change(container.querySelector('input[maxlength="4"]')!, { target: { value: "ABCD" } });
    await act(async () => { screen.getByRole("button", { name: /Entrar na Sala/i }).click(); });
    await waitFor(() => {
      expect(localStorage.getItem("me:apelido")).toBe("Ester");
    });
  });

  it("/criar abre com o apelido salvo pré-preenchido", async () => {
    localStorage.setItem("me:apelido", "Moisés");
    render(<CriarPage />);
    await waitFor(() => {
      expect(screen.getByLabelText(/Seu Apelido/i)).toHaveValue("Moisés");
    });
  });

  it("/entrar abre com o apelido salvo pré-preenchido", async () => {
    localStorage.setItem("me:apelido", "Moisés");
    render(<EntrarPage />);
    await waitFor(() => {
      expect(screen.getByLabelText(/Seu Apelido/i)).toHaveValue("Moisés");
    });
  });

  it("sem apelido salvo, o campo começa vazio", () => {
    render(<CriarPage />);
    expect(screen.getByLabelText(/Seu Apelido/i)).toHaveValue("");
  });
});
