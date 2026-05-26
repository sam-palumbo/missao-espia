import { getDb }                from "../lib/db.ts";
import { calcularProximoTurno } from "../lib/queries.ts";
import { encerrarPorTempo }     from "./encerrar-por-tempo.ts";
import type { ProximoTurnoPayload, HistoricoTurnoPresencial } from "../lib/types.ts";

export async function proximoTurno(userId: string, payload: unknown) {
  const { rodada_id } = payload as ProximoTurnoPayload;
  if (!rodada_id) throw new Error("rodada_id obrigatório");

  const db = getDb();

  const { data: rodada } = await db
    .from("rodadas")
    .select("*, salas(anfitriao, modo)")
    .eq("id", rodada_id)
    .single();

  if (!rodada) throw Object.assign(new Error("Rodada não encontrada"), { status: 404 });
  if (rodada.encerrada_em) throw new Error("Rodada já encerrada");

  const estado = rodada.estado;
  if (estado.fase !== "jogando") throw new Error(`Não é possível avançar turno na fase '${estado.fase}'`);

  if (new Date() > new Date(estado.timer_end)) {
    return encerrarPorTempo(userId, { rodada_id });
  }

  // Buscar apelido do jogador do turno atual (para o histórico presencial)
  const { data: jogadorAtual } = await db
    .from("jogadores")
    .select("id, apelido")
    .eq("id", estado.turno_atual)
    .single();

  const modo = rodada.salas?.modo ?? "online";

  // Avançar turno
  const { proximo, proximoTurnoNumero } = calcularProximoTurno(estado);

  const novoHistorico = [...(estado.historico ?? [])];
  if (modo === "presencial" && jogadorAtual) {
    const item: HistoricoTurnoPresencial = {
      tipo: "turno_presencial",
      turno_numero: estado.turno_numero_atual,
      jogador_apelido: jogadorAtual.apelido,
    };
    novoHistorico.push(item);
  }

  // Verificar se devemos encerrar a primeira rodada (presencial não usa palavras)
  let novaPrimeiraRodada = estado.primeira_rodada;
  if (modo === "presencial" && estado.primeira_rodada) {
    const { data: jogadoresAtivos } = await db
      .from("jogadores")
      .select("id")
      .eq("sala_id", rodada.sala_id)
      .eq("ativo", true);
    const turnosPresenciais = novoHistorico.filter((h: { tipo?: string }) => h.tipo === "turno_presencial").length;
    if (jogadoresAtivos && turnosPresenciais >= jogadoresAtivos.length) {
      novaPrimeiraRodada = false;
    }
  }

  const { error } = await db
    .from("rodadas")
    .update({
      estado: {
        ...estado,
        turno_atual: proximo,
        acusou_neste_turno: false,
        historico: novoHistorico,
        primeira_rodada: novaPrimeiraRodada,
        ...(modo === "presencial" ? { turno_numero_atual: proximoTurnoNumero } : {}),
      },
    })
    .eq("id", rodada_id);

  if (error) throw new Error("Falha ao avançar turno: " + error.message);

  return { turno_atual: proximo, primeira_rodada: novaPrimeiraRodada };
}
