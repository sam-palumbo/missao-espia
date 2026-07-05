// supabase/functions/game/handlers/votar.ts
import { getDb }                 from "../lib/db.ts";
import { limiteEliminacoesErradas } from "../lib/espias.ts";
import { atualizarEstadoComVersao, getJogadorAtor } from "../lib/queries.ts";
import { classificarResultadoVotacao, resolverVotacao, validarVoto } from "../lib/votacao.ts";
import { encerrarRodada }        from "./encerrar-rodada.ts";
import type { EstadoRodada, HistoricoVotacao, VotarPayload } from "../lib/types.ts";

export async function votar(userId: string, payload: unknown) {
  const { rodada_id, aprovado, bot_id } = payload as VotarPayload;
  if (!rodada_id || typeof aprovado !== "boolean") throw new Error("Campos obrigatórios ausentes");

  const db = getDb();

  const { data: rodada } = await db
    .from("rodadas")
    .select("estado, sala_id, encerrada_em, versao")
    .eq("id", rodada_id)
    .single();

  if (!rodada) throw Object.assign(new Error("Rodada não encontrada"), { status: 404 });
  if (rodada.encerrada_em) throw new Error("Rodada encerrada");

  const estado = rodada.estado as EstadoRodada;
  if (estado.fase !== "votacao") throw new Error("Não há votação em andamento");

  // Buscar jogador votante
  const votante = await getJogadorAtor(db, rodada.sala_id, userId, bot_id);

  if (!votante.ativo) throw Object.assign(new Error("Jogador não encontrado ou eliminado"), { status: 403 });
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
    .select("id, apelido")
    .eq("sala_id", rodada.sala_id)
    .eq("ativo", true);

  const elegiveis = (jogadoresAtivos ?? []).filter((j) => j.id !== estado.acusado_id);

  const { data: votos } = await db
    .from("votos")
    .select("votante_id, aprovado")
    .eq("rodada_id", rodada_id)
    .eq("acusado_id", estado.acusado_id);

  const resultado = resolverVotacao(votos ?? [], elegiveis.length);

  if (resultado === "aguardando") {
    return { aguardando_votos: true, votos_recebidos: votos?.length ?? 0 };
  }

  // Construir entrada de histórico para esta votação
  const acusadoEhEspia = estado.espia_ids.includes(estado.acusado_id!);
  const { data: acusadoRow } = await db
    .from("jogadores")
    .select("apelido")
    .eq("id", estado.acusado_id)
    .single();
  const acusadoApelido = acusadoRow?.apelido ?? "?";

  const apelidoPorId = new Map<string, string>(
    (jogadoresAtivos ?? []).map((j) => [j.id, j.apelido]),
  );

  const historicoVotacao: HistoricoVotacao = {
    tipo: "votacao",
    acusado_apelido: acusadoApelido,
    votos: (votos ?? []).map((v) => ({
      votante_apelido: apelidoPorId.get(v.votante_id) ?? "?",
      aprovado: v.aprovado,
    })),
    resultado: classificarResultadoVotacao(resultado, acusadoEhEspia),
  };

  const historicoComVotacao = [...(estado.historico ?? []), historicoVotacao];

  // Limpar votos desta acusação para permitir nova acusação contra o mesmo jogador
  await db.from("votos").delete().eq("rodada_id", rodada_id).eq("acusado_id", estado.acusado_id);

  if (resultado === "rejeitado") {
    // Votação rejeitada: voltar para jogando. acusou_neste_turno permanece true —
    // regra: no máximo UMA acusação por turno, mesmo rejeitada; o jogador ainda
    // faz sua pergunta e só pode acusar de novo no próximo turno dele.
    await atualizarEstadoComVersao(db, rodada_id, rodada.versao, {
      ...estado, fase: "jogando", acusado_id: null, historico: historicoComVotacao,
    });
    return { resultado_votacao: "rejeitado" };
  }

  if (acusadoEhEspia) {
    // Espia pego — remover do turno e dar 30 segundos para adivinhar (regra da acusação)
    const novaOrdem = estado.ordem_turnos.filter((id) => id !== estado.acusado_id!);
    await atualizarEstadoComVersao(db, rodada_id, rodada.versao, {
      ...estado,
      fase: "adivinhacao",
      ordem_turnos: novaOrdem,
      historico: historicoComVotacao,
      timer_adivinhacao_end: new Date(Date.now() + 30_000).toISOString(),
    });
    return { resultado_votacao: "aprovado", espia_pego: true, fase: "adivinhacao" };
  }

  // Eliminação errada
  const novasElim = estado.eliminacoes_erradas + 1;

  // Marcar acusado como inativo
  await db.from("jogadores").update({ ativo: false }).eq("id", estado.acusado_id);

  // Limite de eliminações erradas conforme a tabela das regras, calculado com
  // os participantes do INÍCIO da rodada: nº de espias sorteados (espia_ids) e
  // total de jogadores da sala (iniciar_rodada reativa todos). Recalcular com os
  // ativos atuais subestimaria o limite conforme jogadores são eliminados.
  const { count: totalJogadoresRodada } = await db
    .from("jogadores")
    .select("id", { count: "exact", head: true })
    .eq("sala_id", rodada.sala_id);
  const n = estado.espia_ids.length;
  const limite = limiteEliminacoesErradas(totalJogadoresRodada ?? 4, n);

  // Eliminações erradas são TOLERADAS até o limite — espias só vencem ao ultrapassá-lo.
  // Persistir histórico antes de eventualmente encerrar — encerrarRodada não toca historico
  if (novasElim > limite) {
    await atualizarEstadoComVersao(db, rodada_id, rodada.versao, {
      ...estado, historico: historicoComVotacao,
    });
    return encerrarRodada(userId, {
      rodada_id,
      espia_pego: false,
      espia_adivinhou: false,
    });
  }

  // Continuar jogo com eliminação registrada
  // acusar.ts garante acusado_id !== turno_atual, logo turno_atual não precisa ser atualizado
  const novaOrdem = estado.ordem_turnos.filter((id) => id !== estado.acusado_id);

  await atualizarEstadoComVersao(db, rodada_id, rodada.versao, {
    ...estado,
    fase: "jogando",
    acusado_id: null,
    eliminacoes_erradas: novasElim,
    ordem_turnos: novaOrdem,
    historico: historicoComVotacao,
  });

  return { resultado_votacao: "aprovado", espia_pego: false, eliminacoes_erradas: novasElim };
}
