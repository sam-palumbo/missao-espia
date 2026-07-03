import { assert, assertEquals, assertStringIncludes } from "std/assert";
import { descreverContexto, parseDuracaoSeg, vazouNomeEvento, type ContextoBotIA } from "./bot-ia.ts";

function ctxBase(overrides: Partial<ContextoBotIA> = {}): ContextoBotIA {
  return {
    apelido: "Abraão",
    souEspia: false,
    evento: { evento: "Dilúvio", local: "Arca de Noé" },
    jogadores: [{ id: "j1", apelido: "Sam" }, { id: "j2", apelido: "Ester" }],
    palavras: [],
    historico: [],
    tempoRestanteSeg: null,
    ...overrides,
  };
}

Deno.test("descreverContexto: não-espia recebe evento e local", () => {
  const texto = descreverContexto(ctxBase());
  assertStringIncludes(texto, "Dilúvio");
  assertStringIncludes(texto, "Arca de Noé");
  assertStringIncludes(texto, "Sam, Ester");
});

Deno.test("descreverContexto: espia nunca recebe o evento", () => {
  const texto = descreverContexto(ctxBase({ souEspia: true, evento: null }));
  assertStringIncludes(texto, "ESPIA");
  assert(!texto.includes("Dilúvio"));
});

Deno.test("descreverContexto: inclui palavras e histórico de perguntas e votações", () => {
  const texto = descreverContexto(ctxBase({
    palavras: [{ jogador_id: "j1", apelido: "Sam", palavra: "água" }],
    historico: [
      { turno_numero: 2, perguntador_apelido: "Sam", destinatario_apelido: "Ester", pergunta: "Você vê animais?", resposta: "Muitos." },
      { tipo: "votacao", acusado_apelido: "Ester", votos: [], resultado: "sobreviveu" },
      { tipo: "turno_presencial", turno_numero: 2, jogador_apelido: "Sam" },
    ],
  }));
  assertStringIncludes(texto, 'Sam: "água"');
  assertStringIncludes(texto, "Você vê animais?");
  assertStringIncludes(texto, "votação contra Ester");
});

Deno.test("descreverContexto: avisa quando o tempo está acabando", () => {
  const texto = descreverContexto(ctxBase({ tempoRestanteSeg: 40 }));
  assertStringIncludes(texto, "ACABANDO");
});

Deno.test("descreverContexto: tempo restante nulo não inclui a linha de tempo", () => {
  const texto = descreverContexto(ctxBase({ tempoRestanteSeg: null }));
  assert(!texto.includes("Tempo restante"));
});

Deno.test("vazouNomeEvento: detecta palavra do nome do evento/local, com plural e sem acento", () => {
  const ctx = ctxBase(); // Dilúvio / Arca de Noé
  assert(vazouNomeEvento(ctx, "Você acha que o diluvio vai durar muito?"));
  assert(vazouNomeEvento(ctx, "Quantas arcas você já viu na vida?"));
  assert(!vazouNomeEvento(ctx, "Você viu os animais entrando em pares?"));
});

Deno.test("vazouNomeEvento: não confunde prefixo com palavra do nome", () => {
  const ctx = ctxBase({ evento: { evento: "Travessia do Mar Vermelho", local: "Mar Vermelho" } });
  assert(!vazouNomeEvento(ctx, "Foi um momento marcante pra você?")); // "mar" ≠ "marcante"
  assert(vazouNomeEvento(ctx, "O mar estava agitado?"));
});

Deno.test("vazouNomeEvento: espia não conhece o par, nada a vazar", () => {
  assert(!vazouNomeEvento(ctxBase({ souEspia: true, evento: null }), "diluvio"));
});

Deno.test("parseDuracaoSeg: segundos puros (formato retry-after)", () => {
  assertEquals(parseDuracaoSeg("12"), 12);
  assertEquals(parseDuracaoSeg("0"), 0);
});

Deno.test("parseDuracaoSeg: duração da Groq com unidades", () => {
  assertEquals(parseDuracaoSeg("7.66s"), 7.66);
  assertEquals(parseDuracaoSeg("500ms"), 0.5);
  assertEquals(parseDuracaoSeg("1m2.5s"), 62.5); // ms vs m não devem se confundir
  assertEquals(parseDuracaoSeg("2m"), 120);
});

Deno.test("parseDuracaoSeg: vazio ou não reconhecido vira null", () => {
  assertEquals(parseDuracaoSeg(null), null);
  assertEquals(parseDuracaoSeg(""), null);
  assertEquals(parseDuracaoSeg("sei lá"), null);
});
