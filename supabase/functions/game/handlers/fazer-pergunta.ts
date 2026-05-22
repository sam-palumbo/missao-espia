import { getDb } from "../lib/db.ts";
import type { FazerPerguntaPayload } from "../lib/types.ts";

export async function fazerPergunta(userId: string, payload: unknown) {
  const { rodada_id, destinatario_id, texto } = payload as FazerPerguntaPayload;
  if (!rodada_id || !destinatario_id || !texto?.trim()) throw new Error("Campos obrigatórios faltando");
  if (texto.trim().length > 200) throw new Error("Pergunta muito longa");

  const db = getDb();

  const { data: rodada } = await db.from("rodadas").select("*").eq("id", rodada_id).single();
  if (!rodada) throw Object.assign(new Error("Rodada não encontrada"), { status: 404 });
  if (rodada.encerrada_em) throw new Error("Rodada já encerrada");

  const estado = rodada.estado;
  if (estado.fase !== "jogando") throw new Error(`Não é possível perguntar na fase '${estado.fase}'`);
  if (estado.primeira_rodada) throw new Error("Na primeira rodada não há perguntas, apenas uma palavra por jogador");

  const { data: perguntador } = await db
    .from("jogadores").select("id, apelido, ativo")
    .eq("sala_id", rodada.sala_id).eq("user_id", userId).single();
  if (!perguntador) throw Object.assign(new Error("Jogador não encontrado"), { status: 404 });
  if (!perguntador.ativo) throw Object.assign(new Error("Jogador eliminado não pode agir"), { status: 403 });
  if (perguntador.id !== estado.turno_atual) throw Object.assign(new Error("Não é seu turno"), { status: 403 });

  const { data: destinatario } = await db
    .from("jogadores").select("id, apelido")
    .eq("id", destinatario_id).eq("ativo", true).single();
  if (!destinatario) throw Object.assign(new Error("Destinatário não encontrado"), { status: 404 });
  if (destinatario.id === perguntador.id) throw new Error("Não pode perguntar para si mesmo");

  const novoEstado = {
    ...estado,
    fase: "aguardando_resposta",
    pergunta_atual: {
      perguntador_id: perguntador.id,
      perguntador_apelido: perguntador.apelido,
      destinatario_id: destinatario.id,
      destinatario_apelido: destinatario.apelido,
      texto: texto.trim(),
    },
  };

  const { error } = await db.from("rodadas").update({ estado: novoEstado }).eq("id", rodada_id);
  if (error) throw new Error("Falha ao registrar pergunta: " + error.message);

  return { ok: true };
}
