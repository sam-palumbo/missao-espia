// supabase/functions/game/handlers/acusar.ts
import { getDb }        from "../lib/db.ts";
import type { AcusarPayload } from "../lib/types.ts";

export async function acusar(userId: string, payload: unknown) {
  const { rodada_id, acusado_id } = payload as AcusarPayload;
  if (!rodada_id || !acusado_id) throw new Error("rodada_id e acusado_id obrigatórios");

  const db = getDb();

  const { data: rodada } = await db
    .from("rodadas")
    .select("estado, sala_id, encerrada_em")
    .eq("id", rodada_id)
    .single();

  if (!rodada) throw Object.assign(new Error("Rodada não encontrada"), { status: 404 });
  if (rodada.encerrada_em) throw new Error("Rodada encerrada");

  const estado = rodada.estado;
  if (estado.fase !== "jogando") throw new Error("Só é possível acusar na fase 'jogando'");
  if (estado.acusou_neste_turno) throw Object.assign(new Error("Você já acusou neste turno"), { status: 403 });

  // Verificar que caller é o jogador do turno atual
  const { data: caller } = await db
    .from("jogadores")
    .select("id")
    .eq("sala_id", rodada.sala_id)
    .eq("user_id", userId)
    .single();

  if (!caller || caller.id !== estado.turno_atual) {
    throw Object.assign(new Error("Apenas o jogador do turno pode acusar"), { status: 403 });
  }

  // Verificar que acusado é jogador ativo da sala
  const { data: acusado } = await db
    .from("jogadores")
    .select("id, ativo")
    .eq("id", acusado_id)
    .eq("sala_id", rodada.sala_id)
    .single();

  if (!acusado || !acusado.ativo) throw new Error("Jogador acusado não encontrado ou eliminado");
  if (acusado_id === caller.id) throw new Error("Não é possível acusar a si mesmo");

  const { error } = await db
    .from("rodadas")
    .update({ estado: { ...estado, fase: "votacao", acusado_id, acusou_neste_turno: true } })
    .eq("id", rodada_id);

  if (error) throw new Error("Falha ao iniciar votação: " + error.message);

  return { fase: "votacao", acusado_id };
}
