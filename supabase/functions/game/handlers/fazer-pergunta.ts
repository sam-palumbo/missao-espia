import { getDb } from "../lib/db.ts";
import {
  getRodadaWithSala, getJogadorByUserId, getJogadorById,
  assertRodadaNaoEncerrada, assertFase, assertJogadorAtivo,
  assertIsTurno, assertModoOnline,
} from "../lib/queries.ts";
import type { FazerPerguntaPayload } from "../lib/types.ts";

export async function fazerPergunta(userId: string, payload: unknown) {
  const { rodada_id, destinatario_id, texto } = payload as FazerPerguntaPayload;
  if (!rodada_id || !destinatario_id || !texto?.trim()) throw new Error("Campos obrigatórios faltando");

  const textoLimpo = texto.trim();
  if (textoLimpo.length > 200) throw new Error("Pergunta muito longa");

  const db = getDb();
  const rodada = await getRodadaWithSala(db, rodada_id);
  const modo = rodada.salas.modo;

  assertRodadaNaoEncerrada(rodada);
  assertModoOnline(modo);
  assertFase(rodada.estado, ["jogando"]);

  const perguntador = await getJogadorByUserId(db, rodada.sala_id, userId);
  assertJogadorAtivo(perguntador);
  assertIsTurno(rodada.estado, perguntador.id);

  const destinatario = await getJogadorById(db, destinatario_id);
  if (!destinatario.ativo) throw new Error("Destinatário não encontrado ou eliminado");
  if (destinatario.id === perguntador.id) throw new Error("Não pode perguntar para si mesmo");
  if (destinatario.sala_id !== rodada.sala_id) throw new Error("Destinatário não está nesta sala");

  const { estado } = rodada;
  const novoEstado = {
    ...estado,
    fase: "aguardando_resposta" as const,
    pergunta_atual: {
      perguntador_id: perguntador.id,
      perguntador_apelido: perguntador.apelido,
      destinatario_id: destinatario.id,
      destinatario_apelido: destinatario.apelido,
      texto: textoLimpo,
    },
  };

  const { error } = await db.from("rodadas").update({ estado: novoEstado }).eq("id", rodada_id);
  if (error) throw new Error("Falha ao registrar pergunta: " + error.message);

  return { ok: true };
}
