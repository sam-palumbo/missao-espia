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
 * - Em primeira rodada: ninguém disse palavra.
 * - Em rodada normal: histórico vazio.
 */
export function isPrimeiroTurno(estado: EstadoRodada): boolean {
  return estado.primeira_rodada
    ? (estado.palavras_primeira_rodada?.length ?? 0) === 0
    : estado.historico.length === 0;
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
