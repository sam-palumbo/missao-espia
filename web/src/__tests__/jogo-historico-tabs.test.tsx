import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import { vi, describe, it, expect } from "vitest";

// ── Mocks ──────────────────────────────────────────────────────

vi.mock("@/components/ui/design", async () => (await import("./helpers")).designMock);
vi.mock("motion/react", async () => (await import("./helpers")).motionMock);

// ── Imports ────────────────────────────────────────────────────

import HistoricoTabs from "@/app/sala/[code]/jogo/historico-tabs";
import type {
  HistoricoPergunta,
  HistoricoVotacao,
  HistoricoTurnoPresencial,
} from "@/lib/types";

// ── Fixture builders ───────────────────────────────────────────

function makeP(perguntador: string, turno_numero = 1): HistoricoPergunta {
  return {
    tipo: "pergunta" as const,
    turno_numero,
    perguntador_apelido: perguntador,
    destinatario_apelido: "Bob",
    pergunta: "Pergunta?",
    resposta: "Resposta",
  };
}

function makeV(): HistoricoVotacao {
  return {
    tipo: "votacao" as const,
    acusado_apelido: "Ana",
    votos: [{ votante_apelido: "Bob", aprovado: true }],
    resultado: "eliminado" as const,
  };
}

function makeTP(apelido: string, turno_numero = 1): HistoricoTurnoPresencial {
  return {
    tipo: "turno_presencial" as const,
    turno_numero,
    jogador_apelido: apelido,
  };
}

// ── Tests ──────────────────────────────────────────────────────

describe("HistoricoTabs", () => {
  it("empty historico → renders nothing", () => {
    const { container } = render(
      <HistoricoTabs historico={[]} palavrasPrimeiraRodada={[]} primeiraRodada={false} />
    );
    expect(container.firstChild).toBeNull();
  });

  it("two perguntas in turno 1 → renders one tab 'Turno 1' with both perguntas visible", () => {
    const historico = [makeP("Alice", 1), makeP("Carlos", 1)];
    render(
      <HistoricoTabs historico={historico} palavrasPrimeiraRodada={[]} primeiraRodada={false} />
    );

    expect(screen.getByText("Turno 1")).toBeInTheDocument();
    // Only one tab
    expect(screen.queryByText("Turno 2")).not.toBeInTheDocument();
    // Both perguntadores visible in content
    expect(screen.getByText("Alice")).toBeInTheDocument();
    expect(screen.getByText("Carlos")).toBeInTheDocument();
  });

  it("perguntas in turno 1 and turno 2 → two tabs; Turno 2 is selected by default", () => {
    const historico = [makeP("Alice", 1), makeP("Carlos", 2)];
    render(
      <HistoricoTabs historico={historico} palavrasPrimeiraRodada={[]} primeiraRodada={false} />
    );

    expect(screen.getByText("Turno 1")).toBeInTheDocument();
    expect(screen.getByText("Turno 2")).toBeInTheDocument();
    // Turno 2 is selected → Carlos visible, Alice not in content
    // (content shows only active group; both tabs exist but Alice is in turno 1)
    expect(screen.getByText("Carlos")).toBeInTheDocument();
    expect(screen.queryByText("Alice")).not.toBeInTheDocument();
  });

  it("votação between turnos → 3 tabs: Turno 1, Votação, Turno 2; last is selected; clicking Votação shows votação content", () => {
    const historico = [makeP("Alice", 1), makeV(), makeP("Carlos", 2)];
    render(
      <HistoricoTabs historico={historico} palavrasPrimeiraRodada={[]} primeiraRodada={false} />
    );

    const tab1 = screen.getByText("Turno 1");
    const tabV = screen.getByText("Votação");
    const tab2 = screen.getByText("Turno 2");

    expect(tab1).toBeInTheDocument();
    expect(tabV).toBeInTheDocument();
    expect(tab2).toBeInTheDocument();

    // Last tab (Turno 2) is selected by default
    expect(screen.getByText("Carlos")).toBeInTheDocument();

    // Click Votação
    fireEvent.click(tabV);
    // Votação content should appear
    expect(screen.getByText(/Acusado: Ana/i)).toBeInTheDocument();
  });

  it("user on earlier tab, new tab added → selection preserved", () => {
    const historico1 = [makeP("Alice", 1), makeV(), makeP("Carlos", 2)];
    const { rerender } = render(
      <HistoricoTabs historico={historico1} palavrasPrimeiraRodada={[]} primeiraRodada={false} />
    );

    // Click Turno 1 (index 0)
    fireEvent.click(screen.getByText("Turno 1"));

    // Add a new tab
    const historico2 = [...historico1, makeP("Davi", 3)];
    rerender(
      <HistoricoTabs historico={historico2} palavrasPrimeiraRodada={[]} primeiraRodada={false} />
    );

    // Turno 1 content should still be visible (Alice)
    expect(screen.getByText("Alice")).toBeInTheDocument();
    // Turno 3 tab exists
    expect(screen.getByText("Turno 3")).toBeInTheDocument();
  });

  it("user on last tab, new tab added → advances to new tab", () => {
    const historico1 = [makeP("Alice", 1), makeP("Carlos", 2)];
    const { rerender } = render(
      <HistoricoTabs historico={historico1} palavrasPrimeiraRodada={[]} primeiraRodada={false} />
    );

    // Turno 2 is selected by default (last)
    expect(screen.getByText("Carlos")).toBeInTheDocument();

    // Add Turno 3
    const historico2 = [...historico1, makeP("Davi", 3)];
    rerender(
      <HistoricoTabs historico={historico2} palavrasPrimeiraRodada={[]} primeiraRodada={false} />
    );

    // Now Turno 3 should be selected → Davi visible
    expect(screen.getByText("Davi")).toBeInTheDocument();
    expect(screen.getByText("Turno 3")).toBeInTheDocument();
  });

  it("legacy data without turno_numero → grouped in Turno 1", () => {
    // HistoricoPergunta without turno_numero (legacy)
    const legacyItem = {
      tipo: "pergunta" as const,
      perguntador_apelido: "Legacy",
      destinatario_apelido: "Bob",
      pergunta: "Pergunta?",
      resposta: "Resposta",
    } as HistoricoPergunta;

    render(
      <HistoricoTabs historico={[legacyItem]} palavrasPrimeiraRodada={[]} primeiraRodada={false} />
    );

    expect(screen.getByText("Turno 1")).toBeInTheDocument();
    expect(screen.getByText("Legacy")).toBeInTheDocument();
  });

  it("turno_presencial items → grouped by turno_numero like pergunta items", () => {
    const historico = [makeTP("Bruno", 1), makeTP("Carla", 2)];
    render(
      <HistoricoTabs historico={historico} palavrasPrimeiraRodada={[]} primeiraRodada={false} />
    );

    expect(screen.getByText("Turno 1")).toBeInTheDocument();
    expect(screen.getByText("Turno 2")).toBeInTheDocument();

    // Turno 2 is active by default → Carla visible
    expect(screen.getByText("Carla")).toBeInTheDocument();
  });
});
