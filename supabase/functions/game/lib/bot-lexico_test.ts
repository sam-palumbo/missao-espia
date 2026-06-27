import { assert, assertEquals } from "std/assert";
import {
  eventoIdPorNome,
  LEXICO,
  normalizar,
  pontuarEvento,
  rankearEventos,
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

Deno.test("pontuarEvento: conta termos do léxico presentes na fala", () => {
  // Davi/Golias (14): "gigante", "funda", "pedra" são termos do léxico.
  const bag = normalizar("o gigante caiu com a pedra da funda");
  assert(pontuarEvento(bag, 14) >= 3);
  // Mesma fala não deve aderir a um evento sem relação (ex.: 21 Água em Vinho).
  assert(pontuarEvento(bag, 14) > pontuarEvento(bag, 21));
});

Deno.test("pontuarEvento: casa plural por início de palavra (peixe → peixes)", () => {
  assert(pontuarEvento(normalizar("vi muitos peixes no mar"), 17) >= 1);
});

Deno.test("rankearEventos: o evento certo lidera com pistas coerentes", () => {
  const bag = normalizar("tinha água que virou vinho na festa de casamento");
  const ranking = rankearEventos(bag);
  assertEquals(ranking[0].id, 21); // Milagre da Água em Vinho
});
