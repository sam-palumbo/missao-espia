import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import { vi, describe, it, expect } from "vitest";
import { makePlayer } from "./helpers";

vi.mock("@/components/ui/design", async () => (await import("./helpers")).designMock);
vi.mock("motion/react", async () => (await import("./helpers")).motionMock);

import { SheetFazerPergunta } from "@/app/sala/[code]/jogo/sheet-fazer-pergunta";

const ALICE = makePlayer({ id: "j1", apelido: "Alice", ativo: true });
const BOB   = makePlayer({ id: "j2", apelido: "Bob",   ativo: true });
const CARLOS_ELIMINADO = makePlayer({ id: "j3", apelido: "Carlos", ativo: false });

function renderSheet(overrides: Partial<React.ComponentProps<typeof SheetFazerPergunta>> = {}) {
  const defaults = {
    open: true,
    onClose: vi.fn(),
    players: [ALICE, BOB, CARLOS_ELIMINADO],
    meuId: "j1",
    selectedRecipientId: null,
    setSelectedRecipientId: vi.fn(),
    questionInput: "",
    setQuestionInput: vi.fn(),
    acting: false,
    onSubmit: vi.fn(),
  };
  return render(<SheetFazerPergunta {...defaults} {...overrides} />);
}

describe("SheetFazerPergunta", () => {
  it("não renderiza nada quando open=false", () => {
    renderSheet({ open: false });
    expect(screen.queryByText(/fazer pergunta/i)).not.toBeInTheDocument();
  });

  it("mostra o título quando open=true", () => {
    renderSheet();
    expect(screen.getByText(/fazer pergunta/i)).toBeInTheDocument();
  });

  it("lista jogadores ativos excluindo o próprio jogador", () => {
    renderSheet();
    expect(screen.getByText("Bob")).toBeInTheDocument();
    expect(screen.queryByText("Alice")).not.toBeInTheDocument();
  });

  it("não lista jogadores eliminados", () => {
    renderSheet();
    expect(screen.queryByText("Carlos")).not.toBeInTheDocument();
  });

  it("não mostra o campo de pergunta antes de selecionar destinatário", () => {
    renderSheet({ selectedRecipientId: null });
    expect(screen.queryByPlaceholderText(/sua pergunta/i)).not.toBeInTheDocument();
  });

  it("mostra o campo de pergunta após selecionar destinatário", () => {
    renderSheet({ selectedRecipientId: "j2" });
    expect(screen.getByPlaceholderText(/sua pergunta/i)).toBeInTheDocument();
  });

  it("botão Enviar desabilitado quando pergunta vazia", () => {
    renderSheet({ selectedRecipientId: "j2", questionInput: "" });
    expect(screen.getByRole("button", { name: /enviar/i })).toBeDisabled();
  });

  it("botão Enviar habilitado quando destinatário e pergunta preenchidos", () => {
    renderSheet({ selectedRecipientId: "j2", questionInput: "O que você fez?" });
    expect(screen.getByRole("button", { name: /enviar/i })).toBeEnabled();
  });

  it("botão Enviar desabilitado quando acting=true", () => {
    renderSheet({ selectedRecipientId: "j2", questionInput: "O que fez?", acting: true });
    expect(screen.getByRole("button", { name: /enviar/i })).toBeDisabled();
  });

  it("clicar num jogador chama setSelectedRecipientId com o id dele", () => {
    const setSelectedRecipientId = vi.fn();
    renderSheet({ setSelectedRecipientId });

    fireEvent.click(screen.getByText("Bob"));

    expect(setSelectedRecipientId).toHaveBeenCalledWith("j2");
  });

  it("Cancelar chama onClose e limpa campos", () => {
    const onClose = vi.fn();
    const setQuestionInput = vi.fn();
    const setSelectedRecipientId = vi.fn();
    renderSheet({ selectedRecipientId: "j2", questionInput: "?", onClose, setQuestionInput, setSelectedRecipientId });

    fireEvent.click(screen.getByRole("button", { name: /cancelar/i }));

    expect(setQuestionInput).toHaveBeenCalledWith("");
    expect(setSelectedRecipientId).toHaveBeenCalledWith(null);
    expect(onClose).toHaveBeenCalled();
  });

  it("Enviar chama onSubmit", () => {
    const onSubmit = vi.fn();
    renderSheet({ selectedRecipientId: "j2", questionInput: "Onde você estava?", onSubmit });

    fireEvent.click(screen.getByRole("button", { name: /enviar/i }));

    expect(onSubmit).toHaveBeenCalled();
  });
});
