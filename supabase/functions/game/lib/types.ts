// supabase/functions/game/lib/types.ts

export type SalaStatus = "aguardando" | "jogando" | "encerrada";
export type FaseJogo = "jogando" | "aguardando_resposta" | "votacao" | "adivinhacao" | "resultado";

export interface PerguntaAtual {
  perguntador_id: string;
  perguntador_apelido: string;
  destinatario_id: string;
  destinatario_apelido: string;
  texto: string;
}

export interface HistoricoPergunta {
  tipo?: "pergunta";
  perguntador_apelido: string;
  destinatario_apelido: string;
  pergunta: string;
  resposta: string;
}

export interface HistoricoVotacao {
  tipo: "votacao";
  acusado_apelido: string;
  votos: { votante_apelido: string; aprovado: boolean }[];
  resultado: "eliminado" | "sobreviveu" | "espia_pego";
}

export type HistoricoItem = HistoricoPergunta | HistoricoVotacao;

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
  acusou_neste_turno: boolean;
  adivinhou_evento_id: number | null;
  pergunta_atual: PerguntaAtual | null;
  historico: HistoricoItem[];
  primeira_rodada: boolean;
  palavras_primeira_rodada: { jogador_id: string; apelido: string; palavra: string }[];
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

export interface CriarSalaPayload  { apelido: string; num_rodadas: number; senha?: string; }
export interface EntrarSalaPayload { codigo: string; apelido: string; senha?: string; }
export interface IniciarRodadaPayload  { sala_id: string; }
export interface ProximoTurnoPayload   { rodada_id: string; }
export interface AcusarPayload         { rodada_id: string; acusado_id: string; }
export interface VotarPayload          { rodada_id: string; aprovado: boolean; }
export interface AdivinharPayload      { rodada_id: string; evento_id: number; }
export interface FazerPerguntaPayload  { rodada_id: string; destinatario_id: string; texto: string; }
export interface ResponderPerguntaPayload { rodada_id: string; resposta: string; }
export interface DizerPalavraPayload { rodada_id: string; palavra: string; }

export type GameResponse<T = Record<string, unknown>> =
  | { data: T; error?: never }
  | { error: string; data?: never };
