import { getDb }       from "../lib/db.ts";
import { numEspias }   from "../lib/espias.ts";
import { EVENTOS }     from "../lib/eventos.ts";
import type { IniciarRodadaPayload, EstadoRodada } from "../lib/types.ts";

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

export async function iniciarRodada(userId: string, payload: unknown) {
  const { sala_id } = payload as IniciarRodadaPayload;
  if (!sala_id) throw new Error("sala_id obrigatório");

  const db = getDb();

  const { data: sala } = await db
    .from("salas")
    .select("*")
    .eq("id", sala_id)
    .single();

  if (!sala) throw Object.assign(new Error("Sala não encontrada"), { status: 404 });
  if (sala.anfitriao !== userId) throw Object.assign(new Error("Apenas o anfitrião pode iniciar"), { status: 403 });
  if (sala.status === "encerrada") throw new Error("Partida encerrada");
  if (sala.rodada_atual >= sala.num_rodadas) throw new Error("Todas as rodadas já foram jogadas");

  const { data: jogadores } = await db
    .from("jogadores")
    .select("id")
    .eq("sala_id", sala_id)
    .eq("ativo", true);

  if (!jogadores || jogadores.length < 4) throw new Error("Mínimo de 4 jogadores ativos");

  const { data: rodadasAnteriores } = await db
    .from("rodadas")
    .select("evento_id")
    .eq("sala_id", sala_id);

  const usados = new Set((rodadasAnteriores ?? []).map((r) => r.evento_id));
  const disponiveis = EVENTOS.filter((e) => !usados.has(e.id));
  if (disponiveis.length === 0) throw new Error("Todos os eventos já foram usados");

  const evento = disponiveis[Math.floor(Math.random() * disponiveis.length)];

  const n = numEspias(jogadores.length);
  const ids = jogadores.map((j) => j.id);
  const shuffled = shuffle(ids);
  const espia_ids = shuffled.slice(0, n);

  const minutos = 5 + jogadores.length - n;
  const timer_end = new Date(Date.now() + minutos * 60 * 1000).toISOString();

  const estado: EstadoRodada = {
    fase: "jogando",
    turno_atual: shuffled[0],
    ordem_turnos: shuffled,
    espia_ids,
    timer_end,
    eliminacoes_erradas: 0,
    acusado_id: null,
    adivinhou_evento_id: null,
  };

  const novoNumero = sala.rodada_atual + 1;

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
