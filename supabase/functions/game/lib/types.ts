// ============================================================
// TIPOS COMPARTILHADOS do Missão Espia
// ============================================================
// FONTE DA VERDADE dos tipos do jogo.
// O lado web importa este arquivo via path alias @shared/*
// configurado em web/tsconfig.json. Não há duplicação.
// ============================================================

export type SalaStatus = "aguardando" | "jogando" | "encerrada";
export type FaseJogo = "turno_palavras" | "jogando" | "aguardando_resposta" | "votacao" | "adivinhacao" | "adivinhacao_fim_tempo" | "resultado";
export type ModoSala = "online" | "presencial";
export type ResultadoVotacaoHistorico = "eliminado" | "sobreviveu" | "espia_pego";
export type Testament = "AT" | "NT";

// ============================================================
// Entidades do Estado
// ============================================================

export interface PerguntaAtual {
  perguntador_id: string;
  perguntador_apelido: string;
  destinatario_id: string;
  destinatario_apelido: string;
  texto: string;
}

export interface HistoricoPergunta {
  tipo?: "pergunta";
  turno_numero: number;
  perguntador_apelido: string;
  destinatario_apelido: string;
  pergunta: string;
  resposta: string;
}

export interface HistoricoVotacao {
  tipo: "votacao";
  acusado_apelido: string;
  votos: { votante_apelido: string; aprovado: boolean }[];
  resultado: ResultadoVotacaoHistorico;
}

export interface HistoricoTurnoPresencial {
  tipo: "turno_presencial";
  turno_numero: number;
  jogador_apelido: string;
}

export type HistoricoItem = HistoricoPergunta | HistoricoVotacao | HistoricoTurnoPresencial;

export interface PalavraTurno {
  jogador_id: string;
  apelido: string;
  palavra: string;
}

// ============================================================
// Entidades do Banco
// ============================================================

export interface Sala {
  id: string;
  codigo: string;
  anfitriao: string | null;
  status: SalaStatus;
  modo: ModoSala;
  num_rodadas: number;
  rodada_atual: number;
  max_jogadores: number;
  duracao_minutos: number | null;
  senha_hash: string | null;
  criada_em: string;
  testamentos: Testament[];
}

export interface Jogador {
  id: string;
  sala_id: string;
  user_id: string | null;
  apelido: string;
  pontuacao: number;
  ativo: boolean;
  conectado: boolean;
  is_bot: boolean;
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
  palavras_turno: PalavraTurno[];
  turno_numero_atual: number;
  timer_adivinhacao_end?: string;
  adivinhacoes_fim_tempo?: Record<string, number | null>;
}

export interface Rodada {
  id: string;
  sala_id: string;
  numero: number;
  evento_id: number;
  estado: EstadoRodada;
  /** Lock otimista — incrementada a cada update de estado; updates condicionam em .eq("versao"). */
  versao: number;
  iniciada_em: string;
  encerrada_em: string | null;
}

export interface MensagemChat {
  id: string;
  sala_id: string;
  jogador_id: string;
  apelido: string;
  texto: string;
  criada_em: string;
}

// ============================================================
// Payloads das Actions (Edge Function)
// ============================================================

export interface CriarSalaPayload {
  apelido: string;
  num_rodadas: number;
  modo?: ModoSala;
  senha?: string;
  testamentos?: Testament[];
  max_jogadores?: number;
  duracao_minutos?: number;
}

export interface EntrarSalaPayload {
  codigo: string;
  apelido: string;
  senha?: string;
}

export interface DefinirModoPayload {
  sala_id: string;
  modo: ModoSala;
}

export interface IniciarRodadaPayload {
  sala_id: string;
}

export interface ProximoTurnoPayload {
  rodada_id: string;
}

/**
 * Ações de jogo aceitam um bot_id opcional: o anfitrião (e somente ele)
 * executa a ação em nome de um jogador bot da sala (ver bot-agir).
 */
export interface DizerPalavraPayload {
  rodada_id: string;
  palavra: string;
  bot_id?: string;
}

export interface FazerPerguntaPayload {
  rodada_id: string;
  destinatario_id: string;
  texto: string;
  bot_id?: string;
}

export interface ResponderPerguntaPayload {
  rodada_id: string;
  resposta: string;
  bot_id?: string;
}

export interface AcusarPayload {
  rodada_id: string;
  acusado_id: string;
  bot_id?: string;
}

export interface VotarPayload {
  rodada_id: string;
  aprovado: boolean;
  bot_id?: string;
}

export interface AdivinharPayload {
  rodada_id: string;
  evento_id: number;
  bot_id?: string;
}

export interface EncerrarPorTempoPayload {
  rodada_id: string;
}

export interface AdivinharFimTempoPayload {
  rodada_id: string;
  evento_id: number;
  bot_id?: string;
}

export interface FinalizarAdivinhacaoFimTempoPayload {
  rodada_id: string;
}

export interface AdicionarBotPayload {
  sala_id: string;
}

export interface RemoverBotPayload {
  sala_id: string;
  jogador_id: string;
}

export interface BotAgirPayload {
  rodada_id: string;
}

// ============================================================
// Tipos Utilitários
// ============================================================

export type GameResponse<T = Record<string, unknown>> =
  | { data: T; error?: never }
  | { error: string; data?: never };
