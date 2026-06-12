// supabase/functions/game/handlers/adivinhar-fim-tempo.ts
import { getDb }    from "../lib/db.ts";
import { _finalizarAdivinhacaoFimTempo } from "./finalizar-adivinhacao-fim-tempo.ts";
import { EVENTOS }  from "../lib/eventos.ts";
import { atualizarEstadoComVersao, getJogadorAtor } from "../lib/queries.ts";
import type { AdivinharFimTempoPayload } from "../lib/types.ts";

export async function adivinharFimTempo(userId: string, payload: unknown) {
  const { rodada_id, evento_id, bot_id } = payload as AdivinharFimTempoPayload;
  if (!rodada_id || !evento_id) throw new Error("rodada_id e evento_id obrigatórios");

  const db = getDb();

  const { data: rodada } = await db
    .from("rodadas")
    .select("estado, sala_id, evento_id, encerrada_em, versao")
    .eq("id", rodada_id)
    .single();

  if (!rodada) throw Object.assign(new Error("Rodada não encontrada"), { status: 404 });
  if (rodada.encerrada_em) throw new Error("Rodada encerrada");

  const estado = rodada.estado;
  if (estado.fase !== "adivinhacao_fim_tempo") {
    throw new Error(`Não é possível adivinhar na fase '${estado.fase}'`);
  }

  const jogador = await getJogadorAtor(db, rodada.sala_id, userId, bot_id);

  if (!estado.espia_ids.includes(jogador.id)) {
    throw Object.assign(new Error("Apenas o espia pode adivinhar"), { status: 403 });
  }

  const adivinhacoes: Record<string, number | null> = estado.adivinhacoes_fim_tempo ?? {};
  // O mapa só contém espias ativos no fim do tempo — espia eliminado não participa.
  if (!(jogador.id in adivinhacoes)) {
    throw Object.assign(new Error("Espia eliminado não participa da adivinhação final"), { status: 403 });
  }
  if (adivinhacoes[jogador.id] != null) {
    throw new Error("Você já adivinhou nesta rodada");
  }

  // Validate evento_id against EVENTOS
  const eventoValido = EVENTOS.find((e) => e.id === evento_id);
  if (!eventoValido) throw new Error("Evento inválido");

  const novasAdivinhacoes = { ...adivinhacoes, [jogador.id]: evento_id };
  const novoEstado = { ...estado, adivinhacoes_fim_tempo: novasAdivinhacoes };

  // Considera apenas os espias do mapa (ativos) — usar espia_ids travaria a
  // finalização à espera de um espia eliminado que nunca poderá adivinhar.
  const todosSouberam = Object.values(novasAdivinhacoes).every(
    (guess) => guess !== null && guess !== undefined
  );

  if (todosSouberam) {
    // _finalizar grava estado final + encerrada_em num único update versionado
    return _finalizarAdivinhacaoFimTempo(db, rodada_id, rodada, novoEstado, rodada.versao);
  }

  await atualizarEstadoComVersao(db, rodada_id, rodada.versao, novoEstado);
  return { aguardando: true };
}
