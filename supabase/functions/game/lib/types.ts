// supabase/functions/game/lib/types.ts

export type SalaStatus = "aguardando" | "jogando" | "encerrada";
export type FaseJogo = "jogando" | "votacao" | "adivinhacao" | "resultado";

export interface Sala {
  id: string;
  codigo: string;
  anfitriao: string | null;
  status: SalaStatus;
  num_rodadas: number;
  rodada_atual: number;
  senha_hash: string | null;
  criada_em: string;
}

export interface Jogador {
  id: string;
  sala_id: string;
  user_id: string | null;
  apelido: string;
  pontuacao: number;
  ativo: boolean;
  conectado: boolean;
  entrou_em: string;
}

export interface EstadoRodada {
  fase: FaseJogo;
  turno_atual: string;
  ordem_turnos: string[];
  espia_ids: string[];
  timer_end: string;
  eliminacoes_erradas: number;
  acusado_id: string | null;
  adivinhou_evento_id: number | null;
}

export interface Rodada {
  id: string;
  sala_id: string;
  numero: number;
  evento_id: number;
  estado: EstadoRodada;
  iniciada_em: string;
  encerrada_em: string | null;
}

export interface CriarSalaPayload {
  apelido: string;
  num_rodadas: number;
  senha?: string;
}

export interface EntrarSalaPayload {
  codigo: string;
  apelido: string;
  senha?: string;
}

export interface IniciarRodadaPayload {
  sala_id: string;
}

export interface ProximoTurnoPayload {
  rodada_id: string;
}

export interface AcusarPayload {
  rodada_id: string;
  acusado_id: string;
}

export interface VotarPayload {
  rodada_id: string;
  aprovado: boolean;
}

export interface AdivinharPayload {
  rodada_id: string;
  evento_id: number;
}

export type GameResponse<T = Record<string, unknown>> =
  | { data: T; error?: never }
  | { error: string; data?: never };
