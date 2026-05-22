import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";

vi.mock("@/components/ui/design", () => {
  const T = new Proxy({}, { get: () => "" });
  const F = new Proxy({}, { get: () => "" });
  return {
    InsetFrame: () => null,
    MEAvatar: () => null,
    MEIcon: () => null,
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
        rodadaNumero={1}
        acusouNesteTurno={false}
        acting={false}
        onConcluir={vi.fn()}
        onOpenAccuse={vi.fn()}
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
        rodadaNumero={2}
        acusouNesteTurno={false}
        acting={false}
        onConcluir={vi.fn()}
        onOpenAccuse={vi.fn()}
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
        rodadaNumero={2}
        acusouNesteTurno={false}
        acting={false}
        onConcluir={onConcluir}
        onOpenAccuse={vi.fn()}
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
        rodadaNumero={2}
        acusouNesteTurno={false}
        acting={false}
        onConcluir={vi.fn()}
        onOpenAccuse={vi.fn()}
      />,
    );
    expect(screen.getByText(/Vez de\s*Bruno/i)).toBeDefined();
    expect(screen.queryByRole("button", { name: /Conclu[íi] turno/i })).toBeNull();
  });

  // ── Acusação ──────────────────────────────────────────────────

  it("rodada 1 não mostra botão Acusar", () => {
    render(
      <TurnoPresencial
        isMinhaVez
        jogadorAtualApelido="Ana"
        primeiroRodada={false}
        rodadaNumero={1}
        acusouNesteTurno={false}
        acting={false}
        onConcluir={vi.fn()}
        onOpenAccuse={vi.fn()}
      />,
    );
    expect(screen.queryByRole("button", { name: /Acusar/i })).toBeNull();
  });

  it("rodada 2+ mostra botão Acusar quando não acusou neste turno", () => {
    render(
      <TurnoPresencial
        isMinhaVez
        jogadorAtualApelido="Ana"
        primeiroRodada={false}
        rodadaNumero={2}
        acusouNesteTurno={false}
        acting={false}
        onConcluir={vi.fn()}
        onOpenAccuse={vi.fn()}
      />,
    );
    expect(screen.getByRole("button", { name: /Acusar/i })).toBeDefined();
  });

  it("rodada 2+ não mostra botão Acusar se já acusou neste turno", () => {
    render(
      <TurnoPresencial
        isMinhaVez
        jogadorAtualApelido="Ana"
        primeiroRodada={false}
        rodadaNumero={2}
        acusouNesteTurno={true}
        acting={false}
        onConcluir={vi.fn()}
        onOpenAccuse={vi.fn()}
      />,
    );
    expect(screen.queryByRole("button", { name: /Acusar/i })).toBeNull();
  });

  it("clicar Acusar chama onOpenAccuse", () => {
    const onOpenAccuse = vi.fn();
    render(
      <TurnoPresencial
        isMinhaVez
        jogadorAtualApelido="Ana"
        primeiroRodada={false}
        rodadaNumero={2}
        acusouNesteTurno={false}
        acting={false}
        onConcluir={vi.fn()}
        onOpenAccuse={onOpenAccuse}
      />,
    );
    fireEvent.click(screen.getByRole("button", { name: /Acusar/i }));
    expect(onOpenAccuse).toHaveBeenCalled();
  });
});
