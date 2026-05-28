import { assertEquals, assertThrows } from "std/assert";
import {
  assertFase,
  assertIsAnfitriao,
  assertIsTurno,
  assertJogadorAtivo,
  assertModoOnline,
  assertRodadaNaoEncerrada,
  calcularProximoTurno,
} from "./queries.ts";
import type { EstadoRodada } from "./types.ts";

function makeEstado(over: Partial<EstadoRodada> = {}): EstadoRodada {
  return {
    fase: "jogando",
    turno_atual: "j1",
    ordem_turnos: ["j1", "j2", "j3"],
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
    ...over,
  };
}

// ── assertRodadaNaoEncerrada ──────────────────────────────────────

Deno.test("assertRodadaNaoEncerrada: encerrada_em null → não lança", () => {
  assertRodadaNaoEncerrada({ encerrada_em: null });
});

Deno.test("assertRodadaNaoEncerrada: encerrada_em preenchida → lança", () => {
  assertThrows(
    () => assertRodadaNaoEncerrada({ encerrada_em: "2026-01-01T00:00:00Z" }),
    Error,
    "já encerrada",
  );
});

// ── assertFase ────────────────────────────────────────────────────

Deno.test("assertFase: fase presente na lista → não lança", () => {
  assertFase(makeEstado({ fase: "jogando" }), ["jogando", "votacao"]);
});

Deno.test("assertFase: fase ausente da lista → lança com mensagem", () => {
  assertThrows(
    () => assertFase(makeEstado({ fase: "resultado" }), ["jogando"]),
    Error,
    "resultado",
  );
});

Deno.test("assertFase: lista vazia → sempre lança", () => {
  assertThrows(
    () => assertFase(makeEstado(), []),
    Error,
  );
});

// ── assertJogadorAtivo ────────────────────────────────────────────

Deno.test("assertJogadorAtivo: ativo=true → não lança", () => {
  assertJogadorAtivo({ ativo: true });
});

Deno.test("assertJogadorAtivo: ativo=false → lança 403", () => {
  assertThrows(
    () => assertJogadorAtivo({ ativo: false }),
    Error,
    "eliminado",
  );
});

// ── assertIsTurno ─────────────────────────────────────────────────

Deno.test("assertIsTurno: é o turno do jogador → não lança", () => {
  assertIsTurno(makeEstado({ turno_atual: "j1" }), "j1");
});

Deno.test("assertIsTurno: não é o turno do jogador → lança 403", () => {
  assertThrows(
    () => assertIsTurno(makeEstado({ turno_atual: "j2" }), "j1"),
    Error,
    "turno",
  );
});

// ── assertIsAnfitriao ─────────────────────────────────────────────

Deno.test("assertIsAnfitriao: usuário é o anfitrião → não lança", () => {
  assertIsAnfitriao({ anfitriao: "u1" }, "u1");
});

Deno.test("assertIsAnfitriao: usuário não é o anfitrião → lança 403", () => {
  assertThrows(
    () => assertIsAnfitriao({ anfitriao: "u2" }, "u1"),
    Error,
    "anfitrião",
  );
});

Deno.test("assertIsAnfitriao: anfitriao null → lança", () => {
  assertThrows(
    () => assertIsAnfitriao({ anfitriao: null }, "u1"),
    Error,
  );
});

// ── assertModoOnline ──────────────────────────────────────────────

Deno.test("assertModoOnline: modo online → não lança", () => {
  assertModoOnline("online");
});

Deno.test("assertModoOnline: modo presencial → lança", () => {
  assertThrows(
    () => assertModoOnline("presencial"),
    Error,
    "presencial",
  );
});

// ── calcularProximoTurno ──────────────────────────────────────────

Deno.test("calcularProximoTurno: avança do primeiro para o segundo", () => {
  const { proximo, proximoTurnoNumero } = calcularProximoTurno(
    makeEstado({ turno_atual: "j1", ordem_turnos: ["j1", "j2", "j3"], turno_numero_atual: 1 }),
  );
  assertEquals(proximo, "j2");
  assertEquals(proximoTurnoNumero, 1);
});

Deno.test("calcularProximoTurno: avança do segundo para o terceiro", () => {
  const { proximo, proximoTurnoNumero } = calcularProximoTurno(
    makeEstado({ turno_atual: "j2", ordem_turnos: ["j1", "j2", "j3"], turno_numero_atual: 1 }),
  );
  assertEquals(proximo, "j3");
  assertEquals(proximoTurnoNumero, 1);
});

Deno.test("calcularProximoTurno: último jogador → volta ao primeiro e incrementa turno_numero", () => {
  const { proximo, proximoTurnoNumero } = calcularProximoTurno(
    makeEstado({ turno_atual: "j3", ordem_turnos: ["j1", "j2", "j3"], turno_numero_atual: 1 }),
  );
  assertEquals(proximo, "j1");
  assertEquals(proximoTurnoNumero, 2);
});

Deno.test("calcularProximoTurno: turno_numero_atual ausente (undefined) usa 1 como base", () => {
  const estado = makeEstado({ turno_atual: "j3", ordem_turnos: ["j1", "j2", "j3"] });
  // @ts-ignore — simula estado legado sem o campo
  estado.turno_numero_atual = undefined;
  const { proximo, proximoTurnoNumero } = calcularProximoTurno(estado);
  assertEquals(proximo, "j1");
  assertEquals(proximoTurnoNumero, 2);
});

Deno.test("calcularProximoTurno: dois jogadores — alterna corretamente", () => {
  const e1 = makeEstado({ turno_atual: "j1", ordem_turnos: ["j1", "j2"], turno_numero_atual: 3 });
  const r1 = calcularProximoTurno(e1);
  assertEquals(r1.proximo, "j2");
  assertEquals(r1.proximoTurnoNumero, 3);

  const e2 = makeEstado({ turno_atual: "j2", ordem_turnos: ["j1", "j2"], turno_numero_atual: 3 });
  const r2 = calcularProximoTurno(e2);
  assertEquals(r2.proximo, "j1");
  assertEquals(r2.proximoTurnoNumero, 4);
});
