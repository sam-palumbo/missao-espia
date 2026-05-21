// supabase/functions/game/handlers/encerrar-rodada.ts
import { getDb }            from "../lib/db.ts";
import { calcularPontuacao } from "../lib/pontuacao.ts";

interface EncerrarPayload {
  rodada_id: string;
  espia_pego: boolean;
  espia_adivinhou: boolean;
}

export async function encerrarRodada(_userId: string, payload: unknown) {
  const { rodada_id, espia_pego, espia_adivinhou } = payload as EncerrarPayload;
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
  const { pontoEspia, pontoGrupo } = calcularPontuacao({
    espiaPego: espia_pego,
    espiaAdivinhou: espia_adivinhou,
  });

  const { data: jogadoresAtivos } = await db
    .from("jogadores")
    .select("id")
    .eq("sala_id", rodada.sala_id)
    .eq("ativo", true);

  for (const j of jogadoresAtivos ?? []) {
    const ehEspia = estado.espia_ids.includes(j.id);
    const delta = ehEspia ? pontoEspia : pontoGrupo;
    if (delta > 0) {
      await db.rpc("incrementar_pontuacao", { jogador_id: j.id, delta });
    }
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
    const novaRodada = sala.rodada_atual + 1;
    if (novaRodada >= sala.num_rodadas) {
      await db.from("salas").update({ status: "encerrada" }).eq("id", rodada.sala_id);
    } else {
      await db.from("salas").update({ rodada_atual: novaRodada }).eq("id", rodada.sala_id);
    }
  }

  return { encerrada: true, espia_pego, espia_adivinhou, pontoEspia, pontoGrupo };
}
