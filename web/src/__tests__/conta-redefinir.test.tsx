import React from "react";
import { render, screen, fireEvent, waitFor, act } from "@testing-library/react";
import { vi, describe, it, expect, beforeEach } from "vitest";

const redefinirSenha = vi.fn();
const push = vi.fn();
let authCallback: ((event: string, session: unknown) => void) | null = null;
let sessionInicial: unknown = null;

vi.mock("next/navigation", () => ({ useRouter: () => ({ push }) }));
vi.mock("@/hooks/useAuth", () => ({ useAuth: () => ({ redefinirSenha }) }));
vi.mock("@/lib/supabase", () => ({
  createClient: () => ({
    auth: {
      onAuthStateChange: (cb: (e: string, s: unknown) => void) => {
        authCallback = cb;
        return { data: { subscription: { unsubscribe: vi.fn() } } };
      },
      getSession: () => Promise.resolve({ data: { session: sessionInicial }, error: null }),
    },
  }),
}));
vi.mock("motion/react", async () => (await import("./helpers")).motionMock);
vi.mock("@/components/ui/design", async () => (await import("./helpers")).designMock);
vi.mock("sonner", () => ({ toast: { error: vi.fn(), success: vi.fn() } }));

import RedefinirSenhaPage from "@/app/conta/redefinir/page";
import { toast } from "sonner";

beforeEach(() => {
  vi.clearAllMocks();
  authCallback = null;
  sessionInicial = null;
  redefinirSenha.mockResolvedValue({});
});

describe("Redefinir senha", () => {
  it("sem sessão de recuperação, não mostra o formulário (AC5.1)", async () => {
    render(<RedefinirSenhaPage />);
    // Antes de qualquer evento de recovery, o campo não está presente.
    await waitFor(() => expect(authCallback).not.toBeNull());
    expect(screen.queryByPlaceholderText("Mínimo 6 caracteres")).not.toBeInTheDocument();
  });

  it("após evento PASSWORD_RECOVERY, mostra o formulário", async () => {
    render(<RedefinirSenhaPage />);
    await waitFor(() => expect(authCallback).not.toBeNull());
    await act(async () => { authCallback!("PASSWORD_RECOVERY", { user: { id: "u1" } }); });
    expect(await screen.findByPlaceholderText("Mínimo 6 caracteres")).toBeInTheDocument();
  });

  it("senha curta bloqueia (AC5.3)", async () => {
    render(<RedefinirSenhaPage />);
    await waitFor(() => expect(authCallback).not.toBeNull());
    await act(async () => { authCallback!("PASSWORD_RECOVERY", { user: { id: "u1" } }); });
    fireEvent.change(await screen.findByPlaceholderText("Mínimo 6 caracteres"), { target: { value: "123" } });
    fireEvent.change(screen.getByPlaceholderText("Repita a senha"), { target: { value: "123" } });
    fireEvent.click(screen.getByRole("button", { name: "Redefinir Senha" }));
    await waitFor(() => expect(toast.error).toHaveBeenCalled());
    expect(redefinirSenha).not.toHaveBeenCalled();
  });

  it("sucesso chama redefinirSenha e redireciona (AC5.2/5.5)", async () => {
    render(<RedefinirSenhaPage />);
    await waitFor(() => expect(authCallback).not.toBeNull());
    await act(async () => { authCallback!("PASSWORD_RECOVERY", { user: { id: "u1" } }); });
    fireEvent.change(await screen.findByPlaceholderText("Mínimo 6 caracteres"), { target: { value: "novaSenha123" } });
    fireEvent.change(screen.getByPlaceholderText("Repita a senha"), { target: { value: "novaSenha123" } });
    fireEvent.click(screen.getByRole("button", { name: "Redefinir Senha" }));
    await waitFor(() => expect(redefinirSenha).toHaveBeenCalledWith("novaSenha123"));
    await waitFor(() => expect(push).toHaveBeenCalledWith("/"));
  });
});
