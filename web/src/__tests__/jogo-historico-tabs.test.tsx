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
      <HistoricoTabs historico={[]} palavrasPrimeiraRodada={[]} />
    );
    expect(container.firstChild).toBeNull();
  });

  it("two perguntas in turno 1 → renders one tab 'Turno 1' with both perguntas visible", () => {
    const historico = [makeP("Alice", 1), makeP("Carlos", 1)];
    render(
      <HistoricoTabs historico={historico} palavrasPrimeiraRodada={[]} />
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
      <HistoricoTabs historico={historico} palavrasPrimeiraRodada={[]} />
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
      <HistoricoTabs historico={historico} palavrasPrimeiraRodada={[]} />
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
      <HistoricoTabs historico={historico1} palavrasPrimeiraRodada={[]} />
    );

    // Click Turno 1 (index 0)
    fireEvent.click(screen.getByText("Turno 1"));

    // Add a new tab
    const historico2 = [...historico1, makeP("Davi", 3)];
    rerender(
      <HistoricoTabs historico={historico2} palavrasPrimeiraRodada={[]} />
    );

    // Turno 1 content should still be visible (Alice)
    expect(screen.getByText("Alice")).toBeInTheDocument();
    // Turno 3 tab exists
    expect(screen.getByText("Turno 3")).toBeInTheDocument();
  });

  it("user on last tab, new tab added → advances to new tab", () => {
    const historico1 = [makeP("Alice", 1), makeP("Carlos", 2)];
    const { rerender } = render(
      <HistoricoTabs historico={historico1} palavrasPrimeiraRodada={[]} />
    );

    // Turno 2 is selected by default (last)
    expect(screen.getByText("Carlos")).toBeInTheDocument();

    // Add Turno 3
    const historico2 = [...historico1, makeP("Davi", 3)];
    rerender(
      <HistoricoTabs historico={historico2} palavrasPrimeiraRodada={[]} />
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
      <HistoricoTabs historico={[legacyItem]} palavrasPrimeiraRodada={[]} />
    );

    expect(screen.getByText("Turno 1")).toBeInTheDocument();
    expect(screen.getByText("Legacy")).toBeInTheDocument();
  });

  it("user on votação tab, new item added to existing turno group → advances to that turno group", () => {
    // Simulates votação happening mid-cycle: turno_numero_atual stays at 1
    // so post-votação items also get turno_numero: 1
    const historico1 = [makeP("Alice", 1), makeV()];
    const { rerender } = render(
      <HistoricoTabs historico={historico1} palavrasPrimeiraRodada={[]} />
    );

    // After votação is added, user lands on Votação tab (last tab at the time)
    expect(screen.getByText(/Acusado: Ana/i)).toBeInTheDocument();

    // New item arrives in turno 1 (mid-cycle, turno_numero_atual didn't increment)
    const historico2 = [...historico1, makeP("Carlos", 1)];
    rerender(
      <HistoricoTabs historico={historico2} palavrasPrimeiraRodada={[]} />
    );

    // Should have moved to Turno 1 tab — Carlos visible, votação content not visible
    expect(screen.getByText("Carlos")).toBeInTheDocument();
    expect(screen.queryByText(/Acusado: Ana/i)).not.toBeInTheDocument();
  });

  it("turno_presencial items → grouped by turno_numero like pergunta items", () => {
    const historico = [makeTP("Bruno", 1), makeTP("Carla", 2)];
    render(
      <HistoricoTabs historico={historico} palavrasPrimeiraRodada={[]} />
    );

    expect(screen.getByText("Turno 1")).toBeInTheDocument();
    expect(screen.getByText("Turno 2")).toBeInTheDocument();

    // Turno 2 is active by default → Carla visible
    expect(screen.getByText("Carla")).toBeInTheDocument();
  });

  it("palavras da primeira rodada → aba 'Turno 1' separada; turnos seguintes ficam 'Turno 2', 'Turno 3'", () => {
    const palavras = [
      { jogador_id: "j1", apelido: "Ana", palavra: "água" },
      { jogador_id: "j2", apelido: "Bruno", palavra: "fogo" },
    ];
    const historico = [makeP("Alice", 1), makeP("Carlos", 2)];
    render(
      <HistoricoTabs historico={historico} palavrasPrimeiraRodada={palavras} />
    );

    // 3 abas: Turno 1 (palavras), Turno 2 (perguntas turno_numero=1), Turno 3 (perguntas turno_numero=2)
    expect(screen.getByText("Turno 1")).toBeInTheDocument();
    expect(screen.getByText("Turno 2")).toBeInTheDocument();
    expect(screen.getByText("Turno 3")).toBeInTheDocument();

    // Última aba ativa por padrão → Carlos visível
    expect(screen.getByText("Carlos")).toBeInTheDocument();

    // Clica em Turno 1 → palavras visíveis
    fireEvent.click(screen.getByText("Turno 1"));
    expect(screen.getByText(/água/)).toBeInTheDocument();
    expect(screen.getByText(/fogo/)).toBeInTheDocument();
  });

  it("tab bar usa flexWrap wrap; muitas abas quebram linha em vez de criar scroll horizontal", () => {
    const historico = Array.from({ length: 6 }, (_, i) => makeP(`J${i}`, i + 1));
    render(<HistoricoTabs historico={historico} palavrasPrimeiraRodada={[]} />);

    const tabBar = screen.getByText("Turno 1").parentElement!;
    expect(tabBar.style.flexWrap).toBe("wrap");
    expect(tabBar.style.overflowX).toBe("");
  });

  it("apenas palavras (sem histórico) → uma aba 'Turno 1' com as palavras", () => {
    const palavras = [{ jogador_id: "j1", apelido: "Ana", palavra: "luz" }];
    render(
      <HistoricoTabs historico={[]} palavrasPrimeiraRodada={palavras} />
    );

    expect(screen.getByText("Turno 1")).toBeInTheDocument();
    expect(screen.queryByText("Turno 2")).not.toBeInTheDocument();
    expect(screen.getByText(/luz/)).toBeInTheDocument();
  });
});
