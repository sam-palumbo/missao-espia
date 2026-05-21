import { assertEquals } from "std/assert";
import { numEspias, limiteEliminacoesErradas } from "./espias.ts";

Deno.test("4-6 jogadores → 1 espia", () => {
  assertEquals(numEspias(4), 1);
  assertEquals(numEspias(6), 1);
});

Deno.test("7-9 jogadores → 2 espias", () => {
  assertEquals(numEspias(7), 2);
  assertEquals(numEspias(9), 2);
});

Deno.test("10-12 jogadores → 3 espias", () => {
  assertEquals(numEspias(10), 3);
  assertEquals(numEspias(12), 3);
});

Deno.test("4 jogadores → 0 eliminações erradas permitidas", () => {
  assertEquals(limiteEliminacoesErradas(4, 1), 0);
});

Deno.test("6 jogadores, 1 espia → 1 eliminação errada permitida", () => {
  assertEquals(limiteEliminacoesErradas(6, 1), 1);
});
