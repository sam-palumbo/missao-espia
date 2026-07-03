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

import { normalizar } from "./bot-lexico.ts";
import { aleatorio, PERGUNTAS_BOT, RESPOSTAS_ESPIA_BOT } from "./bot.ts";
import type { HistoricoItem } from "./types.ts";

interface Angulo {
  nome: string;
  /** Gatilhos normalizados: frase casa por substring; palavra curta (≤3) casa
   * exata; palavra ≥4 casa por prefixo ("sent" pega "sentindo", "sentiu"). */
  gatilhos: string[];
  /** Perguntas prontas deste ângulo (servem a grupo e espia). */
  perguntas: string[];
  /** Respostas do não-espia: encaixam um termo concreto do cenário. */
  moldes: ((kw: string) => string)[];
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
      (kw) => `Vi ${kw} logo que cheguei, impossível ignorar.`,
      (kw) => `O que saltava aos olhos era ${kw}.`,
      (kw) => `De onde eu estava dava pra ver ${kw} claramente.`,
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
      (kw) => `Tinha gente ali, mas minha atenção ficou em ${kw}.`,
      (kw) => `Todo mundo em volta só comentava sobre ${kw}.`,
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
      (kw) => `Senti um aperto quando percebi ${kw}.`,
      (kw) => `Fiquei sem palavras diante de ${kw}.`,
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
      (kw) => `Tranquilo não era — ainda mais com ${kw} ali.`,
      (kw) => `O maior cuidado era por causa de ${kw}.`,
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
      (kw) => `Tudo girava em torno de ${kw}, ninguém ficou parado.`,
      (kw) => `Minha primeira reação foi por causa de ${kw}.`,
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
      (kw) => `O lugar se resumia numa coisa: ${kw}.`,
      (kw) => `Por todo lado ali se via ${kw}.`,
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
      (kw) => `O que ficou gravado pra mim foi ${kw}.`,
      (kw) => `Até hoje, penso naquilo e lembro de ${kw}.`,
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
    (kw) => `Sim, ${kw} estava bem ali, vi de perto.`,
    (kw) => `Dava pra notar ${kw} sem esforço.`,
    (kw) => `O que mais me marcou foi ${kw}.`,
    (kw) => `Lembro de ${kw} como se fosse agora.`,
    (kw) => `Tinha a ver com ${kw}, isso eu garanto.`,
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

/** Resposta que ACOMPANHA a pergunta: molde do ângulo dela + termo concreto. */
export function moldarResposta(pergunta: string, kw: string): string {
  return aleatorio(classificarPergunta(pergunta).moldes)(kw);
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
