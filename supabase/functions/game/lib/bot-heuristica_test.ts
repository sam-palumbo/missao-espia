import { assert, assertEquals } from "std/assert";
import { contemTermo, LEXICO, normalizar, TERMOS_SEGUROS } from "./bot-lexico.ts";
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

// Helper: pergunta pendente dirigida ao bot.
function perguntaAo(botApelido: string, texto: string) {
  return {
    perguntador_id: "j1",
    perguntador_apelido: "Sam",
    destinatario_id: "bot",
    destinatario_apelido: botApelido,
    texto,
  };
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

Deno.test("perguntaHeuristica: não repete pergunta já feita na rodada", () => {
  const base = ctx({
    historico: [resp("Sam", "Há alguém com você?", "tinha muita água e chuva")],
  });
  for (let i = 0; i < 20; i++) {
    assert(perguntaHeuristica(base)!.texto !== "Há alguém com você?");
  }
});

Deno.test("respostaHeuristica: não-espia cita termo do cenário e acompanha a pergunta", () => {
  const r = respostaHeuristica(ctx(), perguntaAo("Bot", "O que você está sentindo agora?"));
  assert(r && r.length > 0);
  // Cita algum termo do léxico de Davi/Golias sem entregar o nome do evento/local.
  const bag = normalizar(r!);
  const termos = LEXICO.get(14)!.filter((t) => !["davi", "golias", "vale", "ela"].includes(t));
  assert(termos.some((t) => contemTermo(bag, t)), `sem termo do cenário: ${r}`);
  assert(!["davi", "golias"].some((t) => bag.includes(t)), `entregou o evento: ${r}`);
});

Deno.test("respostaHeuristica: não repete detalhe que o próprio bot já citou", () => {
  // O bot já citou "funda" e "gigante"; a próxima resposta traz detalhe NOVO.
  const base = ctx({
    historico: [resp("Bot", "?", "a funda e o gigante estavam lá")],
  });
  for (let i = 0; i < 20; i++) {
    const bag = normalizar(respostaHeuristica(base, perguntaAo("Bot", "E então?"))!);
    assert(!bag.includes("funda") && !bag.includes("gigante"), `repetiu detalhe: ${bag}`);
  }
});

Deno.test("respostaHeuristica: espia com pistas fortes se mistura usando o evento deduzido", () => {
  const espia = ctx({
    souEspia: true,
    evento: null,
    palavras: [
      { jogador_id: "j1", apelido: "Sam", palavra: "gigante" },
      { jogador_id: "j2", apelido: "Ester", palavra: "funda" },
    ],
    historico: [resp("Sam", "O que viu?", "a pedra acertou a testa dele no vale")],
  });
  const r = respostaHeuristica(espia, perguntaAo("Bot", "O que mais chamou sua atenção?"));
  assert(r && r.length > 0);
  const bag = normalizar(r!);
  assert(
    LEXICO.get(14)!.some((t) => contemTermo(bag, t)),
    `espia não usou o evento deduzido: ${r}`,
  );
});

Deno.test("respostaHeuristica: espia sem pistas cita termo concreto seguro, nunca vazio", () => {
  const espia = ctx({ souEspia: true, evento: null });
  const r = respostaHeuristica(espia, perguntaAo("Bot", "Há algum perigo por perto?"));
  assert(r && r.length > 0);
  // Concreto mas não-comprometedor: um termo comum a vários eventos.
  const bag = normalizar(r!);
  assert(TERMOS_SEGUROS.some((t) => contemTermo(bag, t)), `resposta vazia de conteúdo: ${r}`);
});

Deno.test("respostaHeuristica: nunca cita verbo solto (agramatical nos moldes)", () => {
  // Léxico da Conversão de Paulo tem "perseguir" — pontua, mas não se cita.
  const base = ctx({ evento: { evento: "Conversão de Paulo", local: "Caminho de Damasco" } });
  for (let i = 0; i < 30; i++) {
    const bag = normalizar(respostaHeuristica(base, perguntaAo("Bot", "E então?"))!);
    assert(!/\bperseguir\b/.test(bag), `citou verbo: ${bag}`);
  }
});

Deno.test("respostaHeuristica: não-espia prefere termos discretos aos que entregam o evento", () => {
  // "funda" e "gigante" são exclusivos de Davi/Golias — entregam o par ao espia.
  for (let i = 0; i < 30; i++) {
    const bag = normalizar(respostaHeuristica(ctx(), perguntaAo("Bot", "E então?"))!);
    assert(!bag.includes("funda") && !bag.includes("gigante"), `entregou o evento: ${bag}`);
  }
});
