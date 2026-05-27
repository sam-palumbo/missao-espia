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
  if (!estado.turno_palavras) throw new Error("Só é possível dizer palavra no turno de palavras");

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
    palavras_turno: [
      ...(estado.palavras_turno ?? []),
      { jogador_id: jogador.id, apelido: jogador.apelido, palavra: palavraLimpa },
    ],
  };

  // Verificar se todos os jogadores em ordem_turnos já disseram suas palavras.
  // Usamos ordem_turnos (definido no início da rodada) e não todos os jogadores ativos,
  // pois um jogador que entrou na sala após o início da rodada não está em ordem_turnos
  // e nunca poderia dizer uma palavra — o que travaria a fase indefinidamente.
  const palavrasPorJogador = new Set(novoEstado.palavras_turno?.map((p: { jogador_id: string }) => p.jogador_id) ?? []);
  const todosFalaram = estado.ordem_turnos.length > 0 && estado.ordem_turnos.every(id => palavrasPorJogador.has(id));

  // Se todos falaram, encerrar a primeira rodada
  if (todosFalaram) {
    novoEstado.turno_palavras = false;
  }

  const { error } = await db.from("rodadas").update({ estado: novoEstado }).eq("id", rodada_id);
  if (error) throw new Error("Falha ao registrar palavra: " + error.message);

  return { ok: true, turno_atual: proximo, turno_palavras_encerrado: todosFalaram };
}
