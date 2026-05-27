// ============================================================
// REGRAS DE NEGÓCIO do Missão Espia
// ============================================================
// Funções puras sobre EstadoRodada. Compartilhadas entre o backend
// (handlers) e o frontend (UI) via path alias @shared/regras.
//
// Sempre que uma regra aparecer nos dois lados, ela DEVE morar aqui.
// ============================================================

import type { EstadoRodada } from "./types.ts";

/**
 * É o primeiro turno da rodada? (Ninguém agiu ainda.)
 * - No turno de palavras: bloqueia acusação durante toda a fase.
 * - Fase de perguntas: bloqueia enquanto o histórico estiver vazio.
 */
export function isPrimeiroTurno(estado: EstadoRodada): boolean {
  if (estado.turno_palavras) return true;
  return estado.historico.length === 0;
}

/** O jogador é espia nesta rodada? */
export function isEspia(estado: EstadoRodada, jogadorId: string): boolean {
  return (estado.espia_ids ?? []).includes(jogadorId);
}

/**
 * O jogador foi removido de ordem_turnos (eliminado da rodada)?
 *
 * Use junto com `jogador.ativo === false` no frontend: durante a
 * race condition entre useGameState e usePlayers, qualquer um dos
 * dois sinais já basta para considerar o jogador fora da rodada.
 */
export function estaForaDoTurno(estado: EstadoRodada, jogadorId: string): boolean {
  return estado.ordem_turnos.length > 0 && !estado.ordem_turnos.includes(jogadorId);
}

/** É a vez deste jogador? */
export function isMeuTurno(estado: EstadoRodada, jogadorId: string): boolean {
  return estado.turno_atual === jogadorId;
}

/**
 * Todos os jogadores em ordem_turnos já disseram sua palavra?
 *
 * Usa ordem_turnos (definida no início da rodada) em vez de todos os
 * jogadores ativos: se um jogador entrar na sala depois que a rodada
 * começou ele não está em ordem_turnos e nunca poderia dizer a
 * palavra — o que travaria a fase indefinidamente.
 */
export function todosFalaramNaOrdem(
  palavrasTurno: { jogador_id: string }[],
  ordemTurnos: string[],
): boolean {
  if (ordemTurnos.length === 0) return false;
  const falaram = new Set(palavrasTurno.map((p) => p.jogador_id));
  return ordemTurnos.every((id) => falaram.has(id));
}
