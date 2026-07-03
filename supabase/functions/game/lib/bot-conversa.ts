// ============================================================
// CONVERSA offline dos bots — perguntas e respostas por ângulo
// ============================================================
// Dá "escuta" à heurística (lib/bot-heuristica.ts), sem rede:
// classifica a pergunta recebida em um ÂNGULO (visão, pessoas,
// sentimento, perigo, ação, lugar, memória) por casamento de
// gatilhos e responde com um molde daquele ângulo — o não-espia
// encaixa um termo concreto do cenário; o espia sem palpite usa uma
// variação plausível e não-evasiva. Também escolhe a PRÓXIMA
// pergunta do bot: nunca repete um texto já usado na rodada e
// prefere um ângulo ainda não perguntado àquele destinatário.
// ============================================================

import { displayTermo, normalizar } from "./bot-lexico.ts";
import { aleatorio, PERGUNTAS_BOT, RESPOSTAS_ESPIA_BOT } from "./bot.ts";
import type { HistoricoItem } from "./types.ts";

// ── Flexão do termo citado ────────────────────────────────────
// Os moldes recebem o termo já flexionado (artigo por gênero/número e
// contrações com "de"/"em"), para a frase sair natural: "vi a funda",
// "lembro do gigante", "minha atenção ficou nas trombetas". Nenhum molde
// usa o termo como SUJEITO de verbo — assim plural nunca quebra concordância.

export interface TermoFlex {
  /** Com artigo: "a funda", "o Egito", "Maria". */
  com: string;
  /** Contraído com "de": "da funda", "do Egito", "de Maria". */
  de: string;
  /** Contraído com "em": "na funda", "no Egito", "em Maria". */
  em: string;
}

// Nomes próprios do léxico: citados capitalizados; a maioria dispensa artigo.
const PROPRIOS_SEM_ARTIGO = new Set([
  "adao", "arao", "atenas", "baal", "belem", "dario", "deus", "eli", "eva",
  "filipos", "israel", "jesus", "jose", "judas", "maria", "nabucodonosor",
  "ninive", "patmos", "samaria",
]);
const PROPRIOS_COM_O = new Set(["egito", "calvario", "areopago", "ararate", "pentecostes"]);

// Gênero que a regra da terminação erraria.
const MASCULINOS = new Set([
  "dia", "dias", "profeta", "profetas", "guardas", "enigmas", "idioma", "idiomas",
]);
const FEMININOS = new Set([
  "arvore", "bencao", "carruagens", "cidade", "confusao", "conversao",
  "correntes", "cruz", "destruicao", "escravidao", "escuridao", "fe", "fome",
  "grades", "lei", "luz", "morte", "mulher", "mulheres", "multidao", "nacao",
  "noite", "nuvem", "oracao", "prisao", "ressurreicao", "revelacao", "sede",
  "serpente", "tempestade", "traicao", "visao", "voz",
]);

/** Consulta uma lista de gênero aceitando a flexão plural ("noites" → "noite"). */
function generoNaLista(palavra: string, lista: Set<string>): boolean {
  return lista.has(palavra) || lista.has(palavra.replace(/s$/, "")) ||
    lista.has(palavra.replace(/oes$/, "ao"));
}

/** Artigo do termo (null = dispensa artigo, caso dos nomes próprios). */
function artigoDe(termo: string): string | null {
  if (PROPRIOS_SEM_ARTIGO.has(termo)) return null;
  if (PROPRIOS_COM_O.has(termo)) return "o";
  // Em frases o artigo segue o núcleo: a primeira palavra quando há "de"
  // ("a coluna de fogo"), senão a última ("os três dias").
  const partes = termo.split(" ");
  const palavra = partes.length > 1 && partes.includes("de") ? partes[0] : partes[partes.length - 1];
  const plural = palavra.endsWith("s");
  if (generoNaLista(palavra, MASCULINOS)) return plural ? "os" : "o";
  if (generoNaLista(palavra, FEMININOS)) return plural ? "as" : "a";
  if (plural) return palavra.endsWith("as") ? "as" : "os";
  return palavra.endsWith("a") ? "a" : "o";
}

function capitalizar(s: string): string {
  return s.split(" ").map((p) => p.charAt(0).toUpperCase() + p.slice(1)).join(" ");
}

/** Flexiona um termo normalizado do léxico para citação nos moldes. */
export function comFormas(termo: string): TermoFlex {
  const proprio = PROPRIOS_SEM_ARTIGO.has(termo) || PROPRIOS_COM_O.has(termo);
  const display = proprio ? capitalizar(displayTermo(termo)) : displayTermo(termo);
  const artigo = artigoDe(termo);
  return {
    com: artigo ? `${artigo} ${display}` : display,
    de: artigo ? `d${artigo} ${display}` : `de ${display}`,
    em: artigo ? `n${artigo} ${display}` : `em ${display}`,
  };
}

interface Angulo {
  nome: string;
  /** Gatilhos normalizados: frase casa por substring; palavra curta (≤3) casa
   * exata; palavra ≥4 casa por prefixo ("sent" pega "sentindo", "sentiu"). */
  gatilhos: string[];
  /** Perguntas prontas deste ângulo (servem a grupo e espia). */
  perguntas: string[];
  /** Respostas do não-espia: encaixam um termo concreto do cenário. */
  moldes: ((t: TermoFlex) => string)[];
  /** Respostas do espia sem palpite: plausíveis, jamais evasivas. */
  respostasEspia: string[];
}

// A ordem decide empates na classificação (o primeiro com mais gatilhos vence).
const ANGULOS: Angulo[] = [
  {
    nome: "visao",
    gatilhos: ["viu", "ver", "vendo", "olha", "olho", "enxerg", "observ", "chamou", "atencao", "aparencia", "detalhe", "perceb", "cena"],
    perguntas: [
      "O que mais chamou sua atenção quando você chegou?",
      "Você consegue ver algo importante daí?",
      "Teve algum detalhe que só você percebeu?",
    ],
    moldes: [
      (t) => `Vi ${t.com} logo que cheguei, impossível ignorar.`,
      (t) => `Não tinha como não reparar ${t.em}.`,
      (t) => `De onde eu estava, dava pra ver ${t.com} claramente.`,
    ],
    respostasEspia: [
      "Tinha tanta coisa acontecendo que era difícil focar num ponto só.",
      "Vi o principal, mas o movimento em volta me distraiu.",
    ],
  },
  {
    nome: "pessoas",
    gatilhos: ["quem", "alguem", "pessoa", "pessoas", "gente", "sozinho", "sozinha", "acompanhad", "reconhec", "conhec", "rosto"],
    perguntas: [
      "Há alguém com você?",
      "Você reconhece alguém aqui?",
      "Como estavam as pessoas ao seu redor?",
    ],
    moldes: [
      (t) => `Tinha gente ali, mas minha atenção ficou ${t.em}.`,
      (t) => `Todo mundo em volta só falava ${t.de}.`,
    ],
    respostasEspia: [
      "Tinha mais gente do que eu esperava por ali.",
      "Reconheci uns rostos, mas preferi ficar na minha.",
    ],
  },
  {
    nome: "sentimento",
    gatilhos: ["sent", "medo", "emocao", "emocion", "preocup", "assust", "coracao", "nervos", "mexeu"],
    perguntas: [
      "O que você está sentindo agora?",
      "Teve algum momento em que você sentiu medo?",
      "O que mexeu mais com você nisso tudo?",
    ],
    moldes: [
      (t) => `Senti um aperto quando vi ${t.com}.`,
      (t) => `Fiquei sem palavras diante ${t.de}.`,
    ],
    respostasEspia: [
      "Um misto de espanto e respeito, pra ser sincero.",
      "Confesso que o coração acelerou na hora.",
    ],
  },
  {
    nome: "perigo",
    gatilhos: ["perig", "risco", "segur", "ameac", "cuidado", "arrisc"],
    perguntas: [
      "Há algum perigo por perto?",
      "Havia algum risco de ficar por ali?",
      "Você precisou tomar cuidado com alguma coisa?",
    ],
    moldes: [
      (t) => `Tranquilo não era — ainda mais com ${t.com} ali.`,
      (t) => `O maior cuidado era por causa ${t.de}.`,
    ],
    respostasEspia: [
      "Relaxar por completo ali não dava, isso eu garanto.",
      "Quem estava atento via que não era lugar de descuido.",
    ],
  },
  {
    nome: "acao",
    gatilhos: ["fazer", "fazendo", "fez", "devemos", "acontec", "houve", "reagi", "reacao", "atitude"],
    perguntas: [
      "O que você acha que devemos fazer?",
      "O que todos em volta estavam fazendo?",
      "O que aconteceu logo antes de você chegar?",
    ],
    moldes: [
      (t) => `Tudo girava em torno ${t.de}, ninguém ficou parado.`,
      (t) => `Minha primeira reação foi por causa ${t.de}.`,
    ],
    respostasEspia: [
      "Cada um reagiu de um jeito — eu preferi observar primeiro.",
      "Aconteceu rápido demais pra resumir em uma frase.",
    ],
  },
  {
    nome: "lugar",
    gatilhos: ["lugar", "onde", "ambiente", "local", "cheiro", "cheira", "som", "sons", "barulho", "clima", "redor", "perto", "esteve", "assim"],
    perguntas: [
      "Você já esteve em um lugar assim antes?",
      "Que sons dava pra ouvir de onde você estava?",
      "Como você descreveria o ambiente ao redor?",
    ],
    moldes: [
      (t) => `Não dava pra descrever aquele lugar sem falar ${t.de}.`,
      (t) => `Logo que se chegava, já se esbarrava ${t.em}.`,
    ],
    respostasEspia: [
      "Era diferente de tudo que eu já tinha visto, difícil comparar.",
      "O ambiente pesava, dava pra sentir no ar.",
    ],
  },
  {
    nome: "memoria",
    gatilhos: ["lembr", "esquec", "marcou", "marcante", "antes", "passado", "familiar", "conex", "signific", "historia"],
    perguntas: [
      "Você se lembra de algo importante?",
      "O que desse dia você nunca vai esquecer?",
      "Isso te lembra alguma coisa do passado?",
    ],
    moldes: [
      (t) => `Até hoje penso naquilo e lembro ${t.de}.`,
      (t) => `Nunca mais me esqueci ${t.de}.`,
    ],
    respostasEspia: [
      "Tem coisas dali que não saem da cabeça, mesmo querendo.",
      "Me lembrou histórias que eu ouvia quando era menino.",
    ],
  },
];

// Ângulo-fallback quando nenhum gatilho casa: moldes genéricos que ainda
// provam vivência com um termo do cenário.
const GERAL: Angulo = {
  nome: "geral",
  gatilhos: [],
  perguntas: [
    "Você sabe por que estamos aqui?",
    "Isso faz parte de algo maior?",
  ],
  moldes: [
    (t) => `Sim, vi ${t.com} bem de perto.`,
    (t) => `Dava pra notar ${t.com} sem esforço.`,
    (t) => `Lembro ${t.de} como se fosse agora.`,
    (t) => `Aquilo tinha tudo a ver com ${t.com}, isso eu garanto.`,
    (t) => `Não dava pra tirar os olhos ${t.de}.`,
  ],
  respostasEspia: [...RESPOSTAS_ESPIA_BOT],
};

const TODOS_ANGULOS: Angulo[] = [...ANGULOS, GERAL];

function temGatilho(bag: string, gatilho: string): boolean {
  if (gatilho.includes(" ")) return bag.includes(gatilho);
  if (gatilho.length <= 3) return new RegExp(`\\b${gatilho}\\b`).test(bag);
  return new RegExp(`\\b${gatilho}`).test(bag);
}

/** Classifica a pergunta no ângulo com mais gatilhos presentes (senão, geral). */
export function classificarPergunta(texto: string): Angulo {
  const bag = normalizar(texto);
  let melhor = GERAL;
  let melhorHits = 0;
  for (const angulo of ANGULOS) {
    let hits = 0;
    for (const g of angulo.gatilhos) if (temGatilho(bag, g)) hits++;
    if (hits > melhorHits) { melhor = angulo; melhorHits = hits; }
  }
  return melhor;
}

/** Resposta que ACOMPANHA a pergunta: molde do ângulo dela + termo flexionado. */
export function moldarResposta(pergunta: string, termo: string): string {
  return aleatorio(classificarPergunta(pergunta).moldes)(comFormas(termo));
}

/** Resposta do espia sem palpite: plausível no ângulo da pergunta, sem termo. */
export function respostaEspiaSemPalpite(pergunta: string): string {
  return aleatorio(classificarPergunta(pergunta).respostasEspia);
}

/**
 * Próxima pergunta do bot: nunca repete texto já feito na rodada e prefere um
 * ângulo ainda não perguntado ao destinatário — cobre as dimensões do cenário
 * em vez de insistir na mesma. Recorre ao pool genérico se tudo já foi usado.
 */
export function escolherPergunta(historico: HistoricoItem[], destinatarioApelido: string): string {
  const feitas = new Set<string>();
  const angulosAoAlvo = new Set<string>();
  for (const h of historico) {
    if (!("pergunta" in h)) continue;
    feitas.add(normalizar(h.pergunta));
    if (h.destinatario_apelido === destinatarioApelido) {
      angulosAoAlvo.add(classificarPergunta(h.pergunta).nome);
    }
  }

  const ineditas: { texto: string; angulo: string }[] = [];
  for (const a of TODOS_ANGULOS) {
    for (const texto of a.perguntas) {
      if (!feitas.has(normalizar(texto))) ineditas.push({ texto, angulo: a.nome });
    }
  }
  const anguloNovo = ineditas.filter((p) => !angulosAoAlvo.has(p.angulo));
  const pool = anguloNovo.length ? anguloNovo : ineditas;
  return pool.length ? aleatorio(pool).texto : aleatorio(PERGUNTAS_BOT);
}
