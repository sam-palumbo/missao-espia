import { getDb } from "../lib/db.ts";
import { encerrarRodada } from "./encerrar-rodada.ts";
import type { DizerPalavraPayload } from "../lib/types.ts";

export async function dizerPalavra(userId: string, payload: unknown) {
  const { rodada_id, palavra } = payload as DizerPalavraPayload;
  if (!rodada_id || !palavra?.trim()) throw new Error("Campos obrigatórios faltando");
  if (palavra.trim().length > 50) throw new Error("Palavra muito longa");

  const db = getDb();

  const { data: rodada } = await db.from("rodadas").select("*").eq("id", rodada_id).single();
  if (!rodada) throw Object.assign(new Error("Rodada não encontrada"), { status: 404 });
  if (rodada.encerrada_em) throw new Error("Rodada já encerrada");

  const estado = rodada.estado;
  if (estado.fase !== "jogando") throw new Error(`Não é possível falar na fase '${estado.fase}'`);
  if (!estado.primeira_rodada) throw new Error("Só é possível dizer palavra na primeira rodada");

  const { data: jogador } = await db
    .from("jogadores").select("id, apelido")
    .eq("sala_id", rodada.sala_id).eq("user_id", userId).single();
  if (!jogador) throw Object.assign(new Error("Jogador não encontrado"), { status: 404 });
  if (jogador.id !== estado.turno_atual) throw Object.assign(new Error("Não é seu turno"), { status: 403 });

  // Validar que é uma única palavra (sem espaços)
  const palavraLimpa = palavra.trim();
  if (palavraLimpa.includes(" ")) throw new Error("Na primeira rodada, só é permitido uma única palavra");

  if (new Date() > new Date(estado.timer_end)) {
    return encerrarRodada(userId, { rodada_id, espia_pego: false, espia_adivinhou: false });
  }

  const idx = estado.ordem_turnos.indexOf(estado.turno_atual);
  const proximo = estado.ordem_turnos[(idx + 1) % estado.ordem_turnos.length];

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
  
  const palavrasPorJogador = new Set(novoEstado.palavras_primeira_rodada?.map(p => p.jogador_id) ?? []);
  const todosFalaram = todosJogadores && todosJogadores.length > 0 && todosJogadores.every(j => palavrasPorJogador.has(j.id));

  // Se todos falaram, encerrar a primeira rodada
  if (todosFalaram) {
    novoEstado.primeira_rodada = false;
  }

  const { error } = await db.from("rodadas").update({ estado: novoEstado }).eq("id", rodada_id);
  if (error) throw new Error("Falha ao registrar palavra: " + error.message);

  return { ok: true, turno_atual: proximo, primeira_rodada_encerrada: todosFalaram };
}
