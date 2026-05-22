import { getDb } from "../lib/db.ts";
import { encerrarRodada } from "./encerrar-rodada.ts";
import type { ResponderPerguntaPayload } from "../lib/types.ts";

export async function responderPergunta(userId: string, payload: unknown) {
  const { rodada_id, resposta } = payload as ResponderPerguntaPayload;
  if (!rodada_id || !resposta?.trim()) throw new Error("Campos obrigatórios faltando");
  if (resposta.trim().length > 200) throw new Error("Resposta muito longa");

  const db = getDb();

  const { data: rodada } = await db.from("rodadas").select("*, salas(modo)").eq("id", rodada_id).single();
  if (!rodada) throw Object.assign(new Error("Rodada não encontrada"), { status: 404 });
  if (rodada.encerrada_em) throw new Error("Rodada já encerrada");
  if (rodada.salas?.modo === "presencial") throw new Error("Ação indisponível no modo presencial");

  const estado = rodada.estado;
  if (estado.fase !== "aguardando_resposta") throw new Error(`Não é possível responder na fase '${estado.fase}'`);

  const perguntaAtual = estado.pergunta_atual;
  if (!perguntaAtual) throw new Error("Nenhuma pergunta ativa");

  const { data: jogador } = await db
    .from("jogadores").select("id")
    .eq("sala_id", rodada.sala_id).eq("user_id", userId).single();
  if (!jogador) throw Object.assign(new Error("Jogador não encontrado"), { status: 404 });
  if (jogador.id !== perguntaAtual.destinatario_id) throw Object.assign(new Error("Não é sua vez de responder"), { status: 403 });

  if (new Date() > new Date(estado.timer_end)) {
    return encerrarRodada(userId, { rodada_id, espia_pego: false, espia_adivinhou: false });
  }

  const idx = estado.ordem_turnos.indexOf(estado.turno_atual);
  const proximo = estado.ordem_turnos[(idx + 1) % estado.ordem_turnos.length];

  const novoEstado = {
    ...estado,
    fase: "jogando",
    turno_atual: proximo,
    acusou_neste_turno: false,
    pergunta_atual: null,
    historico: [
      ...(estado.historico ?? []),
      {
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
