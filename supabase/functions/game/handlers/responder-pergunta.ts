import { getDb } from "../lib/db.ts";
import {
  getRodadaWithSala, getJogadorByUserId,
  assertRodadaNaoEncerrada, assertFase, assertModoOnline, forbidden,
  calcularProximoTurno,
} from "../lib/queries.ts";
import { encerrarPorTempo } from "./encerrar-por-tempo.ts";
import type { ResponderPerguntaPayload } from "../lib/types.ts";

export async function responderPergunta(userId: string, payload: unknown) {
  const { rodada_id, resposta } = payload as ResponderPerguntaPayload;
  if (!rodada_id || !resposta?.trim()) throw new Error("Campos obrigatórios faltando");
  if (resposta.trim().length > 200) throw new Error("Resposta muito longa");

  const db = getDb();
  const rodada = await getRodadaWithSala(db, rodada_id);
  assertRodadaNaoEncerrada(rodada);
  assertModoOnline(rodada.salas.modo);

  const estado = rodada.estado;
  assertFase(estado, ["aguardando_resposta"]);

  const perguntaAtual = estado.pergunta_atual;
  if (!perguntaAtual) throw new Error("Nenhuma pergunta ativa");

  const jogador = await getJogadorByUserId(db, rodada.sala_id, userId);
  if (jogador.id !== perguntaAtual.destinatario_id) forbidden("Não é sua vez de responder");

  if (new Date() > new Date(estado.timer_end)) {
    return encerrarPorTempo(userId, { rodada_id });
  }

  const { proximo, proximoTurnoNumero } = calcularProximoTurno(estado);

  const novoEstado = {
    ...estado,
    fase: "jogando",
    turno_atual: proximo,
    turno_numero_atual: proximoTurnoNumero,
    acusou_neste_turno: false,
    pergunta_atual: null,
    historico: [
      ...(estado.historico ?? []),
      {
        turno_numero: estado.turno_numero_atual,
        perguntador_apelido: perguntaAtual.perguntador_apelido,
        destinatario_apelido: perguntaAtual.destinatario_apelido,
        pergunta: perguntaAtual.texto,
        resposta: resposta.trim(),
      },
    ],
  };

  const { error } = await db.from("rodadas").update({ estado: novoEstado }).eq("id", rodada_id);
  if (error) throw new Error("Falha ao registrar resposta: " + error.message);

  return { ok: true, turno_atual: proximo };
}
