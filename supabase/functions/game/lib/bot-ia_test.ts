import { assert, assertStringIncludes } from "std/assert";
import { descreverContexto, type ContextoBotIA } from "./bot-ia.ts";

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
