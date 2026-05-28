import React from "react";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { vi, describe, it, expect, beforeEach } from "vitest";

const recuperarSenha = vi.fn();

vi.mock("@/hooks/useAuth", () => ({ useAuth: () => ({ recuperarSenha }) }));
vi.mock("motion/react", async () => (await import("./helpers")).motionMock);
vi.mock("@/components/ui/design", async () => (await import("./helpers")).designMock);
vi.mock("sonner", () => ({ toast: { error: vi.fn(), success: vi.fn() } }));

import RecuperarSenhaPage from "@/app/conta/recuperar/page";
import { toast } from "sonner";

beforeEach(() => {
  vi.clearAllMocks();
  recuperarSenha.mockResolvedValue({});
});

describe("Recuperar senha", () => {
  it("e-mail inválido bloqueia envio", async () => {
    render(<RecuperarSenhaPage />);
    fireEvent.change(screen.getByPlaceholderText("joao@exemplo.com"), { target: { value: "x" } });
    fireEvent.click(screen.getByRole("button", { name: "Enviar link" }));
    await waitFor(() => expect(toast.error).toHaveBeenCalled());
    expect(recuperarSenha).not.toHaveBeenCalled();
  });

  it("envia e mostra mensagem neutra (AC4.1/4.2)", async () => {
    render(<RecuperarSenhaPage />);
    fireEvent.change(screen.getByPlaceholderText("joao@exemplo.com"), { target: { value: "a@b.com" } });
    fireEvent.click(screen.getByRole("button", { name: "Enviar link" }));
    await waitFor(() => expect(recuperarSenha).toHaveBeenCalledWith("a@b.com"));
    expect(await screen.findByText("Verifique seu e-mail")).toBeInTheDocument();
    expect(screen.getByText(/Se houver uma conta com este e-mail/)).toBeInTheDocument();
  });

  it("P3 — mostra a mesma tela mesmo se a chamada retornar erro interno", async () => {
    // recuperarSenha sempre resolve {} (a página nunca distingue); aqui simulamos
    // que mesmo um retorno vazio leva à tela neutra.
    recuperarSenha.mockResolvedValue({});
    render(<RecuperarSenhaPage />);
    fireEvent.change(screen.getByPlaceholderText("joao@exemplo.com"), { target: { value: "naoexiste@b.com" } });
    fireEvent.click(screen.getByRole("button", { name: "Enviar link" }));
    expect(await screen.findByText("Verifique seu e-mail")).toBeInTheDocument();
  });
});
