import { assert, assertEquals } from "std/assert";
import {
  classificarPergunta,
  comFormas,
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

Deno.test("moldarResposta: embute o termo flexionado e segue o ângulo da pergunta", () => {
  const r = moldarResposta("O que você está sentindo agora?", "trombetas");
  assert(r.includes("trombetas"), `termo ausente: ${r}`);
  const t = comFormas("trombetas");
  assert(classificarPergunta("O que você está sentindo agora?").moldes.some((m) => m(t) === r));
});

Deno.test("comFormas: artigo por gênero/número, contrações e acentos", () => {
  assertEquals(comFormas("funda"), { com: "a funda", de: "da funda", em: "na funda" });
  assertEquals(comFormas("gigante"), { com: "o gigante", de: "do gigante", em: "no gigante" });
  assertEquals(comFormas("trombetas").com, "as trombetas");
  assertEquals(comFormas("soldados").de, "dos soldados");
  // Display devolve a forma acentuada; gênero irregular vem da lista.
  assertEquals(comFormas("multidao").com, "a multidão");
  assertEquals(comFormas("arvore").em, "na árvore");
  assertEquals(comFormas("noite").com, "a noite");
  // Frases flexionam pela última palavra.
  assertEquals(comFormas("tres dias").com, "os três dias");
});

Deno.test("comFormas: frases flexionam pelo núcleo e plurais femininos acertam o artigo", () => {
  assertEquals(comFormas("coluna de fogo").com, "a coluna de fogo"); // núcleo antes do "de"
  assertEquals(comFormas("quarenta noites").com, "as quarenta noites"); // "noites" → "noite" (feminino)
  assertEquals(comFormas("guardas").com, "os guardas"); // masculino apesar do -as
  assertEquals(comFormas("carruagens").com, "as carruagens");
});

Deno.test("comFormas: nomes próprios capitalizados, com e sem artigo", () => {
  assertEquals(comFormas("maria"), { com: "Maria", de: "de Maria", em: "em Maria" });
  assertEquals(comFormas("egito"), { com: "o Egito", de: "do Egito", em: "no Egito" });
  assertEquals(comFormas("deus").de, "de Deus");
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
