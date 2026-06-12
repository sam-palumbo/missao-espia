// supabase/functions/game/handlers/remover-bot.ts
import { getDb } from "../lib/db.ts";
import { getSalaById, getJogadorById, assertIsAnfitriao } from "../lib/queries.ts";
import type { RemoverBotPayload } from "../lib/types.ts";

export async function removerBot(userId: string, payload: unknown) {
  const { sala_id, jogador_id } = payload as RemoverBotPayload;
  if (!sala_id || !jogador_id) throw new Error("sala_id e jogador_id obrigatórios");

  const db = getDb();
  const sala = await getSalaById(db, sala_id);

  assertIsAnfitriao(sala, userId);
  if (sala.status !== "aguardando") throw new Error("Bots só podem ser removidos na sala de espera");

  const jogador = await getJogadorById(db, jogador_id);
  if (jogador.sala_id !== sala_id || !jogador.is_bot) throw new Error("Jogador não é um bot desta sala");

  const { error } = await db.from("jogadores").delete().eq("id", jogador_id);
  if (error) throw new Error("Falha ao remover bot: " + error.message);

  return { ok: true };
}
