import React from "react";
import { render, screen } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";

vi.mock("@/components/ui/design", async () => (await import("./helpers")).designMock);

vi.mock("motion/react", async () => (await import("./helpers")).motionMock);

import { TurnoPresencial } from "@/app/sala/[code]/jogo/turno-presencial";

describe("<TurnoPresencial />", () => {
  it("vez do jogador, 1ª rodada: mostra 'Diga uma palavra em voz alta'", () => {
    render(
      <TurnoPresencial
        isMinhaVez
        jogadorAtualApelido="Ana"
        turnoPalavras
        fase="turno_palavras"
      />,
    );
    expect(screen.getByText(/É sua vez/i)).toBeDefined();
    expect(screen.getByText(/Diga uma palavra em voz alta/i)).toBeDefined();
  });

  it("vez do jogador, rodada normal: mostra 'Faça uma pergunta em voz alta'", () => {
    render(
      <TurnoPresencial
        isMinhaVez
        jogadorAtualApelido="Ana"
        turnoPalavras={false}
        fase="jogando"
      />,
    );
    expect(screen.getByText(/Faça uma pergunta.+em voz alta/i)).toBeDefined();
  });

  it("vez de outro, fase jogando: mostra 'X está perguntando'", () => {
    render(
      <TurnoPresencial
        isMinhaVez={false}
        jogadorAtualApelido="Bruno"
        turnoPalavras={false}
        fase="jogando"
      />,
    );
    expect(screen.getByText(/Bruno está perguntando/i)).toBeDefined();
  });

  it("vez de outro, fase de palavras: mostra 'Vez de X'", () => {
    render(
      <TurnoPresencial
        isMinhaVez={false}
        jogadorAtualApelido="Bruno"
        turnoPalavras
        fase="turno_palavras"
      />,
    );
    expect(screen.getByText(/Vez de\s*Bruno/i)).toBeDefined();
  });

  it("vez de outro, aguardando resposta: volta a 'Vez de X'", () => {
    render(
      <TurnoPresencial
        isMinhaVez={false}
        jogadorAtualApelido="Bruno"
        turnoPalavras={false}
        fase="aguardando_resposta"
      />,
    );
    expect(screen.getByText(/Vez de\s*Bruno/i)).toBeDefined();
  });
});
