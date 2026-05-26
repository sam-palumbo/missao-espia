import { createClient } from "./supabase";
import type { ModoSala } from "./types";

async function callGame<T>(action: string, payload: unknown): Promise<T> {
  const supabase = createClient();
  const { data, error } = await supabase.functions.invoke("game", {
    body: { action, payload },
  });
  if (error) throw error;
  if (data?.error) throw new Error(data.error);
  return data as T;
}

// ============================================================
// Responses tipados
// ============================================================

export interface SalaComJogador {
  sala: {
    id: string;
    codigo: string;
    num_rodadas: number;
    status: string;
    modo?: ModoSala;
  };
  jogador: {
    id: string;
    apelido: string;
  };
}

// ============================================================
// Actions
// ============================================================

export const gameActions = {
  criarSala: (
    apelido: string,
    num_rodadas: number,
    opts?: { modo?: ModoSala; senha?: string }
  ) =>
    callGame<SalaComJogador>("criar_sala", {
      apelido,
      num_rodadas,
      modo: opts?.modo,
      senha: opts?.senha,
    }),

  entrarSala: (codigo: string, apelido: string, senha?: string) =>
    callGame<SalaComJogador>("entrar_sala", { codigo, apelido, senha }),

  definirModo: (sala_id: string, modo: ModoSala) =>
    callGame<{ ok: true; modo: ModoSala }>("definir_modo", { sala_id, modo }),

  iniciarRodada: (sala_id: string) =>
    callGame<{ rodada: { id: string } }>("iniciar_rodada", { sala_id }),

  proximoTurno: (rodada_id: string) =>
    callGame<{ turno_atual: string; primeira_rodada?: boolean }>("proximo_turno", { rodada_id }),

  dizerPalavra: (rodada_id: string, palavra: string) =>
    callGame<{ ok: true; turno_atual: string; primeira_rodada_encerrada?: boolean }>(
      "dizer_palavra",
      { rodada_id, palavra }
    ),

  fazerPergunta: (rodada_id: string, destinatario_id: string, texto: string) =>
    callGame<{ ok: true }>("fazer_pergunta", { rodada_id, destinatario_id, texto }),

  responderPergunta: (rodada_id: string, resposta: string) =>
    callGame<{ ok: true; turno_atual: string }>("responder_pergunta", {
      rodada_id,
      resposta,
    }),

  acusar: (rodada_id: string, acusado_id: string) =>
    callGame<{ fase: string; acusado_id: string }>("acusar", { rodada_id, acusado_id }),

  votar: (rodada_id: string, aprovado: boolean) =>
    callGame<
      | { aguardando_votos: true; votos_recebidos: number }
      | { resultado_votacao: string; espia_pego?: boolean; eliminacoes_erradas?: number; fase?: string }
    >("votar", { rodada_id, aprovado }),

  adivinhar: (rodada_id: string, evento_id: number) =>
    callGame<{ encerrada?: boolean; espia_pego?: boolean; espia_adivinhou?: boolean }>(
      "adivinhar",
      { rodada_id, evento_id }
    ),

  encerrarPorTempo: (rodada_id: string) =>
    callGame<{ ok: boolean; timer_adivinhacao_end?: string }>("encerrar_por_tempo", { rodada_id }),

  adivinharFimTempo: (rodada_id: string, evento_id: number) =>
    callGame<{ aguardando?: boolean; ok?: boolean }>("adivinhar_fim_tempo", { rodada_id, evento_id }),

  finalizarAdivinhacaoFimTempo: (rodada_id: string) =>
    callGame<{ ok: boolean }>("finalizar_adivinhacao_fim_tempo", { rodada_id }),
};
