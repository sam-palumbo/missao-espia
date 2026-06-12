// supabase/functions/game/handlers/finalizar-adivinhacao-fim-tempo.ts
import { getDb }        from "../lib/db.ts";
import { encerrarRodada } from "./encerrar-rodada.ts";
import type { FinalizarAdivinhacaoFimTempoPayload } from "../lib/types.ts";
import type { SupabaseClient } from "@supabase/supabase-js";

export async function finalizarAdivinhacaoFimTempo(userId: string, payload: unknown) {
  const { rodada_id } = payload as FinalizarAdivinhacaoFimTempoPayload;
  if (!rodada_id) throw new Error("rodada_id obrigatório");

  const db = getDb();

  const { data: rodada } = await db
    .from("rodadas")
    .select("estado, sala_id, evento_id, encerrada_em")
    .eq("id", rodada_id)
    .single();

  if (!rodada) throw Object.assign(new Error("Rodada não encontrada"), { status: 404 });
  if (rodada.encerrada_em) return { ok: true };

  const estado = rodada.estado;

  // Espia pego por votação tem 30s para adivinhar (fase "adivinhacao");
  // expirado o timer sem adivinhar, encerra como pego sem acerto.
  if (estado.fase === "adivinhacao") {
    if (!estado.timer_adivinhacao_end || new Date() <= new Date(estado.timer_adivinhacao_end)) {
      throw new Error("O tempo de adivinhação ainda não expirou");
    }
    return encerrarRodada(userId, {
      rodada_id,
      espia_pego: true,
      espia_adivinhou: false,
      espia_pego_id: estado.acusado_id ?? undefined,
    });
  }

  if (estado.fase !== "adivinhacao_fim_tempo") {
    throw new Error(`Não é possível finalizar na fase '${estado.fase}'`);
  }

  return _finalizarAdivinhacaoFimTempo(db, rodada_id, rodada, estado);
}

export async function _finalizarAdivinhacaoFimTempo(
  db: SupabaseClient,
  rodada_id: string,
  rodada: { sala_id: string; evento_id: number },
  estado: Record<string, unknown> & {
    espia_ids: string[];
    adivinhacoes_fim_tempo?: Record<string, number | null>;
  }
) {
  const adivinhacoes: Record<string, number | null> = estado.adivinhacoes_fim_tempo ?? {};

  // Pontua apenas os espias que participaram da adivinhação final (ativos
  // quando o tempo acabou) — espia eliminado durante a rodada fica com 0.
  // Fallback para espia_ids cobre rodadas antigas sem o mapa.
  const espiasElegiveis = Object.keys(adivinhacoes).length > 0
    ? Object.keys(adivinhacoes)
    : estado.espia_ids;

  for (const espiaId of espiasElegiveis) {
    const guess = adivinhacoes[espiaId] ?? null;
    const acertou = guess !== null && guess === rodada.evento_id;
    const pontos = acertou ? 3 : 2;
    await db.rpc("incrementar_pontuacao", { jogador_id: espiaId, delta: pontos });
  }

  await db
    .from("rodadas")
    .update({
      encerrada_em: new Date().toISOString(),
      estado: { ...estado, fase: "resultado" },
    })
    .eq("id", rodada_id);

  const { data: sala } = await db
    .from("salas")
    .select("rodada_atual, num_rodadas")
    .eq("id", rodada.sala_id)
    .single();

  if (sala) {
    if (sala.rodada_atual >= sala.num_rodadas) {
      await db.from("salas").update({ status: "encerrada" }).eq("id", rodada.sala_id);
    } else {
      await db.from("salas").update({ status: "aguardando" }).eq("id", rodada.sala_id);
    }
  }

  return { ok: true };
}
