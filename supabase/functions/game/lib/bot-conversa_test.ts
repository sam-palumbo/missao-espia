import { assert, assertEquals } from "std/assert";
import {
  classificarPergunta,
  escolherPergunta,
  moldarResposta,
  respostaEspiaSemPalpite,
} from "./bot-conversa.ts";
import type { HistoricoItem } from "./types.ts";

Deno.test("classificarPergunta: identifica o ângulo pelos gatilhos", () => {
  assertEquals(classificarPergunta("O que você está sentindo agora?").nome, "sentimento");
  assertEquals(classificarPergunta("Há alguém com você?").nome, "pessoas");
  assertEquals(classificarPergunta("Que sons dava pra ouvir de onde você estava?").nome, "lugar");
  assertEquals(classificarPergunta("Há algum perigo por perto?").nome, "perigo");
});

Deno.test("classificarPergunta: sem gatilho cai no ângulo geral", () => {
  assertEquals(classificarPergunta("Hmm, e então?").nome, "geral");
});

Deno.test("classificarPergunta: as perguntas de cada ângulo classificam nele mesmo", () => {
  // Garante coerência: a rotação de ângulos por destinatário depende disso.
  for (const nome of ["visao", "pessoas", "sentimento", "perigo", "acao", "lugar", "memoria"]) {
    const angulo = classificarPergunta(
      { visao: "Teve algum detalhe que só você percebeu?",
        pessoas: "Como estavam as pessoas ao seu redor?",
        sentimento: "Teve algum momento em que você sentiu medo?",
        perigo: "Você precisou tomar cuidado com alguma coisa?",
        acao: "O que todos em volta estavam fazendo?",
        lugar: "Como você descreveria o ambiente ao redor?",
        memoria: "O que desse dia você nunca vai esquecer?" }[nome]!,
    );
    assertEquals(angulo.nome, nome);
  }
});

Deno.test("moldarResposta: embute o termo e segue o ângulo da pergunta", () => {
  const r = moldarResposta("O que você está sentindo agora?", "trombetas");
  assert(r.includes("trombetas"), `termo ausente: ${r}`);
  assert(classificarPergunta("O que você está sentindo agora?").moldes.some((m) => m("trombetas") === r));
});

Deno.test("respostaEspiaSemPalpite: plausível dentro do ângulo da pergunta", () => {
  const pergunta = "Há algum perigo por perto?";
  const r = respostaEspiaSemPalpite(pergunta);
  assert(classificarPergunta(pergunta).respostasEspia.includes(r));
});

Deno.test("escolherPergunta: não repete texto e troca de ângulo para o mesmo alvo", () => {
  const historico: HistoricoItem[] = [{
    turno_numero: 2,
    perguntador_apelido: "Bot",
    destinatario_apelido: "Sam",
    pergunta: "Há alguém com você?",
    resposta: "...",
  }];
  for (let i = 0; i < 20; i++) {
    const texto = escolherPergunta(historico, "Sam");
    assert(texto !== "Há alguém com você?", "repetiu pergunta já feita");
    assert(classificarPergunta(texto).nome !== "pessoas", `repetiu ângulo: ${texto}`);
  }
  // Para OUTRO alvo, o ângulo "pessoas" segue disponível (só o texto é vetado).
  const textos = new Set(Array.from({ length: 200 }, () => escolherPergunta(historico, "Ester")));
  assert([...textos].some((t) => classificarPergunta(t).nome === "pessoas"));
});
