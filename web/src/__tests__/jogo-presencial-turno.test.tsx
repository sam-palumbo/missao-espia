import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";

vi.mock("@/components/ui/design", () => {
  const T = new Proxy({}, { get: () => "" });
  const F = new Proxy({}, { get: () => "" });
  return {
    InsetFrame: () => null,
    MEAvatar: () => null,
    Eyebrow: ({ children }: { children: React.ReactNode }) => <span>{children}</span>,
    PrimaryBtn: ({ children, ...p }: React.ButtonHTMLAttributes<HTMLButtonElement>) => <button {...p}>{children}</button>,
    T, F,
  };
});

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

import { TurnoPresencial } from "@/app/sala/[code]/jogo/turno-presencial";

describe("<TurnoPresencial />", () => {
  it("vez do jogador, 1ª rodada: mostra 'Diga uma palavra em voz alta' + botão Concluí", () => {
    render(
      <TurnoPresencial
        isMinhaVez
        jogadorAtualApelido="Ana"
        primeiraRodada
        acting={false}
        onConcluir={vi.fn()}
      />,
    );
    expect(screen.getByText(/É sua vez/i)).toBeDefined();
    expect(screen.getByText(/Diga uma palavra em voz alta/i)).toBeDefined();
    expect(screen.getByRole("button", { name: /Conclu[íi] turno/i })).toBeDefined();
  });

  it("vez do jogador, rodada normal: mostra 'Faça uma pergunta em voz alta' + botão Concluí", () => {
    render(
      <TurnoPresencial
        isMinhaVez
        jogadorAtualApelido="Ana"
        primeiraRodada={false}
        acting={false}
        onConcluir={vi.fn()}
      />,
    );
    expect(screen.getByText(/Faça uma pergunta.+em voz alta/i)).toBeDefined();
    expect(screen.getByRole("button", { name: /Conclu[íi] turno/i })).toBeDefined();
  });

  it("tocar 'Concluí turno' chama onConcluir", () => {
    const onConcluir = vi.fn();
    render(
      <TurnoPresencial
        isMinhaVez
        jogadorAtualApelido="Ana"
        primeiraRodada={false}
        acting={false}
        onConcluir={onConcluir}
      />,
    );
    fireEvent.click(screen.getByRole("button", { name: /Conclu[íi] turno/i }));
    expect(onConcluir).toHaveBeenCalled();
  });

  it("vez de outro: mostra 'Vez de X' sem botão Concluí", () => {
    render(
      <TurnoPresencial
        isMinhaVez={false}
        jogadorAtualApelido="Bruno"
        primeiraRodada={false}
        acting={false}
        onConcluir={vi.fn()}
      />,
    );
    expect(screen.getByText(/Vez de\s*Bruno/i)).toBeDefined();
    expect(screen.queryByRole("button", { name: /Conclu[íi] turno/i })).toBeNull();
  });
});
