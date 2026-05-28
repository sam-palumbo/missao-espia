import React from "react";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { vi, describe, it, expect, beforeEach } from "vitest";

const criarConta = vi.fn();
const entrarComGoogle = vi.fn();

vi.mock("next/navigation", () => ({ useRouter: () => ({ push: vi.fn() }) }));
vi.mock("@/hooks/useAuth", () => ({ useAuth: () => ({ criarConta, entrarComGoogle }) }));
vi.mock("motion/react", async () => (await import("./helpers")).motionMock);
vi.mock("@/components/ui/design", async () => (await import("./helpers")).designMock);
vi.mock("sonner", () => ({ toast: { error: vi.fn(), success: vi.fn() } }));

import CriarContaPage from "@/app/conta/criar/page";
import { toast } from "sonner";

function preencher(email: string, senha: string, conf: string) {
  fireEvent.change(screen.getByPlaceholderText("joao@exemplo.com"), { target: { value: email } });
  fireEvent.change(screen.getByPlaceholderText("Mínimo 6 caracteres"), { target: { value: senha } });
  fireEvent.change(screen.getByPlaceholderText("Repita a senha"), { target: { value: conf } });
}

beforeEach(() => {
  vi.clearAllMocks();
  criarConta.mockResolvedValue({});
  entrarComGoogle.mockResolvedValue({});
});

describe("Criar conta", () => {
  it("e-mail inválido bloqueia envio (AC1.2)", async () => {
    render(<CriarContaPage />);
    preencher("invalido", "segredo123", "segredo123");
    fireEvent.click(screen.getByRole("button", { name: "Criar Conta" }));
    await waitFor(() => expect(toast.error).toHaveBeenCalledWith("Informe um e-mail válido"));
    expect(criarConta).not.toHaveBeenCalled();
  });

  it("senha curta bloqueia envio (AC1.3)", async () => {
    render(<CriarContaPage />);
    preencher("a@b.com", "123", "123");
    fireEvent.click(screen.getByRole("button", { name: "Criar Conta" }));
    await waitFor(() => expect(toast.error).toHaveBeenCalled());
    expect(criarConta).not.toHaveBeenCalled();
  });

  it("senhas diferentes bloqueiam envio (AC1.4)", async () => {
    render(<CriarContaPage />);
    preencher("a@b.com", "segredo123", "segredo124");
    fireEvent.click(screen.getByRole("button", { name: "Criar Conta" }));
    await waitFor(() => expect(toast.error).toHaveBeenCalledWith("As senhas não conferem"));
    expect(criarConta).not.toHaveBeenCalled();
  });

  it("sucesso mostra tela de confirmação de e-mail (AC1.6)", async () => {
    render(<CriarContaPage />);
    preencher("joao@b.com", "segredo123", "segredo123");
    fireEvent.click(screen.getByRole("button", { name: "Criar Conta" }));
    await waitFor(() => expect(criarConta).toHaveBeenCalledWith("joao@b.com", "segredo123"));
    expect(await screen.findByText("Confirme seu e-mail")).toBeInTheDocument();
  });

  it("e-mail duplicado exibe toast (AC1.5)", async () => {
    criarConta.mockResolvedValue({ error: "E-mail já cadastrado" });
    render(<CriarContaPage />);
    preencher("a@b.com", "segredo123", "segredo123");
    fireEvent.click(screen.getByRole("button", { name: "Criar Conta" }));
    await waitFor(() => expect(toast.error).toHaveBeenCalledWith("E-mail já cadastrado"));
  });

  it("botão Google chama entrarComGoogle (AC7)", async () => {
    render(<CriarContaPage />);
    fireEvent.click(screen.getByRole("button", { name: /Criar com Google/i }));
    await waitFor(() => expect(entrarComGoogle).toHaveBeenCalled());
  });
});
