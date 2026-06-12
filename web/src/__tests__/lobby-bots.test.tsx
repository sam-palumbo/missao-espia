import React, { Suspense } from "react";
import { render, screen, fireEvent, waitFor, act } from "@testing-library/react";
import { vi, describe, it, expect, beforeEach } from "vitest";
import type { Player } from "@/lib/types";

vi.mock("next/navigation", () => ({ useRouter: () => ({ push: vi.fn() }) }));
vi.mock("next/link", () => ({ default: ({ children, href }: { children: React.ReactNode; href: string }) => <a href={href}>{children}</a> }));

const fromMock = vi.fn();
vi.mock("@/lib/supabase", () => ({
  createClient: () => ({
    from: (...args: unknown[]) => fromMock(...args),
    channel: () => ({ on: () => ({ subscribe: () => ({}) }) }),
    removeChannel: () => {},
  }),
}));

let playersMock: Partial<Player>[] = [];
vi.mock("@/hooks/usePlayers", () => ({ usePlayers: () => playersMock }));

let userMock: { id: string } = { id: "host-1" };
vi.mock("@/hooks/useAuth", () => ({ useAuth: () => ({ user: userMock }) }));

const adicionarBotMock = vi.fn();
const removerBotMock = vi.fn();
vi.mock("@/lib/game-actions", () => ({
  gameActions: {
    iniciarRodada: vi.fn(),
    definirModo: vi.fn(),
    adicionarBot: (...args: unknown[]) => adicionarBotMock(...args),
    removerBot: (...args: unknown[]) => removerBotMock(...args),
  },
}));

vi.mock("sonner", () => ({ toast: { error: vi.fn() } }));
vi.mock("motion/react", async () => (await import("./helpers")).motionMock);
vi.mock("@/components/ui/design", async () => (await import("./helpers")).designMock);

import LobbyPage from "@/app/sala/[code]/lobby/page";

const PARAMS = Promise.resolve({ code: "ABCD" });

function setupSala() {
  fromMock.mockImplementation((table: string) => {
    if (table === "salas") {
      return {
        select: () => ({
          eq: () => ({
            single: () => Promise.resolve({
              data: { id: "sala-1", anfitriao: "host-1", status: "aguardando", num_rodadas: 3, modo: "online" },
            }),
          }),
        }),
        update: () => ({ eq: () => Promise.resolve({ error: null }) }),
      };
    }
    return { select: () => ({ eq: () => ({ single: () => Promise.resolve({ data: null }) }) }) };
  });
}

async function renderLobby() {
  await act(async () => {
    render(<Suspense fallback={null}><LobbyPage params={PARAMS} /></Suspense>);
  });
}

describe("Lobby — bots", () => {
  beforeEach(() => {
    fromMock.mockReset();
    adicionarBotMock.mockReset();
    removerBotMock.mockReset();
    playersMock = [];
    userMock = { id: "host-1" };
    setupSala();
  });

  it("anfitrião vê o botão Adicionar Bot e o clique chama gameActions.adicionarBot", async () => {
    adicionarBotMock.mockResolvedValue({ jogador: { id: "bot-1", apelido: "Abraão" } });
    await renderLobby();
    const btn = screen.getByRole("button", { name: /Adicionar Bot/i });
    fireEvent.click(btn);
    await waitFor(() => expect(adicionarBotMock).toHaveBeenCalledWith("sala-1"));
  });

  it("não-anfitrião não vê o botão Adicionar Bot", async () => {
    userMock = { id: "outro" };
    await renderLobby();
    expect(screen.queryByRole("button", { name: /Adicionar Bot/i })).toBeNull();
  });

  it("bot aparece com rótulo Bot e botão de remover que chama gameActions.removerBot", async () => {
    playersMock = [
      { id: "j1", apelido: "Sam", user_id: "host-1", ativo: true, conectado: true, pontuacao: 0, is_bot: false },
      { id: "bot-1", apelido: "Abraão", user_id: null, ativo: true, conectado: true, pontuacao: 0, is_bot: true },
    ];
    removerBotMock.mockResolvedValue({ ok: true });
    await renderLobby();
    expect(screen.getByText("Bot")).toBeDefined();
    const remover = screen.getByRole("button", { name: /Remover bot Abraão/i });
    fireEvent.click(remover);
    await waitFor(() => expect(removerBotMock).toHaveBeenCalledWith("sala-1", "bot-1"));
  });

  it("não-anfitrião não vê botão de remover bot", async () => {
    userMock = { id: "outro" };
    playersMock = [
      { id: "bot-1", apelido: "Abraão", user_id: null, ativo: true, conectado: true, pontuacao: 0, is_bot: true },
    ];
    await renderLobby();
    expect(screen.queryByRole("button", { name: /Remover bot/i })).toBeNull();
  });
});
