import { assertEquals } from "std/assert";
import { montarEstadoResultado } from "./encerrar-rodada.ts";

Deno.test("montarEstadoResultado — quando adivinhou_evento_id é nulo/undefined, não inclui no estado", () => {
  const estado = { fase: "adivinhacao", espia_ids: ["a"], pergunta_atual: null };
  const resultado = montarEstadoResultado(estado);
  assertEquals(resultado.fase, "resultado");
  assertEquals("adivinhou_evento_id" in resultado, false);
});

Deno.test("montarEstadoResultado — quando adivinhou_evento_id é undefined explicitamente, não inclui", () => {
  const estado = { fase: "jogando", espia_ids: ["a"] };
  const resultado = montarEstadoResultado(estado, undefined);
  assertEquals(resultado.fase, "resultado");
  assertEquals("adivinhou_evento_id" in resultado, false);
});

Deno.test("montarEstadoResultado — quando adivinhou_evento_id é 0 (válido), inclui no estado", () => {
  const estado = { fase: "jogando", espia_ids: ["a"] };
  const resultado = montarEstadoResultado(estado, 0);
  assertEquals(resultado.fase, "resultado");
  assertEquals(resultado.adivinhou_evento_id, 0);
});

Deno.test("montarEstadoResultado — quando adivinhou_evento_id é positivo, inclui no estado", () => {
  const estado = { fase: "turno_palavras", espia_ids: ["a"] };
  const resultado = montarEstadoResultado(estado, 7);
  assertEquals(resultado.fase, "resultado");
  assertEquals(resultado.adivinhou_evento_id, 7);
});

Deno.test("montarEstadoResultado — preserva as demais chaves do estado original", () => {
  const estado = { fase: "jogando", espia_ids: ["a", "b"], ordem_turnos: ["x", "y"], turno_atual: "x" };
  const resultado = montarEstadoResultado(estado, 3);
  assertEquals(resultado.espia_ids, ["a", "b"]);
  assertEquals(resultado.ordem_turnos, ["x", "y"]);
  assertEquals(resultado.turno_atual, "x");
  assertEquals(resultado.adivinhou_evento_id, 3);
});
