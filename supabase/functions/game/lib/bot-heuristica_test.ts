import { assert, assertEquals } from "std/assert";
import type { ContextoBotIA } from "./bot-ia.ts";
import {
  acusadoHeuristica,
  acusarDeflexaoHeuristica,
  adivinhacaoHeuristica,
  palavraHeuristica,
  perguntaHeuristica,
  respostaHeuristica,
  votoHeuristica,
} from "./bot-heuristica.ts";

function ctx(overrides: Partial<ContextoBotIA> = {}): ContextoBotIA {
  return {
    apelido: "Bot",
    souEspia: false,
    evento: { evento: "Davi derrota Golias", local: "Vale de Elá" },
    jogadores: [{ id: "j1", apelido: "Sam" }, { id: "j2", apelido: "Ester" }],
    palavras: [],
    historico: [],
    tempoRestanteSeg: null,
    ...overrides,
  };
}

// Helper: monta uma resposta no histórico.
function resp(destinatario_apelido: string, pergunta: string, resposta: string) {
  return { turno_numero: 2, perguntador_apelido: "Bot", destinatario_apelido, pergunta, resposta };
}

Deno.test("adivinhacaoHeuristica: sem pistas retorna null (espia segue escondido)", () => {
  const espia = ctx({ souEspia: true, evento: null, palavras: [], historico: [] });
  assertEquals(adivinhacaoHeuristica(espia), null);
});

Deno.test("adivinhacaoHeuristica: pistas coerentes apontam o par certo com confiança alta", () => {
  const espia = ctx({
    souEspia: true,
    evento: null,
    palavras: [
      { jogador_id: "j1", apelido: "Sam", palavra: "gigante" },
      { jogador_id: "j2", apelido: "Ester", palavra: "funda" },
    ],
    historico: [resp("Sam", "O que viu?", "uma pedra acertou a testa do gigante no vale")],
  });
  const palpite = adivinhacaoHeuristica(espia);
  assert(palpite, "deveria palpitar");
  assertEquals(palpite!.evento_id, 14);
  assert(palpite!.confianca >= 70, `confiança baixa: ${palpite!.confianca}`);
});

Deno.test("acusadoHeuristica: aponta quem não adere ao cenário verdadeiro", () => {
  // Sam fala on-theme (conhece); Ester fala off-theme (espia).
  const grupo = ctx({
    palavras: [
      { jogador_id: "j1", apelido: "Sam", palavra: "pedra" },
      { jogador_id: "j2", apelido: "Ester", palavra: "barco" },
    ],
    historico: [
      resp("Sam", "?", "o gigante caiu no vale com a funda"),
      resp("Ester", "?", "tinha muita água e chuva por ali"),
    ],
  });
  const out = acusadoHeuristica(grupo);
  assert(out, "deveria apontar suspeito");
  assertEquals(out!.acusado_id, "j2"); // Ester
  assert(out!.confianca >= 65, `confiança baixa: ${out!.confianca}`);
});

Deno.test("acusadoHeuristica: null quando ninguém falou ainda", () => {
  assertEquals(acusadoHeuristica(ctx()), null);
});

Deno.test("votoHeuristica: grupo aprova eliminar acusado off-theme, rejeita on-theme", () => {
  const base = ctx({
    historico: [
      resp("Sam", "?", "o gigante caiu no vale com a funda e a pedra"),
      resp("Ester", "?", "tinha muita água e chuva"),
    ],
  });
  assertEquals(votoHeuristica(base, "Ester"), true);  // off-theme → suspeito
  assertEquals(votoHeuristica(base, "Sam"), false);   // on-theme → inocente
});

Deno.test("votoHeuristica: sem falas do acusado, não elimina", () => {
  assertEquals(votoHeuristica(ctx(), "Sam"), false);
});

Deno.test("votoHeuristica: espia sempre devolve um booleano (deflexão)", () => {
  const v = votoHeuristica(ctx({ souEspia: true, evento: null }), "Sam");
  assertEquals(typeof v, "boolean");
});

Deno.test("acusarDeflexaoHeuristica: espia mira quem mais o pressionou", () => {
  const espia = ctx({
    souEspia: true,
    evento: null,
    historico: [
      { turno_numero: 2, perguntador_apelido: "Ester", destinatario_apelido: "Bot", pergunta: "?", resposta: "..." },
      { turno_numero: 2, perguntador_apelido: "Ester", destinatario_apelido: "Bot", pergunta: "?", resposta: "..." },
    ],
  });
  assertEquals(acusarDeflexaoHeuristica(espia)?.acusado_id, "j2"); // Ester
});

Deno.test("palavraHeuristica: não-espia evita palavras do nome do evento/local", () => {
  const p = palavraHeuristica(ctx());
  assert(p, "deveria escolher palavra");
  // "davi", "golias", "vale", "ela" são óbvias (vêm do nome) e não podem sair.
  assert(!["davi", "golias", "vale", "ela"].includes(p!), `palavra óbvia: ${p}`);
});

Deno.test("perguntaHeuristica: devolve destinatário válido e texto", () => {
  const q = perguntaHeuristica(ctx());
  assert(q);
  assert(["j1", "j2"].includes(q!.destinatario_id));
  assert(q!.texto.length > 0);
});

Deno.test("respostaHeuristica: não-espia produz texto não-vazio", () => {
  const r = respostaHeuristica(ctx());
  assert(r && r.length > 0);
});
