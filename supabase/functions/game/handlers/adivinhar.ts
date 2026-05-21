// supabase/functions/game/handlers/adivinhar.ts
import { getDb }          from "../lib/db.ts";
import { encerrarRodada } from "./encerrar-rodada.ts";
import { EVENTOS }        from "../lib/eventos.ts";
import type { AdivinharPayload } from "../lib/types.ts";

export async function adivinhar(userId: string, payload: unknown) {
  const { rodada_id, evento_id } = payload as AdivinharPayload;
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
  const fasesPermitidas = ["jogando", "adivinhacao"];
  if (!fasesPermitidas.includes(estado.fase)) {
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

  const eventoValido = EVENTOS.find((e) => e.id === evento_id);
  if (!eventoValido) throw new Error("Evento inválido");

  const acertou = evento_id === rodada.evento_id;

  if (!acertou) {
    await db.from("jogadores").update({ ativo: false }).eq("id", jogador.id);
    return encerrarRodada(userId, {
      rodada_id,
      espia_pego: true,
      espia_adivinhou: false,
    });
  }

  // Acertou: espia já havia sido pego se estamos na fase adivinhacao
  const espiaPego = estado.fase === "adivinhacao";
  return encerrarRodada(userId, {
    rodada_id,
    espia_pego: espiaPego,
    espia_adivinhou: true,
  });
}
