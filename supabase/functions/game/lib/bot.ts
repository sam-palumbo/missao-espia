// ============================================================
// BOTS do Missão Espia
// ============================================================
// Pools de conteúdo e helpers puros usados pelos handlers
// adicionar-bot e bot-agir. Lógica portada de scripts/bots.mjs
// para que o anfitrião possa adicionar bots pelo lobby.
// ============================================================

import { EVENTOS } from "./eventos.ts";

export const NOMES_BOT = [
  "Abraão", "Moisés", "Ester", "Rute", "Maria",
  "Pedro", "Paulo", "Joana", "Tiago", "Rebeca",
  "Débora", "Sansão", "Elias", "Jonas", "Daniel",
] as const;

// Palavras para o turno de palavras (sempre uma única palavra)
export const PALAVRAS_BOT = [
  "água", "fogo", "monte", "mar", "deserto", "jardim", "templo",
  "anjo", "profeta", "rei", "povo", "tribo", "cidade", "muralha",
  "espada", "escudo", "arco", "flecha", "cordeiro", "pão", "vinho",
  "oração", "milagre", "promessa", "aliança", "lei", "mandamento",
  "fé", "esperança", "amor", "graça", "salvação", "vida", "morte",
] as const;

export const PERGUNTAS_BOT = [
  "O que você está sentindo agora?",
  "Você consegue ver algo importante?",
  "Há alguém com você?",
  "O que aconteceu antes de você chegar aqui?",
  "Você sabe por que estamos aqui?",
  "Isso é familiar para você?",
  "Você já esteve em um lugar assim?",
  "O que você acha que devemos fazer?",
  "Há algum perigo por perto?",
  "Você reconhece alguém aqui?",
  "Isso faz parte de algo maior?",
  "Você se lembra de algo importante?",
  "O que esse lugar significa para você?",
  "Você está preocupado com algo?",
  "Isso tem alguma conexão com o passado?",
] as const;

// Fallbacks de resposta usados quando a IA está indisponível ou limitada
// (rate limit da Groq). Propositalmente NÃO-evasivos: respostas vazias como
// "não sei/talvez/depende" entregam o espia e fazem o não-espia parecer espia.
// Sem o contexto do evento são genéricas, mas soam engajadas/plausíveis.
export const RESPOSTAS_GRUPO_BOT = [
  "Sim, lembro bem — foi um momento marcante.",
  "Estava tudo muito intenso ali, vi de perto.",
  "Nunca vou esquecer o que aconteceu naquele lugar.",
  "Senti que algo grande estava acontecendo.",
  "Tinha gente por todo lado, foi impressionante.",
  "Foi uma das cenas mais fortes que já vi.",
  "Dava para sentir a tensão no ar.",
  "Cheguei e logo entendi a importância daquilo.",
] as const;

export const RESPOSTAS_ESPIA_BOT = [
  "Foi uma experiência e tanto, sinceramente.",
  "Você tinha que estar lá para entender.",
  "Aconteceu tanta coisa que nem sei por onde começar.",
  "Foi bem mais do que eu esperava.",
  "Olha, marcou bastante, isso eu garanto.",
  "Tem coisas ali que ficam com a gente.",
  "No fim, valeu cada segundo.",
] as const;

export function respostaFallback(souEspia: boolean): string {
  return aleatorio(souEspia ? RESPOSTAS_ESPIA_BOT : RESPOSTAS_GRUPO_BOT);
}

export function aleatorio<T>(lista: readonly T[]): T {
  return lista[Math.floor(Math.random() * lista.length)];
}

export function eventoAleatorioId(): number {
  return aleatorio(EVENTOS).id;
}

/**
 * Escolhe o apelido do próximo bot: primeiro nome do pool ainda não usado
 * na sala. Se todos estiverem em uso, numera a partir do início do pool
 * ("Abraão 2", "Abraão 3", ...) até achar um livre.
 */
export function escolherApelidoBot(apelidosExistentes: string[]): string {
  const usados = new Set(apelidosExistentes.map((a) => a.trim().toLowerCase()));
  const livre = NOMES_BOT.find((n) => !usados.has(n.toLowerCase()));
  if (livre) return livre;
  for (let sufixo = 2; ; sufixo++) {
    for (const nome of NOMES_BOT) {
      const candidato = `${nome} ${sufixo}`;
      if (!usados.has(candidato.toLowerCase())) return candidato;
    }
  }
}
