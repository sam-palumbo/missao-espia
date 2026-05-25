// ============================================================
// TIPOS do Missão Espia (lado web)
// ============================================================
// Os tipos compartilhados (Sala, Jogador, EstadoRodada, etc) vivem em:
//   supabase/functions/game/lib/types.ts  ← FONTE DA VERDADE
// e são reexportados aqui via path alias @shared/*.
// Mantenha apenas tipos específicos do web abaixo.
// ============================================================

export * from "@shared/types";

import type { Jogador, EstadoRodada } from "@shared/types";

// Alias semântico usado pela UI (lista de jogadores).
export interface Player extends Jogador {}

// Subset de Rodada usado pelo hook useGameState — não traz sala_id nem iniciada_em.
export interface RodadaAtual {
  id: string;
  numero: number;
  evento_id: number;
  estado: EstadoRodada;
  encerrada_em: string | null;
}
