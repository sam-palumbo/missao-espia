// supabase/functions/game/handlers/encerrar-rodada.ts
import { getDb }            from "../lib/db.ts";
import { calcularPontuacao } from "../lib/pontuacao.ts";
import { atualizarEstadoComVersao } from "../lib/queries.ts";

interface EncerrarPayload {
  rodada_id: string;
  espia_pego: boolean;
  espia_adivinhou: boolean;
  /** Espia cuja captura encerrou a rodada — só ele conta como "pego" na pontuação. */
  espia_pego_id?: string;
  /** Espia que acertou a adivinhação — só ele recebe o +1 (multi-espia). */
  espia_adivinhador_id?: string;
  /** Evento_id que o espia adivinhou (armazenado no estado para o frontend exibir). */
  adivinhou_evento_id?: number;
  /** Evento_id que o espia chutou e ERROU (frontend exibe o palpite errado). */
  palpite_errado_evento_id?: number;
}

/** Monta o estado final da rodada — função pura para facilitar testes. */
export function montarEstadoResultado(
  estado: Record<string, unknown>,
  adivinhou_evento_id?: number,
  palpite_errado_evento_id?: number,
): Record<string, unknown> {
  const base: Record<string, unknown> = { ...estado, fase: "resultado" };
  if (adivinhou_evento_id != null) base.adivinhou_evento_id = adivinhou_evento_id;
  if (palpite_errado_evento_id != null) base.palpite_errado_evento_id = palpite_errado_evento_id;
  return base;
}

export async function encerrarRodada(_userId: string, payload: unknown) {
  const { rodada_id, espia_pego, espia_adivinhou, espia_pego_id, espia_adivinhador_id, adivinhou_evento_id, palpite_errado_evento_id } =
    payload as EncerrarPayload;
  if (!rodada_id) throw new Error("rodada_id obrigatório");

  const db = getDb();

  const { data: rodada } = await db
    .from("rodadas")
    .select("estado, sala_id, encerrada_em, versao")
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
    let delta: number;
    if (!ehEspia) {
      delta = pontoGrupo;
    } else if (espia_pego_id || espia_adivinhador_id) {
      // Multi-espia: pontua cada espia ativo pela SUA situação — só o pego conta
      // como pego, só quem adivinhou recebe o bônus; parceiro sobrevivente ganha 2.
      delta = calcularPontuacao({
        espiaPego: j.id === espia_pego_id,
        espiaAdivinhou: j.id === espia_adivinhador_id,
      }).pontoEspia;
    } else {
      delta = pontoEspia;
    }
    if (delta > 0) {
      await db.rpc("incrementar_pontuacao", { jogador_id: j.id, delta });
    }
  }

  const novoEstado = montarEstadoResultado(estado, adivinhou_evento_id, palpite_errado_evento_id);

  await atualizarEstadoComVersao(
    db, rodada_id, rodada.versao,
    novoEstado,
    { encerrada_em: new Date().toISOString() },
  );

  const { data: sala } = await db
    .from("salas")
    .select("rodada_atual, num_rodadas")
    .eq("id", rodada.sala_id)
    .single();

  if (sala) {
    if (sala.rodada_atual >= sala.num_rodadas) {
      await db.from("salas").update({ status: "encerrada" }).eq("id", rodada.sala_id);
    } else {
      // Back to aguardando so the lobby doesn't redirect players to jogo before the next round starts
      await db.from("salas").update({ status: "aguardando" }).eq("id", rodada.sala_id);
    }
  }

  return { encerrada: true, espia_pego, espia_adivinhou, pontoEspia, pontoGrupo };
}
