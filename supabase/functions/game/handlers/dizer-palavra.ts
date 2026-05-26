import { getDb } from "../lib/db.ts";
import {
  getRodadaWithSala, getJogadorByUserId,
  assertRodadaNaoEncerrada, assertFase, assertIsTurno, assertModoOnline,
  calcularProximoTurno,
} from "../lib/queries.ts";
import { encerrarPorTempo } from "./encerrar-por-tempo.ts";
import type { DizerPalavraPayload } from "../lib/types.ts";

export async function dizerPalavra(userId: string, payload: unknown) {
  const { rodada_id, palavra } = payload as DizerPalavraPayload;
  if (!rodada_id || !palavra?.trim()) throw new Error("Campos obrigatórios faltando");
  if (palavra.trim().length > 50) throw new Error("Palavra muito longa");

  const db = getDb();
  const rodada = await getRodadaWithSala(db, rodada_id);
  assertRodadaNaoEncerrada(rodada);
  assertModoOnline(rodada.salas.modo);

  const estado = rodada.estado;
  assertFase(estado, ["jogando"]);
  if (!estado.primeira_rodada) throw new Error("Só é possível dizer palavra na primeira rodada");

  const jogador = await getJogadorByUserId(db, rodada.sala_id, userId);
  assertIsTurno(estado, jogador.id);

  const palavraLimpa = palavra.trim();
  if (palavraLimpa.includes(" ")) throw new Error("Na primeira rodada, só é permitido uma única palavra");

  if (new Date() > new Date(estado.timer_end)) {
    return encerrarPorTempo(userId, { rodada_id });
  }

  const { proximo } = calcularProximoTurno(estado);

  const novoEstado = {
    ...estado,
    turno_atual: proximo,
    acusou_neste_turno: false,
    palavras_primeira_rodada: [
      ...(estado.palavras_primeira_rodada ?? []),
      { jogador_id: jogador.id, apelido: jogador.apelido, palavra: palavraLimpa },
    ],
  };

  // Verificar se todos os jogadores ativos já disseram suas palavras
  const { data: todosJogadores } = await db
    .from("jogadores")
    .select("id")
    .eq("sala_id", rodada.sala_id)
    .eq("ativo", true);
  
  const palavrasPorJogador = new Set(novoEstado.palavras_primeira_rodada?.map((p: { jogador_id: string }) => p.jogador_id) ?? []);
  const todosFalaram = todosJogadores && todosJogadores.length > 0 && todosJogadores.every(j => palavrasPorJogador.has(j.id));

  // Se todos falaram, encerrar a primeira rodada
  if (todosFalaram) {
    novoEstado.primeira_rodada = false;
  }

  const { error } = await db.from("rodadas").update({ estado: novoEstado }).eq("id", rodada_id);
  if (error) throw new Error("Falha ao registrar palavra: " + error.message);

  return { ok: true, turno_atual: proximo, primeira_rodada_encerrada: todosFalaram };
}
