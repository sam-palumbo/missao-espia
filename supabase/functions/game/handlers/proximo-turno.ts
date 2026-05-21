import { getDb }                from "../lib/db.ts";
import { encerrarRodada }       from "./encerrar-rodada.ts";
import type { ProximoTurnoPayload } from "../lib/types.ts";

export async function proximoTurno(userId: string, payload: unknown) {
  const { rodada_id } = payload as ProximoTurnoPayload;
  if (!rodada_id) throw new Error("rodada_id obrigatório");

  const db = getDb();

  const { data: rodada } = await db
    .from("rodadas")
    .select("*, salas(anfitriao)")
    .eq("id", rodada_id)
    .single();

  if (!rodada) throw Object.assign(new Error("Rodada não encontrada"), { status: 404 });
  if (rodada.encerrada_em) throw new Error("Rodada já encerrada");

  const estado = rodada.estado;
  if (estado.fase !== "jogando") throw new Error(`Não é possível avançar turno na fase '${estado.fase}'`);

  // Verificar se timer expirou
  if (new Date() > new Date(estado.timer_end)) {
    return encerrarRodada(userId, {
      rodada_id,
      espia_pego: false,
      espia_adivinhou: false,
    });
  }

  // Avançar turno
  const idx = estado.ordem_turnos.indexOf(estado.turno_atual);
  const proximo = estado.ordem_turnos[(idx + 1) % estado.ordem_turnos.length];

  const { error } = await db
    .from("rodadas")
    .update({ estado: { ...estado, turno_atual: proximo } })
    .eq("id", rodada_id);

  if (error) throw new Error("Falha ao avançar turno: " + error.message);

  return { turno_atual: proximo };
}
