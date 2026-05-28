import { assertEquals, assertThrows } from "std/assert";
import { assertRequired, calcularMinutosRodada } from "./utils.ts";

// ── assertRequired ────────────────────────────────────────────────

Deno.test("assertRequired: valor não-null → retorna o valor", () => {
  assertEquals(assertRequired("abc", "campo"), "abc");
  assertEquals(assertRequired(0, "zero"), 0);
  assertEquals(assertRequired(false, "bool"), false);
});

Deno.test("assertRequired: null → lança com nome do campo", () => {
  assertThrows(
    () => assertRequired(null, "apelido"),
    Error,
    "apelido",
  );
});

Deno.test("assertRequired: undefined → lança com nome do campo", () => {
  assertThrows(
    () => assertRequired(undefined, "rodada_id"),
    Error,
    "rodada_id",
  );
});

// ── calcularMinutosRodada ─────────────────────────────────────────

Deno.test("calcularMinutosRodada: usa duracao_minutos quando definida", () => {
  assertEquals(calcularMinutosRodada(7, 5, 1), 7);
  assertEquals(calcularMinutosRodada(3, 12, 3), 3);
  assertEquals(calcularMinutosRodada(20, 4, 1), 20);
});

Deno.test("calcularMinutosRodada: null usa fórmula 5 + jogadores - espias", () => {
  assertEquals(calcularMinutosRodada(null, 4, 1), 8);   // 5 + 4 - 1
  assertEquals(calcularMinutosRodada(null, 8, 2), 11);  // 5 + 8 - 2
  assertEquals(calcularMinutosRodada(null, 12, 3), 14); // 5 + 12 - 3
});

Deno.test("calcularMinutosRodada: undefined usa fórmula", () => {
  assertEquals(calcularMinutosRodada(undefined, 6, 1), 10); // 5 + 6 - 1
});
