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
  PerguntaAtual,
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

function makePA(perguntador: string, destinatario: string, texto = "Pergunta em andamento?"): PerguntaAtual {
  return {
    perguntador_id: "p-" + perguntador,
    perguntador_apelido: perguntador,
    destinatario_id: "d-" + destinatario,
    destinatario_apelido: destinatario,
    texto,
  };
}

// ── Tests ──────────────────────────────────────────────────────

describe("HistoricoTabs", () => {
  it("empty historico → renders nothing", () => {
    const { container } = render(
      <HistoricoTabs historico={[]} palavrasTurno={[]} />
    );
    expect(container.firstChild).toBeNull();
  });

  it("two perguntas in turno 1 → renders one tab 'Turno 1' with both perguntas visible", () => {
    const historico = [makeP("Alice", 1), makeP("Carlos", 1)];
    render(
      <HistoricoTabs historico={historico} palavrasTurno={[]} />
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
      <HistoricoTabs historico={historico} palavrasTurno={[]} />
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
      <HistoricoTabs historico={historico} palavrasTurno={[]} />
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
      <HistoricoTabs historico={historico1} palavrasTurno={[]} />
    );

    // Click Turno 1 (index 0)
    fireEvent.click(screen.getByText("Turno 1"));

    // Add a new tab
    const historico2 = [...historico1, makeP("Davi", 3)];
    rerender(
      <HistoricoTabs historico={historico2} palavrasTurno={[]} />
    );

    // Turno 1 content should still be visible (Alice)
    expect(screen.getByText("Alice")).toBeInTheDocument();
    // Turno 3 tab exists
    expect(screen.getByText("Turno 3")).toBeInTheDocument();
  });

  it("user on last tab, new tab added → advances to new tab", () => {
    const historico1 = [makeP("Alice", 1), makeP("Carlos", 2)];
    const { rerender } = render(
      <HistoricoTabs historico={historico1} palavrasTurno={[]} />
    );

    // Turno 2 is selected by default (last)
    expect(screen.getByText("Carlos")).toBeInTheDocument();

    // Add Turno 3
    const historico2 = [...historico1, makeP("Davi", 3)];
    rerender(
      <HistoricoTabs historico={historico2} palavrasTurno={[]} />
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
      <HistoricoTabs historico={[legacyItem]} palavrasTurno={[]} />
    );

    expect(screen.getByText("Turno 1")).toBeInTheDocument();
    expect(screen.getByText("Legacy")).toBeInTheDocument();
  });

  it("user on votação tab, new item added to existing turno group → advances to that turno group", () => {
    // Simulates votação happening mid-cycle: turno_numero_atual stays at 1
    // so post-votação items also get turno_numero: 1
    const historico1 = [makeP("Alice", 1), makeV()];
    const { rerender } = render(
      <HistoricoTabs historico={historico1} palavrasTurno={[]} />
    );

    // After votação is added, user lands on Votação tab (last tab at the time)
    expect(screen.getByText(/Acusado: Ana/i)).toBeInTheDocument();

    // New item arrives in turno 1 (mid-cycle, turno_numero_atual didn't increment)
    const historico2 = [...historico1, makeP("Carlos", 1)];
    rerender(
      <HistoricoTabs historico={historico2} palavrasTurno={[]} />
    );

    // Should have moved to Turno 1 tab — Carlos visible, votação content not visible
    expect(screen.getByText("Carlos")).toBeInTheDocument();
    expect(screen.queryByText(/Acusado: Ana/i)).not.toBeInTheDocument();
  });

  it("turno_presencial items → grouped by turno_numero like pergunta items", () => {
    const historico = [makeTP("Bruno", 1), makeTP("Carla", 2)];
    render(
      <HistoricoTabs historico={historico} palavrasTurno={[]} />
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
      <HistoricoTabs historico={historico} palavrasTurno={palavras} />
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
    render(<HistoricoTabs historico={historico} palavrasTurno={[]} />);

    const tabBar = screen.getByText("Turno 1").parentElement!;
    expect(tabBar.style.flexWrap).toBe("wrap");
    expect(tabBar.style.overflowX).toBe("");
  });

  it("apenas palavras (sem histórico) → uma aba 'Turno 1' com as palavras", () => {
    const palavras = [{ jogador_id: "j1", apelido: "Ana", palavra: "luz" }];
    render(
      <HistoricoTabs historico={[]} palavrasTurno={palavras} />
    );

    expect(screen.getByText("Turno 1")).toBeInTheDocument();
    expect(screen.queryByText("Turno 2")).not.toBeInTheDocument();
    expect(screen.getByText(/luz/)).toBeInTheDocument();
  });

  // ── Pergunta em andamento ──────────────────────────────────────

  it("pergunta em andamento sem aba ainda → cria aba, seleciona e mostra 'X está respondendo'", () => {
    const palavras = [{ jogador_id: "j1", apelido: "Ana", palavra: "luz" }];
    render(
      <HistoricoTabs
        historico={[]}
        palavrasTurno={palavras}
        perguntaAtual={makePA("Ana", "Bruno", "Você vê água?")}
        turnoNumeroAtual={1}
      />
    );

    // aba sintética da volta atual (Turno 2 por causa do offset das palavras)
    expect(screen.getByText("Turno 2")).toBeInTheDocument();
    // selecionada automaticamente → pergunta e indicador visíveis
    expect(screen.getByText(/Você vê água\?/)).toBeInTheDocument();
    expect(screen.getByText(/Bruno está respondendo/)).toBeInTheDocument();
  });

  it("pergunta em andamento após respostas na mesma volta → aparece ao fim da aba", () => {
    render(
      <HistoricoTabs
        historico={[makeP("Alice", 1)]}
        palavrasTurno={[]}
        perguntaAtual={makePA("Bruno", "Carla", "Tem muralhas?")}
        turnoNumeroAtual={1}
      />
    );

    expect(screen.getByText("Resposta")).toBeInTheDocument(); // pergunta já respondida
    expect(screen.getByText(/Tem muralhas\?/)).toBeInTheDocument();
    expect(screen.getByText(/Carla está respondendo/)).toBeInTheDocument();
  });

  it("ao responder, indicador some e a pergunta vira item do histórico", () => {
    const { rerender } = render(
      <HistoricoTabs
        historico={[]}
        palavrasTurno={[{ jogador_id: "j1", apelido: "Ana", palavra: "luz" }]}
        perguntaAtual={makePA("Ana", "Bruno", "É de noite?")}
        turnoNumeroAtual={1}
      />
    );
    expect(screen.getByText(/Bruno está respondendo/)).toBeInTheDocument();

    rerender(
      <HistoricoTabs
        historico={[{ tipo: "pergunta", turno_numero: 1, perguntador_apelido: "Ana", destinatario_apelido: "Bruno", pergunta: "É de noite?", resposta: "Sim" }]}
        palavrasTurno={[{ jogador_id: "j1", apelido: "Ana", palavra: "luz" }]}
        perguntaAtual={null}
        turnoNumeroAtual={1}
      />
    );
    expect(screen.queryByText(/está respondendo/)).not.toBeInTheDocument();
    expect(screen.getByText("Sim")).toBeInTheDocument();
  });

  it("nova volta com pergunta em andamento → aba avança automaticamente", () => {
    const h1 = [makeP("Alice", 1)];
    const { rerender } = render(
      <HistoricoTabs historico={h1} palavrasTurno={[]} />
    );
    expect(screen.getByText("Resposta")).toBeInTheDocument();

    // Volta 2 começa: pergunta em andamento, ainda sem item respondido
    rerender(
      <HistoricoTabs
        historico={h1}
        palavrasTurno={[]}
        perguntaAtual={makePA("Bruno", "Carla", "Cidade grande?")}
        turnoNumeroAtual={2}
      />
    );
    expect(screen.getByText("Turno 2")).toBeInTheDocument();
    expect(screen.getByText(/Cidade grande\?/)).toBeInTheDocument();
    expect(screen.getByText(/Carla está respondendo/)).toBeInTheDocument();
  });

  it("clicar numa aba antiga pausa o acompanhamento; clicar na aba ativa retoma", () => {
    const h1 = [makeP("Alice", 1), makeP("Bruno", 2)];
    const { rerender } = render(
      <HistoricoTabs historico={h1} palavrasTurno={[]} />
    );

    // Pausa: volta para Turno 1
    fireEvent.click(screen.getByText("Turno 1"));
    expect(screen.getByText("Alice")).toBeInTheDocument();

    // Chega Turno 3 → continua pausado em Turno 1
    const h2 = [...h1, makeP("Davi", 3)];
    rerender(<HistoricoTabs historico={h2} palavrasTurno={[]} />);
    expect(screen.getByText("Alice")).toBeInTheDocument();

    // Toca na aba ativa (Turno 3) → retoma acompanhamento
    fireEvent.click(screen.getByText("Turno 3"));
    expect(screen.getByText("Davi")).toBeInTheDocument();

    // Chega Turno 4 → segue automaticamente
    const h3 = [...h2, makeP("Eva", 4)];
    rerender(<HistoricoTabs historico={h3} palavrasTurno={[]} />);
    expect(screen.getByText("Eva")).toBeInTheDocument();
  });
});
