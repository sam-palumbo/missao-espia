import { assertEquals, assert } from "std/assert";
import { escolherApelidoBot, eventoAleatorioId, NOMES_BOT, PALAVRAS_BOT } from "./bot.ts";
import { EVENTOS } from "./eventos.ts";

// ── escolherApelidoBot ────────────────────────────────────────────

Deno.test("escolherApelidoBot: sala vazia → primeiro nome do pool", () => {
  assertEquals(escolherApelidoBot([]), NOMES_BOT[0]);
});

Deno.test("escolherApelidoBot: pula nomes já usados (case-insensitive)", () => {
  assertEquals(escolherApelidoBot(["abraão", "Moisés"]), "Ester");
});

Deno.test("escolherApelidoBot: ignora apelidos humanos fora do pool", () => {
  assertEquals(escolherApelidoBot(["Samuel", "Abraão"]), "Moisés");
});

Deno.test("escolherApelidoBot: pool esgotado → numera a partir de 2", () => {
  const todos = [...NOMES_BOT];
  assertEquals(escolherApelidoBot(todos), "Abraão 2");
  assertEquals(escolherApelidoBot([...todos, "Abraão 2"]), "Moisés 2");
});

// ── pools ─────────────────────────────────────────────────────────

Deno.test("eventoAleatorioId: sempre retorna um id existente em EVENTOS", () => {
  const ids = new Set(EVENTOS.map((e) => e.id));
  for (let i = 0; i < 100; i++) assert(ids.has(eventoAleatorioId()));
});

Deno.test("PALAVRAS_BOT: nenhuma palavra contém espaço (regra do turno de palavras)", () => {
  for (const palavra of PALAVRAS_BOT) assert(!palavra.includes(" "), palavra);
});
