import React, { Suspense } from "react";
import { render, screen, fireEvent, waitFor, act } from "@testing-library/react";
import { vi, describe, it, expect, beforeEach } from "vitest";

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

vi.mock("@/hooks/usePlayers", () => ({ usePlayers: () => [] }));
vi.mock("@/hooks/useAuth", () => ({ useAuth: () => ({ user: { id: "host-1" } }) }));

const definirModoMock = vi.fn();
vi.mock("@/lib/game-actions", () => ({
  gameActions: {
    iniciarRodada: vi.fn(),
    definirModo: (...args: unknown[]) => definirModoMock(...args),
  },
}));

vi.mock("sonner", () => ({ toast: { error: vi.fn() } }));

vi.mock("motion/react", async () => {
  const { createElement } = await import("react");
  return {
    motion: new Proxy({} as Record<string, unknown>, {
      get: (_, tag: string) => function Mo({ children, ...rest }: Record<string, unknown>) {
        return createElement(tag as keyof JSX.IntrinsicElements, rest as React.HTMLAttributes<HTMLElement>, children as React.ReactNode);
      },
    }),
    AnimatePresence: ({ children }: { children: React.ReactNode }) => children,
  };
});

vi.mock("@/components/ui/design", () => {
  const T = new Proxy({}, { get: () => "" });
  const F = new Proxy({}, { get: () => "" });
  return {
    ParchmentBg: () => null,
    InsetFrame: () => null,
    MEAvatar: () => null,
    MEIcon: () => null,
    Eyebrow: ({ children }: { children: React.ReactNode }) => <span>{children}</span>,
    PrimaryBtn: ({ children, ...p }: React.ButtonHTMLAttributes<HTMLButtonElement>) => <button {...p}>{children}</button>,
    T, F,
  };
});

import LobbyPage from "@/app/sala/[code]/lobby/page";

// Module-level constant — required for React.use() Suspense resolution in tests
const PARAMS_ONLINE = Promise.resolve({ code: "ABCD" });
const PARAMS_PRESENCIAL = Promise.resolve({ code: "EFGH" });

function setupSalaResponse(opts: { modo: "online" | "presencial"; status?: "aguardando" | "jogando"; anfitriao?: string }) {
  fromMock.mockImplementation((table: string) => {
    if (table === "salas") {
      return {
        select: () => ({
          eq: () => ({
            single: () => Promise.resolve({
              data: {
                id: "sala-1",
                anfitriao: opts.anfitriao ?? "host-1",
                status: opts.status ?? "aguardando",
                num_rodadas: 3,
                modo: opts.modo,
              },
            }),
          }),
        }),
        update: () => ({ eq: () => Promise.resolve({ error: null }) }),
      };
    }
    return { select: () => ({ eq: () => ({ single: () => Promise.resolve({ data: null }) }) }) };
  });
}

async function renderLobby(params: Promise<{ code: string }>) {
  await act(async () => {
    render(<Suspense fallback={null}><LobbyPage params={params} /></Suspense>);
  });
}

describe("Lobby — toggle de modo", () => {
  beforeEach(() => {
    fromMock.mockReset();
    definirModoMock.mockReset();
  });

  it("anfitrião vê os dois botões de modo", async () => {
    setupSalaResponse({ modo: "online" });
    await renderLobby(PARAMS_ONLINE);
    expect(screen.getByRole("button", { name: /^Online$/ })).toBeDefined();
    expect(screen.getByRole("button", { name: /^Presencial$/ })).toBeDefined();
  });

  it("clicar em Presencial chama gameActions.definirModo", async () => {
    setupSalaResponse({ modo: "online" });
    await renderLobby(PARAMS_ONLINE);
    const btn = screen.getByRole("button", { name: /^Presencial$/ });
    fireEvent.click(btn);
    await waitFor(() => expect(definirModoMock).toHaveBeenCalledWith("sala-1", "presencial"));
  });

  it("não-anfitrião vê o modo em modo leitura, sem botões clicáveis", async () => {
    setupSalaResponse({ modo: "presencial", anfitriao: "outro" });
    await renderLobby(PARAMS_PRESENCIAL);
    expect(screen.getByText(/Modo:\s*Presencial/i)).toBeDefined();
    expect(screen.queryByRole("button", { name: /^Online$/ })).toBeNull();
    expect(screen.queryByRole("button", { name: /^Presencial$/ })).toBeNull();
  });
});
