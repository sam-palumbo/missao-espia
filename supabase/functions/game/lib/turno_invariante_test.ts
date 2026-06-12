// ============================================================
// Invariante de turnos: em cada volta (turno_numero), todo jogador
// em ordem_turnos joga exatamente uma vez — exceto se for eliminado
// durante a volta.
//
// Simula rodadas usando as funções REAIS de avanço de turno:
// - calcularProximoTurno (responder-pergunta / proximo-turno)
// - proximoTurnoAposEliminacao + novaVolta (adivinhar)
// ============================================================

import { assert, assertEquals } from "std/assert";
import { calcularProximoTurno } from "./queries.ts";
import { proximoTurnoAposEliminacao } from "./regras.ts";
import type { EstadoRodada } from "./types.ts";

function makeEstado(ordem: string[]): EstadoRodada {
  return {
    fase: "jogando",
    turno_atual: ordem[0],
    ordem_turnos: [...ordem],
    espia_ids: [],
    timer_end: "2030-01-01T00:00:00.000Z",
    eliminacoes_erradas: 0,
    acusado_id: null,
    acusou_neste_turno: false,
    adivinhou_evento_id: null,
    pergunta_atual: null,
    historico: [],
    palavras_turno: [],
    turno_numero_atual: 1,
  };
}

type Jogada = { volta: number; jogador: string };

/** O jogador do turno joga (pergunta+resposta) e o turno avança — espelho de responder-pergunta.ts. */
function jogar(estado: EstadoRodada, jogadas: Jogada[]): EstadoRodada {
  jogadas.push({ volta: estado.turno_numero_atual ?? 1, jogador: estado.turno_atual });
  const { proximo, proximoTurnoNumero } = calcularProximoTurno(estado);
  return { ...estado, turno_atual: proximo, turno_numero_atual: proximoTurnoNumero };
}

/** Elimina um jogador no meio da rodada — espelho de adivinhar.ts (espia erra) / votar.ts. */
function eliminar(estado: EstadoRodada, eliminadoId: string): EstadoRodada {
  const { proximo, novaVolta } = proximoTurnoAposEliminacao(
    estado.ordem_turnos,
    eliminadoId,
    estado.turno_atual,
  );
  return {
    ...estado,
    ordem_turnos: estado.ordem_turnos.filter((id) => id !== eliminadoId),
    turno_atual: proximo,
    turno_numero_atual: (estado.turno_numero_atual ?? 1) + (novaVolta ? 1 : 0),
  };
}

/**
 * Verifica o invariante: em cada volta, nenhum jogador joga 2x, e todos
 * os sobreviventes da volta jogaram exatamente 1x (eliminados podem ter
 * jogado 0 ou 1 vez na volta em que saíram).
 */
function assertInvariante(jogadas: Jogada[], sobreviventesPorVolta: Map<number, string[]>) {
  const voltas = new Map<number, string[]>();
  for (const j of jogadas) {
    const lista = voltas.get(j.volta) ?? [];
    lista.push(j.jogador);
    voltas.set(j.volta, lista);
  }
  for (const [volta, jogadores] of voltas) {
    assertEquals(
      new Set(jogadores).size,
      jogadores.length,
      `volta ${volta}: jogador jogou mais de uma vez — ${jogadores.join(", ")}`,
    );
    const sobreviventes = sobreviventesPorVolta.get(volta);
    if (sobreviventes) {
      for (const id of sobreviventes) {
        assert(
          jogadores.includes(id),
          `volta ${volta}: ${id} (não eliminado) não jogou — jogaram: ${jogadores.join(", ")}`,
        );
      }
    }
  }
}

// ── Sem eliminações ───────────────────────────────────────────

Deno.test("invariante: 3 voltas completas sem eliminações — todos jogam 1x por volta", () => {
  const ordem = ["j1", "j2", "j3", "j4", "j5"];
  let estado = makeEstado(ordem);
  const jogadas: Jogada[] = [];

  for (let i = 0; i < ordem.length * 3; i++) estado = jogar(estado, jogadas);

  assertEquals(estado.turno_numero_atual, 4);
  assertInvariante(
    jogadas,
    new Map([[1, ordem], [2, ordem], [3, ordem]]),
  );
});

// ── Eliminação fora do turno do eliminado (caso votar.ts) ─────

Deno.test("invariante: eliminado no meio da volta antes de jogar — demais jogam 1x", () => {
  const ordem = ["j1", "j2", "j3", "j4"];
  let estado = makeEstado(ordem);
  const jogadas: Jogada[] = [];

  estado = jogar(estado, jogadas); // j1 joga
  estado = eliminar(estado, "j4"); // j2 acusa j4 (ainda não jogou) — eliminado
  estado = jogar(estado, jogadas); // j2
  estado = jogar(estado, jogadas); // j3 (último agora) → volta 2

  assertEquals(estado.turno_numero_atual, 2);
  assertEquals(estado.turno_atual, "j1");
  assertInvariante(jogadas, new Map([[1, ["j1", "j2", "j3"]]]));
});

Deno.test("invariante: eliminado depois de já ter jogado na volta — ninguém repete", () => {
  const ordem = ["j1", "j2", "j3", "j4"];
  let estado = makeEstado(ordem);
  const jogadas: Jogada[] = [];

  estado = jogar(estado, jogadas); // j1 joga
  estado = jogar(estado, jogadas); // j2 joga
  estado = eliminar(estado, "j1"); // j3 acusa j1 (já jogou) — eliminado
  estado = jogar(estado, jogadas); // j3
  estado = jogar(estado, jogadas); // j4 (último) → volta 2
  // volta 2 completa com os 3 restantes
  for (let i = 0; i < 3; i++) estado = jogar(estado, jogadas);

  assertEquals(estado.turno_numero_atual, 3);
  assertInvariante(
    jogadas,
    new Map([
      [1, ["j1", "j2", "j3", "j4"]],
      [2, ["j2", "j3", "j4"]],
    ]),
  );
});

// ── Espia eliminado no próprio turno (caso adivinhar.ts) ──────

Deno.test("invariante: espia eliminado no próprio turno no meio da ordem — volta segue sem repetição", () => {
  const ordem = ["j1", "espia", "j3", "j4"];
  let estado = makeEstado(ordem);
  const jogadas: Jogada[] = [];

  estado = jogar(estado, jogadas);     // j1 joga
  estado = eliminar(estado, "espia");  // espia erra a adivinhação no seu turno
  assertEquals(estado.turno_atual, "j3");
  estado = jogar(estado, jogadas);     // j3
  estado = jogar(estado, jogadas);     // j4 (último) → volta 2

  assertEquals(estado.turno_numero_atual, 2);
  assertInvariante(jogadas, new Map([[1, ["j1", "j3", "j4"]]]));
});

Deno.test("invariante (regressão): espia eliminado no próprio turno sendo o ÚLTIMO — nova volta incrementa, ninguém joga 2x na mesma volta", () => {
  const ordem = ["j1", "j2", "j3", "espia"];
  let estado = makeEstado(ordem);
  const jogadas: Jogada[] = [];

  estado = jogar(estado, jogadas);    // j1
  estado = jogar(estado, jogadas);    // j2
  estado = jogar(estado, jogadas);    // j3
  estado = eliminar(estado, "espia"); // espia (último) erra no seu turno → wrap

  // O bug original: turno voltava a j1 sem incrementar turno_numero_atual,
  // fazendo j1/j2/j3 aparecerem 2x no mesmo "turno" do histórico.
  assertEquals(estado.turno_atual, "j1");
  assertEquals(estado.turno_numero_atual, 2);

  for (let i = 0; i < 3; i++) estado = jogar(estado, jogadas); // volta 2 completa

  assertEquals(estado.turno_numero_atual, 3);
  assertInvariante(
    jogadas,
    new Map([
      [1, ["j1", "j2", "j3"]],
      [2, ["j1", "j2", "j3"]],
    ]),
  );
});

// ── Propriedade: eliminações aleatórias nunca quebram o invariante ──

Deno.test("invariante (propriedade): sequências aleatórias de jogadas e eliminações", () => {
  for (let seed = 0; seed < 200; seed++) {
    // PRNG determinístico simples (mulberry32) para reprodutibilidade
    let s = seed + 1;
    const rand = () => {
      s |= 0; s = (s + 0x6D2B79F5) | 0;
      let t = Math.imul(s ^ (s >>> 15), 1 | s);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };

    const n = 4 + Math.floor(rand() * 9); // 4 a 12 jogadores
    const ordem = Array.from({ length: n }, (_, i) => `j${i + 1}`);
    let estado = makeEstado(ordem);
    const jogadas: Jogada[] = [];
    const eliminadoNaVolta = new Map<string, number>();

    for (let passo = 0; passo < 60 && estado.ordem_turnos.length > 2; passo++) {
      if (rand() < 0.15) {
        const alvo = estado.ordem_turnos[Math.floor(rand() * estado.ordem_turnos.length)];
        eliminadoNaVolta.set(alvo, estado.turno_numero_atual ?? 1);
        estado = eliminar(estado, alvo);
      } else {
        estado = jogar(estado, jogadas);
      }
    }

    // Reconstrói sobreviventes por volta: quem nunca foi eliminado, ou foi
    // eliminado numa volta posterior, deveria ter jogado em cada volta completa.
    const ultimaVolta = estado.turno_numero_atual ?? 1;
    const sobreviventesPorVolta = new Map<number, string[]>();
    for (let v = 1; v < ultimaVolta; v++) {
      sobreviventesPorVolta.set(
        v,
        ordem.filter((id) => (eliminadoNaVolta.get(id) ?? Infinity) > v),
      );
    }

    assertInvariante(jogadas, sobreviventesPorVolta);
  }
});
