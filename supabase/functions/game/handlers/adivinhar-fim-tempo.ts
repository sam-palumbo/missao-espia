// supabase/functions/game/handlers/adivinhar-fim-tempo.ts
import { getDb }    from "../lib/db.ts";
import { _finalizarAdivinhacaoFimTempo } from "./finalizar-adivinhacao-fim-tempo.ts";
import { EVENTOS }  from "../lib/eventos.ts";
import type { AdivinharFimTempoPayload } from "../lib/types.ts";

export async function adivinharFimTempo(userId: string, payload: unknown) {
  const { rodada_id, evento_id } = payload as AdivinharFimTempoPayload;
  if (!rodada_id || !evento_id) throw new Error("rodada_id e evento_id obrigatórios");

  const db = getDb();

  const { data: rodada } = await db
    .from("rodadas")
    .select("estado, sala_id, evento_id, encerrada_em")
    .eq("id", rodada_id)
    .single();

  if (!rodada) throw Object.assign(new Error("Rodada não encontrada"), { status: 404 });
  if (rodada.encerrada_em) throw new Error("Rodada encerrada");

  const estado = rodada.estado;
  if (estado.fase !== "adivinhacao_fim_tempo") {
    throw new Error(`Não é possível adivinhar na fase '${estado.fase}'`);
  }

  const { data: jogador } = await db
    .from("jogadores")
    .select("id")
    .eq("sala_id", rodada.sala_id)
    .eq("user_id", userId)
    .single();

  if (!jogador || !estado.espia_ids.includes(jogador.id)) {
    throw Object.assign(new Error("Apenas o espia pode adivinhar"), { status: 403 });
  }

  const adivinhacoes: Record<string, number | null> = estado.adivinhacoes_fim_tempo ?? {};
  if (adivinhacoes[jogador.id] != null) {
    throw new Error("Você já adivinhou nesta rodada");
  }

  // Validate evento_id against EVENTOS
  const eventoValido = EVENTOS.find((e) => e.id === evento_id);
  if (!eventoValido) throw new Error("Evento inválido");

  const novasAdivinhacoes = { ...adivinhacoes, [jogador.id]: evento_id };
  const novoEstado = { ...estado, adivinhacoes_fim_tempo: novasAdivinhacoes };

  const todosSouberam = estado.espia_ids.every(
    (id: string) => novasAdivinhacoes[id] !== null && novasAdivinhacoes[id] !== undefined
  );

  if (todosSouberam) {
    await db.from("rodadas")
      .update({ estado: novoEstado })
      .eq("id", rodada_id);
    return _finalizarAdivinhacaoFimTempo(db, rodada_id, rodada, novoEstado);
  }

  const { error } = await db
    .from("rodadas")
    .update({ estado: novoEstado })
    .eq("id", rodada_id);

  if (error) throw new Error("Falha ao registrar adivinhação: " + error.message);
  return { aguardando: true };
}
