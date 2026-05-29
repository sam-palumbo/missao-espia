import React from "react";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { vi, describe, it, expect, beforeEach } from "vitest";

const replace = vi.fn();
const sair = vi.fn();

let auth: Record<string, unknown> = { isAnonymous: true, loading: false, sair };

vi.mock("next/navigation", () => ({
  useSearchParams: () => new URLSearchParams(""),
  useRouter: () => ({ push: vi.fn(), replace }),
}));
vi.mock("@/hooks/useAuth", () => ({ useAuth: () => auth }));
vi.mock("@/lib/game-actions", () => ({ gameActions: { entrarSala: vi.fn() } }));
vi.mock("@/components/ui/Input", () => ({
  Input: (props: Record<string, unknown>) =>
    React.createElement("input", props as React.InputHTMLAttributes<HTMLInputElement>),
}));
vi.mock("motion/react", async () => (await import("./helpers")).motionMock);
vi.mock("@/components/ui/design", async () => (await import("./helpers")).designMock);
vi.mock("sonner", () => ({ toast: { error: vi.fn(), success: vi.fn() } }));

import EntrarPage from "@/app/entrar/page";
import { toast } from "sonner";

beforeEach(() => {
  vi.clearAllMocks();
  auth = { isAnonymous: true, loading: false, sair };
  sair.mockResolvedValue({});
});

describe("Hub /entrar — logout (US6)", () => {
  it("visitante (anônimo) não vê 'Sair da conta'", () => {
    render(<EntrarPage />);
    expect(screen.queryByRole("button", { name: "Sair da conta" })).toBeNull();
  });

  it("usuário logado aciona logout → signOut e volta para / (AC6.1)", async () => {
    auth = { isAnonymous: false, loading: false, sair };
    render(<EntrarPage />);
    fireEvent.click(screen.getByRole("button", { name: "Sair da conta" }));
    await waitFor(() => expect(sair).toHaveBeenCalled());
    await waitFor(() => expect(replace).toHaveBeenCalledWith("/"));
  });

  it("erro no logout exibe toast e não navega", async () => {
    auth = { isAnonymous: false, loading: false, sair };
    sair.mockResolvedValue({ error: "Falha ao sair" });
    render(<EntrarPage />);
    fireEvent.click(screen.getByRole("button", { name: "Sair da conta" }));
    await waitFor(() => expect(toast.error).toHaveBeenCalledWith("Falha ao sair"));
    expect(replace).not.toHaveBeenCalled();
  });
});
