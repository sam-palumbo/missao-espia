import { assertEquals } from "std/assert";
import { estaForaDoTurno, isEspia, isMeuTurno, isPrimeiroTurno } from "./regras.ts";
import type { EstadoRodada } from "./types.ts";

function makeEstado(over: Partial<EstadoRodada> = {}): EstadoRodada {
  return {
    fase: "jogando",
    turno_atual: "j1",
    ordem_turnos: ["j1", "j2", "j3"],
    espia_ids: ["j2"],
    timer_end: "2030-01-01T00:00:00.000Z",
    eliminacoes_erradas: 0,
    acusado_id: null,
    acusou_neste_turno: false,
    adivinhou_evento_id: null,
    pergunta_atual: null,
    historico: [],
    primeira_rodada: false,
    palavras_primeira_rodada: [],
    turno_numero_atual: 1,
    ...over,
  };
}

// ── isPrimeiroTurno ────────────────────────────────────────────

Deno.test("isPrimeiroTurno: rodada normal sem histórico", () => {
  assertEquals(isPrimeiroTurno(makeEstado()), true);
});

Deno.test("isPrimeiroTurno: rodada normal com histórico falso", () => {
  const estado = makeEstado({
    historico: [{ tipo: "pergunta", turno_numero: 1, perguntador_apelido: "a", destinatario_apelido: "b", pergunta: "?", resposta: "!" }],
  });
  assertEquals(isPrimeiroTurno(estado), false);
});

Deno.test("isPrimeiroTurno: primeira rodada sem palavras", () => {
  const estado = makeEstado({ primeira_rodada: true });
  assertEquals(isPrimeiroTurno(estado), true);
});

Deno.test("isPrimeiroTurno: primeira rodada com palavras dita falso", () => {
  const estado = makeEstado({
    primeira_rodada: true,
    palavras_primeira_rodada: [{ jogador_id: "j1", apelido: "A", palavra: "luz" }],
  });
  assertEquals(isPrimeiroTurno(estado), false);
});

// ── isEspia ────────────────────────────────────────────────────

Deno.test("isEspia: jogador na lista", () => {
  assertEquals(isEspia(makeEstado(), "j2"), true);
});

Deno.test("isEspia: jogador fora da lista", () => {
  assertEquals(isEspia(makeEstado(), "j1"), false);
});

Deno.test("isEspia: lista vazia", () => {
  assertEquals(isEspia(makeEstado({ espia_ids: [] }), "j1"), false);
});

// ── estaForaDoTurno ───────────────────────────────────────────

Deno.test("estaForaDoTurno: jogador presente em ordem_turnos", () => {
  assertEquals(estaForaDoTurno(makeEstado(), "j1"), false);
});

Deno.test("estaForaDoTurno: jogador ausente de ordem_turnos", () => {
  assertEquals(estaForaDoTurno(makeEstado(), "j99"), true);
});

Deno.test("estaForaDoTurno: ordem_turnos vazia retorna false (estado pré-rodada)", () => {
  assertEquals(estaForaDoTurno(makeEstado({ ordem_turnos: [] }), "j1"), false);
});

// ── isMeuTurno ────────────────────────────────────────────────

Deno.test("isMeuTurno: jogador é o turno atual", () => {
  assertEquals(isMeuTurno(makeEstado(), "j1"), true);
});

Deno.test("isMeuTurno: jogador não é o turno atual", () => {
  assertEquals(isMeuTurno(makeEstado(), "j2"), false);
});
