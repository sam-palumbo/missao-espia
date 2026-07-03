import { assert, assertEquals } from "std/assert";
import {
  eventoIdPorNome,
  LEXICO,
  normalizar,
  pesoTermo,
  pontuarEvento,
  rankearEventos,
  TERMOS_SEGUROS,
} from "./bot-lexico.ts";
import { EVENTOS } from "./eventos.ts";

Deno.test("normalizar: minúsculas, sem acentos e sem pontuação", () => {
  assertEquals(normalizar("Jericó!"), "jerico");
  assertEquals(normalizar("Mar  Vermelho."), "mar vermelho");
  assertEquals(normalizar("ÁGUA, fogo"), "agua fogo");
});

Deno.test("LEXICO: todo evento tem termos e inclui palavras do próprio nome", () => {
  for (const ev of EVENTOS) {
    const termos = LEXICO.get(ev.id);
    assert(termos && termos.length > 0, `evento ${ev.id} sem léxico`);
  }
  // "muralha" vem do nome do evento 11 (Queda das Muralhas de Jericó).
  assert(LEXICO.get(11)!.includes("muralha"));
});

Deno.test("eventoIdPorNome: resolve pelo nome exato do evento", () => {
  assertEquals(eventoIdPorNome("Dilúvio"), 2);
  assertEquals(eventoIdPorNome("davi derrota golias"), 14);
  assertEquals(eventoIdPorNome("Evento Inexistente"), null);
});

Deno.test("pontuarEvento: soma pesos dos termos do léxico presentes na fala", () => {
  // Davi/Golias (14): "gigante" e "funda" são exclusivos (peso 1);
  // "pedra" é compartilhado com outros eventos (peso menor).
  const bag = normalizar("o gigante caiu com a pedra da funda");
  assert(pontuarEvento(bag, 14) >= 2);
  // Mesma fala não deve aderir a um evento sem relação (ex.: 21 Água em Vinho).
  assert(pontuarEvento(bag, 14) > pontuarEvento(bag, 21));
});

Deno.test("TERMOS_SEGUROS: só termos compartilhados por 3+ eventos (nada exclusivo)", () => {
  assert(TERMOS_SEGUROS.length >= 5, `pool pequeno demais: ${TERMOS_SEGUROS.length}`);
  assert(TERMOS_SEGUROS.includes("fogo"));
  assert(!TERMOS_SEGUROS.includes("funda")); // exclusivo de Davi/Golias
  for (const t of TERMOS_SEGUROS) assert(pesoTermo(t) <= 0.5, `termo pouco compartilhado: ${t}`);
});

Deno.test("pesoTermo: termo exclusivo pesa 1; termo comum a vários eventos pesa menos", () => {
  assertEquals(pesoTermo("funda"), 1); // só em Davi/Golias
  assert(pesoTermo("fogo") <= 0.5, `"fogo" deveria pesar pouco: ${pesoTermo("fogo")}`);
  assert(pesoTermo("anjo") <= 0.5, `"anjo" deveria pesar pouco: ${pesoTermo("anjo")}`);
});

Deno.test("pesoTermo: flexões contam como o mesmo termo entre eventos", () => {
  // "pastor" (Davi/Golias) e "pastores" (Nascimento) são a mesma família.
  assert(pesoTermo("pastor") < 1, `"pastor" deveria ser compartilhado: ${pesoTermo("pastor")}`);
  assert(pesoTermo("pastores") < 1, `"pastores" deveria ser compartilhado: ${pesoTermo("pastores")}`);
});

Deno.test("LEXICO: expansão traz os termos novos", () => {
  assert(LEXICO.get(14)!.includes("armadura"));
  assert(LEXICO.get(26)!.includes("vinagre"));
  assert(LEXICO.get(32)!.includes("dragao")); // normalizado
});

Deno.test("pontuarEvento: casa plural por início de palavra (peixe → peixes)", () => {
  assert(pontuarEvento(normalizar("vi muitos peixes no mar"), 17) >= 1);
});

Deno.test("rankearEventos: o evento certo lidera com pistas coerentes", () => {
  const bag = normalizar("tinha água que virou vinho na festa de casamento");
  const ranking = rankearEventos(bag);
  assertEquals(ranking[0].id, 21); // Milagre da Água em Vinho
});
