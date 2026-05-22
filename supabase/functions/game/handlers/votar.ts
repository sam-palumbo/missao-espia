// supabase/functions/game/handlers/votar.ts
import { getDb }                 from "../lib/db.ts";
import { limiteEliminacoesErradas, numEspias } from "../lib/espias.ts";
import { resolverVotacao, validarVoto } from "../lib/votacao.ts";
import { encerrarRodada }        from "./encerrar-rodada.ts";
import type { VotarPayload }     from "../lib/types.ts";

export async function votar(userId: string, payload: unknown) {
  const { rodada_id, aprovado } = payload as VotarPayload;
  if (!rodada_id || typeof aprovado !== "boolean") throw new Error("Campos obrigatórios ausentes");

  const db = getDb();

  const { data: rodada } = await db
    .from("rodadas")
    .select("estado, sala_id, encerrada_em")
    .eq("id", rodada_id)
    .single();

  if (!rodada) throw Object.assign(new Error("Rodada não encontrada"), { status: 404 });
  if (rodada.encerrada_em) throw new Error("Rodada encerrada");

  const estado = rodada.estado;
  if (estado.fase !== "votacao") throw new Error("Não há votação em andamento");

  // Buscar jogador votante
  const { data: votante } = await db
    .from("jogadores")
    .select("id, ativo")
    .eq("sala_id", rodada.sala_id)
    .eq("user_id", userId)
    .single();

  if (!votante || !votante.ativo) throw Object.assign(new Error("Jogador não encontrado ou eliminado"), { status: 403 });
  if (votante.id === estado.acusado_id) throw Object.assign(new Error("Acusado não pode votar"), { status: 403 });

  // Verificar se jogador já votou nesta acusação
  const { data: votosAnteriores } = await db
    .from("votos")
    .select("votante_id, acusado_id")
    .eq("rodada_id", rodada_id)
    .eq("acusado_id", estado.acusado_id);
  try {
    validarVoto(votosAnteriores ?? [], votante.id, estado.acusado_id!);
  } catch (err) {
    throw Object.assign(err as Error, { status: 409 });
  }

  const { error: votoErr } = await db.from("votos").insert({
    rodada_id,
    votante_id: votante.id,
    acusado_id: estado.acusado_id,
    aprovado,
  });
  if (votoErr) throw new Error("Falha ao registrar voto: " + votoErr.message);

  // Verificar se todos os jogadores elegíveis já votaram
  const { data: jogadoresAtivos } = await db
    .from("jogadores")
    .select("id")
    .eq("sala_id", rodada.sala_id)
    .eq("ativo", true);

  const elegiveis = (jogadoresAtivos ?? []).filter((j) => j.id !== estado.acusado_id);

  const { data: votos } = await db
    .from("votos")
    .select("aprovado")
    .eq("rodada_id", rodada_id)
    .eq("acusado_id", estado.acusado_id);

  const resultado = resolverVotacao(votos ?? [], elegiveis.length);

  if (resultado === "aguardando") {
    return { aguardando_votos: true, votos_recebidos: votos?.length ?? 0 };
  }

  if (resultado === "rejeitado") {
    // Votação rejeitada: voltar para jogando
    const { error } = await db
      .from("rodadas")
      .update({ estado: { ...estado, fase: "jogando", acusado_id: null } })
      .eq("id", rodada_id);
    if (error) throw new Error(error.message);
    return { resultado_votacao: "rejeitado" };
  }

  // resultado === "aprovado": verificar se acusado é espia
  const acusadoEhEspia = estado.espia_ids.includes(estado.acusado_id!);

  if (acusadoEhEspia) {
    // Espia pego — dar chance de adivinhar
    const { error } = await db
      .from("rodadas")
      .update({ estado: { ...estado, fase: "adivinhacao" } })
      .eq("id", rodada_id);
    if (error) throw new Error(error.message);
    return { resultado_votacao: "aprovado", espia_pego: true, fase: "adivinhacao" };
  }

  // Eliminação errada
  const novasElim = estado.eliminacoes_erradas + 1;

  // Marcar acusado como inativo
  await db.from("jogadores").update({ ativo: false }).eq("id", estado.acusado_id);

  // Verificar limite de eliminações erradas
  const totalJogadores = jogadoresAtivos?.length ?? 0;
  const n = numEspias(totalJogadores);
  const limite = limiteEliminacoesErradas(totalJogadores, n);

  if (novasElim > limite) {
    return encerrarRodada(userId, {
      rodada_id,
      espia_pego: false,
      espia_adivinhou: false,
    });
  }

  // Continuar jogo com eliminação registrada
  const novaOrdem = estado.ordem_turnos.filter((id) => id !== estado.acusado_id);

  await db
    .from("rodadas")
    .update({
      estado: {
        ...estado,
        fase: "jogando",
        acusado_id: null,
        eliminacoes_erradas: novasElim,
        ordem_turnos: novaOrdem,
      },
    })
    .eq("id", rodada_id);

  return { resultado_votacao: "aprovado", espia_pego: false, eliminacoes_erradas: novasElim };
}
