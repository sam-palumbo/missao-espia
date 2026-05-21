import { assertEquals } from "std/assert";
import { calcularPontuacao } from "./pontuacao.ts";

Deno.test("espia não pego e adivinhou → 3 pts espia, 0 grupo", () => {
  const r = calcularPontuacao({ espiaPego: false, espiaAdivinhou: true });
  assertEquals(r, { pontoEspia: 3, pontoGrupo: 0 });
});

Deno.test("espia não pego e não adivinhou → 2 pts espia, 0 grupo", () => {
  const r = calcularPontuacao({ espiaPego: false, espiaAdivinhou: false });
  assertEquals(r, { pontoEspia: 2, pontoGrupo: 0 });
});

Deno.test("espia pego e adivinhou → 1 pt espia, 0 grupo", () => {
  const r = calcularPontuacao({ espiaPego: true, espiaAdivinhou: true });
  assertEquals(r, { pontoEspia: 1, pontoGrupo: 0 });
});

Deno.test("espia pego e não adivinhou → 0 pts espia, 1 pt/membro grupo", () => {
  const r = calcularPontuacao({ espiaPego: true, espiaAdivinhou: false });
  assertEquals(r, { pontoEspia: 0, pontoGrupo: 1 });
});
