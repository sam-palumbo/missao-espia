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

export const RESPOSTAS_BOT = [
  "Não tenho certeza...",
  "Acho que sim.",
  "Talvez.",
  "Não sei ao certo.",
  "É possível.",
  "Não posso dizer com certeza.",
  "Depende.",
  "Não é tão simples assim.",
  "Não tenho informações suficientes.",
  "Prefiro não comentar.",
  "É complicado explicar.",
  "Não posso revelar muito.",
  "Não sei o que pensar.",
  "É uma boa pergunta.",
  "Não tenho certeza sobre isso.",
] as const;

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
