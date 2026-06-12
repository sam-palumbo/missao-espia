// supabase/functions/game/handlers/encerrar-por-tempo.ts
import { getDb }           from "../lib/db.ts";
import { encerrarRodada }  from "./encerrar-rodada.ts";
import type { EncerrarPorTempoPayload } from "../lib/types.ts";

export async function encerrarPorTempo(userId: string, payload: unknown) {
  const { rodada_id } = payload as EncerrarPorTempoPayload;
  if (!rodada_id) throw new Error("rodada_id obrigatório");

  const db = getDb();

  const { data: rodada } = await db
    .from("rodadas")
    .select("estado, sala_id, encerrada_em")
    .eq("id", rodada_id)
    .single();

  if (!rodada) throw Object.assign(new Error("Rodada não encontrada"), { status: 404 });
  if (rodada.encerrada_em) throw new Error("Rodada já encerrada");

  const estado = rodada.estado;

  if (estado.fase === "adivinhacao_fim_tempo") return { ok: true };

  // Permite encerrar por tempo nas fases ativas do jogo.
  // "aguardando_resposta" pode estar ativa quando o timer expirar no meio de uma pergunta.
  // "turno_palavras" pode estar ativa se o timer expirar antes de todos dizerem sua palavra.
  const fasesPermitidas = ["jogando", "aguardando_resposta", "turno_palavras"];
  if (!fasesPermitidas.includes(estado.fase)) {
    throw new Error(`Não é possível encerrar por tempo na fase '${estado.fase}'`);
  }

  if (estado.espia_ids.length === 0) {
    return encerrarRodada(userId, { rodada_id, espia_pego: false, espia_adivinhou: false });
  }

  // Apenas espias ainda ativos participam da adivinhação final —
  // espia eliminado durante a rodada não adivinha nem pontua (regra: 0 pontos).
  const { data: espiasAtivos } = await db
    .from("jogadores")
    .select("id")
    .eq("sala_id", rodada.sala_id)
    .eq("ativo", true)
    .in("id", estado.espia_ids);
  const espiaIdsAtivos = (espiasAtivos ?? []).map((j: { id: string }) => j.id);

  if (espiaIdsAtivos.length === 0) {
    return encerrarRodada(userId, { rodada_id, espia_pego: true, espia_adivinhou: false });
  }

  const timerAdivinhacaoEnd = new Date(Date.now() + 30_000).toISOString();
  const adivinhacoesFimTempo: Record<string, number | null> =
    Object.fromEntries(espiaIdsAtivos.map((id: string) => [id, null]));

  const { error } = await db
    .from("rodadas")
    .update({
      estado: {
        ...estado,
        fase: "adivinhacao_fim_tempo",
        timer_adivinhacao_end: timerAdivinhacaoEnd,
        adivinhacoes_fim_tempo: adivinhacoesFimTempo,
        // Limpa pergunta ativa caso o timer expire no meio de uma pergunta
        pergunta_atual: null,
      },
    })
    .eq("id", rodada_id);

  if (error) throw new Error("Falha ao encerrar por tempo: " + error.message);
  return { ok: true, timer_adivinhacao_end: timerAdivinhacaoEnd };
}
