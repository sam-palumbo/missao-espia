// supabase/functions/game/handlers/adivinhar.ts
import { getDb }          from "../lib/db.ts";
import { encerrarRodada } from "./encerrar-rodada.ts";
import { EVENTOS }        from "../lib/eventos.ts";
import { proximoTurnoAposEliminacao } from "../lib/regras.ts";
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

    // In adivinhacao phase (spy was caught by vote), the round always ends on a wrong guess.
    // In jogando phase, check whether partner spies are still alive — if so, game continues.
    if (estado.fase === "jogando") {
      const espiasRestantes = estado.espia_ids.filter((id: string) => id !== jogador.id);
      const { data: espiasAtivos } = espiasRestantes.length > 0
        ? await db
            .from("jogadores")
            .select("id")
            .eq("sala_id", rodada.sala_id)
            .eq("ativo", true)
            .in("id", espiasRestantes)
        : { data: [] };

      if ((espiasAtivos ?? []).length > 0) {
        // Partner spy still alive — remove eliminated spy from turn order and continue.
        const novaOrdem = estado.ordem_turnos.filter((id: string) => id !== jogador.id);

        // If it was this spy's turn, advance to the next player in the new order.
        const { proximo: proximoTurno, novaVolta } = proximoTurnoAposEliminacao(
          estado.ordem_turnos,
          jogador.id,
          estado.turno_atual,
        );

        const { error } = await db
          .from("rodadas")
          .update({
            estado: {
              ...estado,
              fase: "jogando",
              ordem_turnos: novaOrdem,
              turno_atual: proximoTurno,
              acusou_neste_turno: false,
              turno_numero_atual: (estado.turno_numero_atual ?? 1) + (novaVolta ? 1 : 0),
            },
          })
          .eq("id", rodada_id);

        if (error) throw new Error("Falha ao continuar rodada: " + error.message);
        return { espia_eliminado: true, game_continues: true, turno_atual: proximoTurno };
      }
    }

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
