import { describe, it, expect } from "vitest";
import type { EstadoRodada, PalavraTurno } from "@shared/types";

// ── Estado base ───────────────────────────────────────────────

function makeEstado(
  jogadorIds: string[],
  overrides: Partial<EstadoRodada> = {}
): EstadoRodada {
  return {
    fase: "jogando",
    turno_atual: jogadorIds[0],
    ordem_turnos: [...jogadorIds],
    espia_ids: [],
    timer_end: new Date(Date.now() + 300_000).toISOString(),
    eliminacoes_erradas: 0,
    acusado_id: null,
    acusou_neste_turno: false,
    adivinhou_evento_id: null,
    pergunta_atual: null,
    historico: [],
    palavras_turno: [],
    turno_numero_atual: 1,
    ...overrides,
  };
}

// ── Lógica pura de avanço de turno (espelho de proximo-turno.ts) ──

function avancarTurno(estado: EstadoRodada): EstadoRodada {
  const idx = estado.ordem_turnos.indexOf(estado.turno_atual);
  const proximo = estado.ordem_turnos[(idx + 1) % estado.ordem_turnos.length];
  return { ...estado, turno_atual: proximo, acusou_neste_turno: false };
}

// ── Lógica pura de dizer palavra (espelho de dizer-palavra.ts) ──

function dizerPalavra(
  estado: EstadoRodada,
  jogadorId: string,
  palavra: string,
  jogadoresAtivosIds: string[]
): EstadoRodada {
  if (estado.fase !== "turno_palavras") throw new Error("Fase errada — esperado turno_palavras");
  if (jogadorId !== estado.turno_atual) throw new Error("Não é seu turno");
  if (palavra.includes(" ")) throw new Error("Apenas uma palavra");

  const idx = estado.ordem_turnos.indexOf(estado.turno_atual);
  const proximo = estado.ordem_turnos[(idx + 1) % estado.ordem_turnos.length];

  const novasPalavras: PalavraTurno[] = [
    ...estado.palavras_turno,
    { jogador_id: jogadorId, apelido: jogadorId, palavra },
  ];

  const ditos = new Set(novasPalavras.map((p) => p.jogador_id));
  const todosFalaram =
    jogadoresAtivosIds.length > 0 &&
    jogadoresAtivosIds.every((id) => ditos.has(id));

  return {
    ...estado,
    turno_atual: proximo,
    acusou_neste_turno: false,
    palavras_turno: novasPalavras,
    fase: todosFalaram ? "jogando" : estado.fase,
  };
}

// ── Testes ────────────────────────────────────────────────────

describe("ciclo de turnos — cada jogador ativo joga exatamente uma vez", () => {
  it("turno normal: ciclo completo visita cada jogador exatamente 1 vez", () => {
    const ids = ["j1", "j2", "j3", "j4"];
    let estado = makeEstado(ids);

    const turnosVisitados: string[] = [];

    for (let i = 0; i < ids.length; i++) {
      turnosVisitados.push(estado.turno_atual);
      estado = avancarTurno(estado);
    }

    expect(turnosVisitados).toHaveLength(ids.length);
    expect(new Set(turnosVisitados).size).toBe(ids.length);
    expect(turnosVisitados).toEqual(ids);
  });

  it("turno normal: após ciclo completo, volta ao primeiro jogador", () => {
    const ids = ["j1", "j2", "j3"];
    let estado = makeEstado(ids);

    for (let i = 0; i < ids.length; i++) {
      estado = avancarTurno(estado);
    }

    expect(estado.turno_atual).toBe(ids[0]);
  });

  it("jogador eliminado nunca aparece como turno_atual", () => {
    // j2 foi eliminado — não está em ordem_turnos
    const ids = ["j1", "j3", "j4"];
    let estado = makeEstado(ids);

    const turnosVisitados: string[] = [];
    for (let i = 0; i < ids.length; i++) {
      turnosVisitados.push(estado.turno_atual);
      estado = avancarTurno(estado);
    }

    expect(turnosVisitados).not.toContain("j2");
    expect(turnosVisitados).toHaveLength(3);
  });

  it("tentativa de jogar fora do turno é rejeitada", () => {
    const ids = ["j1", "j2", "j3"];
    const estado = makeEstado(ids, { fase: "turno_palavras" });

    expect(() => dizerPalavra(estado, "j2", "fé", ids)).toThrow(
      "Não é seu turno"
    );
    expect(() => dizerPalavra(estado, "j3", "paz", ids)).toThrow(
      "Não é seu turno"
    );
  });

  it("primeira rodada: cada jogador diz exatamente 1 palavra, encerra ao completar", () => {
    const ids = ["j1", "j2", "j3", "j4"];
    let estado = makeEstado(ids, { fase: "turno_palavras" });

    const palavras = ["fé", "graça", "paz", "amor"];

    ids.forEach((id, i) => {
      expect(estado.turno_atual).toBe(id);
      expect(estado.fase).toBe("turno_palavras");
      estado = dizerPalavra(estado, id, palavras[i], ids);
    });

    expect(estado.fase).toBe("jogando");
    expect(estado.palavras_turno).toHaveLength(ids.length);

    const ditos = estado.palavras_turno.map((p) => p.jogador_id);
    expect(new Set(ditos).size).toBe(ids.length);
    ids.forEach((id) => expect(ditos).toContain(id));
  });

  it("primeira rodada: jogador eliminado (ausente de ordem_turnos) não é esperado nem aparece", () => {
    // j3 eliminado antes da primeira rodada — não está na lista de ativos
    const ativos = ["j1", "j2", "j4"];
    let estado = makeEstado(ativos, { fase: "turno_palavras" });

    const palavras: Record<string, string> = { j1: "fé", j2: "graça", j4: "paz" };

    ativos.forEach((id) => {
      estado = dizerPalavra(estado, id, palavras[id], ativos);
    });

    expect(estado.fase).toBe("jogando");
    const ditos = estado.palavras_turno.map((p) => p.jogador_id);
    expect(ditos).not.toContain("j3");
    expect(ditos).toHaveLength(ativos.length);
  });

  it("primeira rodada: segunda palavra pelo mesmo jogador é impossível (não é mais seu turno)", () => {
    const ids = ["j1", "j2"];
    let estado = makeEstado(ids, { fase: "turno_palavras" });

    estado = dizerPalavra(estado, "j1", "fé", ids);

    // agora é vez de j2; j1 tenta novamente
    expect(() => dizerPalavra(estado, "j1", "graça", ids)).toThrow(
      "Não é seu turno"
    );
  });
});
