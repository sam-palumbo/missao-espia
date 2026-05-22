import { assertEquals, assertThrows } from "std/assert";
import { classificarResultadoVotacao, resolverVotacao, validarVoto } from "./votacao.ts";

// ── resolverVotacao ────────────────────────────────────────────

Deno.test("aguarda quando nem todos votaram", () => {
  const resultado = resolverVotacao(
    [{ aprovado: true }],
    /* totalElegiveis */ 3,
  );
  assertEquals(resultado, "aguardando");
});

Deno.test("rejeita quando não há maioria simples", () => {
  // 2 aprovam, 3 rejeitam → maioria (3) rejeitou
  const resultado = resolverVotacao(
    [{ aprovado: true }, { aprovado: true }, { aprovado: false }, { aprovado: false }, { aprovado: false }],
    5,
  );
  assertEquals(resultado, "rejeitado");
});

Deno.test("rejeita com empate exato (maioria exige mais da metade)", () => {
  // 2 x 2 → não é maioria (precisa de > metade, não >=)
  const resultado = resolverVotacao(
    [{ aprovado: true }, { aprovado: true }, { aprovado: false }, { aprovado: false }],
    4,
  );
  assertEquals(resultado, "rejeitado");
});

Deno.test("aprova quando há maioria simples", () => {
  // 2 aprovam, 1 rejeita → maioria aprovou
  const resultado = resolverVotacao(
    [{ aprovado: true }, { aprovado: true }, { aprovado: false }],
    3,
  );
  assertEquals(resultado, "aprovado");
});

Deno.test("aprova com unanimidade", () => {
  const resultado = resolverVotacao(
    [{ aprovado: true }, { aprovado: true }, { aprovado: true }],
    3,
  );
  assertEquals(resultado, "aprovado");
});

Deno.test("aguarda quando nenhum votou ainda", () => {
  const resultado = resolverVotacao([], 4);
  assertEquals(resultado, "aguardando");
});

// ── validarVoto ────────────────────────────────────────────────

Deno.test("lança erro quando jogador já votou nesta acusação", () => {
  const votosExistentes = [
    { votante_id: "jogador-1", acusado_id: "acusado-A" },
  ];
  assertThrows(
    () => validarVoto(votosExistentes, "jogador-1", "acusado-A"),
    Error,
    "já votou",
  );
});

Deno.test("não lança erro quando jogador vota em acusação diferente", () => {
  // Bug corrigido: mesma rodada, acusado diferente → deve permitir
  const votosExistentes = [
    { votante_id: "jogador-1", acusado_id: "acusado-A" },
  ];
  // não deve lançar
  validarVoto(votosExistentes, "jogador-1", "acusado-B");
});

Deno.test("não lança erro quando jogador ainda não votou", () => {
  validarVoto([], "jogador-1", "acusado-A");
});

Deno.test("não lança erro quando outro jogador votou no mesmo acusado", () => {
  const votosExistentes = [
    { votante_id: "jogador-2", acusado_id: "acusado-A" },
  ];
  validarVoto(votosExistentes, "jogador-1", "acusado-A");
});

// ── classificarResultadoVotacao ────────────────────────────────

Deno.test("votação rejeitada → acusado sobreviveu", () => {
  assertEquals(
    classificarResultadoVotacao("rejeitado", /* acusadoEhEspia */ false),
    "sobreviveu",
  );
});

Deno.test("votação rejeitada com acusado espia → sobreviveu (não houve eliminação)", () => {
  assertEquals(
    classificarResultadoVotacao("rejeitado", /* acusadoEhEspia */ true),
    "sobreviveu",
  );
});

Deno.test("votação aprovada + acusado é espia → espia_pego", () => {
  assertEquals(
    classificarResultadoVotacao("aprovado", /* acusadoEhEspia */ true),
    "espia_pego",
  );
});

Deno.test("votação aprovada + acusado não é espia → eliminado", () => {
  assertEquals(
    classificarResultadoVotacao("aprovado", /* acusadoEhEspia */ false),
    "eliminado",
  );
});
