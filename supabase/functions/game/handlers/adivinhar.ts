// supabase/functions/game/handlers/adivinhar.ts
import { getDb }          from "../lib/db.ts";
import { encerrarRodada } from "./encerrar-rodada.ts";
import { EVENTOS }        from "../lib/eventos.ts";
import { proximoTurnoAposEliminacao, todosFalaramNaOrdem } from "../lib/regras.ts";
import { atualizarEstadoComVersao, getJogadorAtor } from "../lib/queries.ts";
import type { AdivinharPayload } from "../lib/types.ts";

export async function adivinhar(userId: string, payload: unknown) {
  const { rodada_id, evento_id, bot_id } = payload as AdivinharPayload;
  if (!rodada_id || !evento_id) throw new Error("rodada_id e evento_id obrigatórios");

  const db = getDb();

  const { data: rodada } = await db
    .from("rodadas")
    .select("estado, sala_id, evento_id, encerrada_em, versao")
    .eq("id", rodada_id)
    .single();

  if (!rodada) throw Object.assign(new Error("Rodada não encontrada"), { status: 404 });
  if (rodada.encerrada_em) throw new Error("Rodada encerrada");

  const estado = rodada.estado;
  // Regra: o espia pode adivinhar "a qualquer momento" — inclui o turno de
  // palavras e o intervalo pergunta→resposta. Exceções: votação em andamento
  // (interrompe o jogo) e adivinhação de fim de tempo (fluxo próprio).
  const fasesPermitidas = ["jogando", "aguardando_resposta", "turno_palavras", "adivinhacao"];
  if (!fasesPermitidas.includes(estado.fase)) {
    throw new Error(`Não é possível adivinhar na fase '${estado.fase}'`);
  }

  const jogador = await getJogadorAtor(db, rodada.sala_id, userId, bot_id);

  if (!estado.espia_ids.includes(jogador.id)) {
    throw Object.assign(new Error("Apenas o espia pode adivinhar"), { status: 403 });
  }

  const eventoValido = EVENTOS.find((e) => e.id === evento_id);
  if (!eventoValido) throw new Error("Evento inválido");

  const acertou = evento_id === rodada.evento_id;

  if (!acertou) {
    await db.from("jogadores").update({ ativo: false }).eq("id", jogador.id);

    // In adivinhacao phase (spy was caught by vote), the round always ends on a wrong guess.
    // In active phases, check whether partner spies are still alive — if so, game continues.
    if (estado.fase !== "adivinhacao") {
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

        // A fase de retomada depende de onde a rodada estava:
        // - turno_palavras: mantém (ou encerra a fase se todos os restantes já falaram);
        // - aguardando_resposta: se o espia era o destinatário ou o perguntador da
        //   pergunta pendente, cancela a pergunta e volta a jogando (o perguntador
        //   pergunta de novo); senão a pergunta segue valendo;
        // - jogando: continua jogando.
        let novaFase = estado.fase;
        let novaPergunta = estado.pergunta_atual ?? null;
        if (estado.fase === "turno_palavras") {
          if (todosFalaramNaOrdem(estado.palavras_turno ?? [], novaOrdem)) novaFase = "jogando";
        } else if (estado.fase === "aguardando_resposta") {
          const p = estado.pergunta_atual;
          if (p && (p.destinatario_id === jogador.id || p.perguntador_id === jogador.id)) {
            novaFase = "jogando";
            novaPergunta = null;
          }
        } else {
          novaFase = "jogando";
        }

        await atualizarEstadoComVersao(db, rodada_id, rodada.versao, {
          ...estado,
          fase: novaFase,
          pergunta_atual: novaPergunta,
          ordem_turnos: novaOrdem,
          turno_atual: proximoTurno,
          acusou_neste_turno: false,
          turno_numero_atual: (estado.turno_numero_atual ?? 1) + (novaVolta ? 1 : 0),
        });
        return { espia_eliminado: true, game_continues: true, turno_atual: proximoTurno };
      }
    }

    return encerrarRodada(userId, {
      rodada_id,
      espia_pego: true,
      espia_adivinhou: false,
      espia_pego_id: jogador.id,
    });
  }

  // Acertou: espia já havia sido pego se estamos na fase adivinhacao
  const espiaPego = estado.fase === "adivinhacao";
  return encerrarRodada(userId, {
    rodada_id,
    espia_pego: espiaPego,
    espia_adivinhou: true,
    espia_pego_id: espiaPego ? jogador.id : undefined,
    espia_adivinhador_id: jogador.id,
  });
}
