import React from "react";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { vi, describe, it, expect, beforeEach } from "vitest";

const push = vi.fn();
const entrar = vi.fn();
const entrarComGoogle = vi.fn();

vi.mock("next/navigation", () => ({ useRouter: () => ({ push }) }));
vi.mock("@/hooks/useAuth", () => ({
  useAuth: () => ({ entrar, entrarComGoogle }),
}));
vi.mock("motion/react", async () => (await import("./helpers")).motionMock);
vi.mock("@/components/ui/design", async () => (await import("./helpers")).designMock);
vi.mock("sonner", () => ({ toast: { error: vi.fn(), success: vi.fn() } }));

import HomePage from "@/app/page";
import { toast } from "sonner";

function preencher(email: string, senha: string) {
  fireEvent.change(screen.getByPlaceholderText("joao@exemplo.com"), { target: { value: email } });
  fireEvent.change(screen.getByPlaceholderText("••••••••"), { target: { value: senha } });
}

beforeEach(() => {
  vi.clearAllMocks();
  entrar.mockResolvedValue({});
  entrarComGoogle.mockResolvedValue({});
});

describe("Home — login", () => {
  it("botão Entrar desabilitado sem credenciais", () => {
    render(<HomePage />);
    expect(screen.getByRole("button", { name: "Entrar" })).toBeDisabled();
  });

  it("login bem-sucedido navega para /entrar (AC3.1)", async () => {
    render(<HomePage />);
    preencher("a@b.com", "segredo123");
    fireEvent.click(screen.getByRole("button", { name: "Entrar" }));
    await waitFor(() => expect(entrar).toHaveBeenCalledWith("a@b.com", "segredo123"));
    await waitFor(() => expect(push).toHaveBeenCalledWith("/entrar"));
  });

  it("credenciais inválidas exibem toast e não navegam (AC3.2)", async () => {
    entrar.mockResolvedValue({ error: "E-mail ou senha inválidos" });
    render(<HomePage />);
    preencher("a@b.com", "errada");
    fireEvent.click(screen.getByRole("button", { name: "Entrar" }));
    await waitFor(() => expect(toast.error).toHaveBeenCalledWith("E-mail ou senha inválidos"));
    expect(push).not.toHaveBeenCalled();
  });

  it("botão Google chama entrarComGoogle (AC7)", async () => {
    render(<HomePage />);
    fireEvent.click(screen.getByRole("button", { name: /Entrar com Google/i }));
    await waitFor(() => expect(entrarComGoogle).toHaveBeenCalled());
  });

  it("link 'Crie sua conta' aponta para /conta/criar (AC0.3)", () => {
    render(<HomePage />);
    expect(screen.getByRole("link", { name: "Crie sua conta" })).toHaveAttribute("href", "/conta/criar");
  });

  it("link 'Esqueci a senha' aponta para /conta/recuperar", () => {
    render(<HomePage />);
    expect(screen.getByRole("link", { name: "Esqueci a senha" })).toHaveAttribute("href", "/conta/recuperar");
  });
});
