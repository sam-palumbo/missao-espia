// supabase/functions/game/handlers/adicionar-bot.ts
import { getDb } from "../lib/db.ts";
import { getSalaById, assertIsAnfitriao } from "../lib/queries.ts";
import { escolherApelidoBot } from "../lib/bot.ts";
import type { AdicionarBotPayload } from "../lib/types.ts";

export async function adicionarBot(userId: string, payload: unknown) {
  const { sala_id } = payload as AdicionarBotPayload;
  if (!sala_id) throw new Error("sala_id obrigatório");

  const db = getDb();
  const sala = await getSalaById(db, sala_id);

  assertIsAnfitriao(sala, userId);
  if (sala.status !== "aguardando") throw new Error("Bots só podem ser adicionados na sala de espera");

  const { data: jogadores } = await db
    .from("jogadores")
    .select("apelido")
    .eq("sala_id", sala_id);

  const total = (jogadores ?? []).length;
  if (total >= (sala.max_jogadores ?? 12)) throw new Error("Sala cheia");

  const apelido = escolherApelidoBot((jogadores ?? []).map((j) => j.apelido));

  const { data: jogador, error } = await db
    .from("jogadores")
    .insert({ sala_id, user_id: null, apelido, is_bot: true })
    .select()
    .single();

  if (error || !jogador) throw new Error("Falha ao adicionar bot: " + error?.message);

  return { jogador };
}
