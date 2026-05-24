import { getDb }              from "../lib/db.ts";
import { shuffle, addMinutesISO } from "../lib/utils.ts";
import { numEspias }          from "../lib/espias.ts";
import { EVENTOS }            from "../lib/eventos.ts";
import { getSalaById, getJogadoresAtivos, assertIsAnfitriao } from "../lib/queries.ts";
import type { IniciarRodadaPayload, EstadoRodada } from "../lib/types.ts";

export async function iniciarRodada(userId: string, payload: unknown) {
  const { sala_id } = payload as IniciarRodadaPayload;
  if (!sala_id) throw new Error("sala_id obrigatório");

  const db = getDb();
  const sala = await getSalaById(db, sala_id);

  assertIsAnfitriao(sala, userId);
  if (sala.status === "encerrada") throw new Error("Partida encerrada");
  if (sala.rodada_atual >= sala.num_rodadas) throw new Error("Todas as rodadas já foram jogadas");

  const jogadoresAtivos = await getJogadoresAtivos(db, sala_id);
  if (jogadoresAtivos.length < 4) throw new Error("Mínimo de 4 jogadores ativos");

  const { data: rodadasAnteriores } = await db
    .from("rodadas")
    .select("evento_id")
    .eq("sala_id", sala_id);

  const usados = new Set((rodadasAnteriores ?? []).map((r: { evento_id: number }) => r.evento_id));
  const disponiveis = EVENTOS.filter((e) => !usados.has(e.id));
  if (disponiveis.length === 0) throw new Error("Todos os eventos já foram usados");

  const evento = disponiveis[Math.floor(Math.random() * disponiveis.length)];
  const novoNumero = sala.rodada_atual + 1;

  const n = numEspias(jogadoresAtivos.length);
  const ids = jogadoresAtivos.map((j) => j.id);
  const shuffled = shuffle(ids);
  const espia_ids = shuffled.slice(0, n);

  const minutos = 5 + jogadoresAtivos.length - n;
  const timer_end = addMinutesISO(minutos);

  const estado: EstadoRodada = {
    fase: "jogando",
    turno_atual: shuffled[0],
    turno_numero_atual: 1,
    ordem_turnos: shuffled,
    espia_ids,
    timer_end,
    eliminacoes_erradas: 0,
    acusado_id: null,
    acusou_neste_turno: false,
    adivinhou_evento_id: null,
    pergunta_atual: null,
    historico: [],
    primeira_rodada: novoNumero === 1,
    palavras_primeira_rodada: [],
  };

  const { data: rodada, error } = await db
    .from("rodadas")
    .insert({ sala_id, numero: novoNumero, evento_id: evento.id, estado })
    .select()
    .single();

  if (error || !rodada) throw new Error("Falha ao criar rodada: " + error?.message);

  await db
    .from("salas")
    .update({ status: "jogando", rodada_atual: novoNumero })
    .eq("id", sala_id);

  return { rodada };
}
