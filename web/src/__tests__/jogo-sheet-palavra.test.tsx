import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import { vi, describe, it, expect, beforeEach } from "vitest";

vi.mock("@/components/ui/design", async () => (await import("./helpers")).designMock);
vi.mock("motion/react", async () => (await import("./helpers")).motionMock);

import { SheetDizerPalavra } from "@/app/sala/[code]/jogo/sheet-dizer-palavra";

function renderSheet(overrides: Partial<React.ComponentProps<typeof SheetDizerPalavra>> = {}) {
  const defaults = {
    open: true,
    onClose: vi.fn(),
    wordInput: "",
    setWordInput: vi.fn(),
    acting: false,
    onSubmit: vi.fn(),
  };
  return render(<SheetDizerPalavra {...defaults} {...overrides} />);
}

describe("SheetDizerPalavra", () => {
  it("não renderiza nada quando open=false", () => {
    renderSheet({ open: false });
    expect(screen.queryByPlaceholderText(/uma palavra/i)).not.toBeInTheDocument();
  });

  it("mostra o campo de input quando open=true", () => {
    renderSheet();
    expect(screen.getByPlaceholderText(/uma palavra/i)).toBeInTheDocument();
  });

  it("botão Confirmar desabilitado quando wordInput vazio", () => {
    renderSheet({ wordInput: "" });
    expect(screen.getByRole("button", { name: /confirmar/i })).toBeDisabled();
  });

  it("botão Confirmar habilitado quando wordInput preenchido", () => {
    renderSheet({ wordInput: "fé" });
    expect(screen.getByRole("button", { name: /confirmar/i })).toBeEnabled();
  });

  it("botão Confirmar desabilitado quando acting=true", () => {
    renderSheet({ wordInput: "fé", acting: true });
    expect(screen.getByRole("button", { name: /confirmar/i })).toBeDisabled();
  });

  it("Cancelar chama onClose e limpa o input", () => {
    const onClose = vi.fn();
    const setWordInput = vi.fn();
    renderSheet({ onClose, setWordInput, wordInput: "graça" });

    fireEvent.click(screen.getByRole("button", { name: /cancelar/i }));

    expect(setWordInput).toHaveBeenCalledWith("");
    expect(onClose).toHaveBeenCalled();
  });

  it("Confirmar chama onSubmit", () => {
    const onSubmit = vi.fn();
    renderSheet({ wordInput: "paz", onSubmit });

    fireEvent.click(screen.getByRole("button", { name: /confirmar/i }));

    expect(onSubmit).toHaveBeenCalled();
  });

  it("Enter no input chama onSubmit", () => {
    const onSubmit = vi.fn();
    renderSheet({ wordInput: "amor", onSubmit });

    fireEvent.keyDown(screen.getByPlaceholderText(/uma palavra/i), { key: "Enter" });

    expect(onSubmit).toHaveBeenCalled();
  });

  it("Shift+Enter no input NÃO chama onSubmit", () => {
    const onSubmit = vi.fn();
    renderSheet({ wordInput: "amor", onSubmit });

    fireEvent.keyDown(screen.getByPlaceholderText(/uma palavra/i), { key: "Enter", shiftKey: true });

    expect(onSubmit).not.toHaveBeenCalled();
  });

  it("setWordInput chamado ao digitar no campo", () => {
    const setWordInput = vi.fn();
    renderSheet({ setWordInput });

    fireEvent.change(screen.getByPlaceholderText(/uma palavra/i), {
      target: { value: "salvação" },
    });

    expect(setWordInput).toHaveBeenCalledWith("salvação");
  });
});
