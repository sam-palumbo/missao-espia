// supabase/functions/game/handlers/bot-agir.ts
//
// Executa UMA ação pendente de bot na rodada, se houver. O cliente do
// anfitrião chama esta action periodicamente enquanto a rodada está ativa;
// o ritmo das chamadas é o que dá a cadência "humana" aos bots.
//
// As decisões vêm da IA (lib/bot-ia.ts, Groq) quando GROQ_API_KEY está
// configurada, com fallback aleatório (lib/bot.ts) em qualquer falha; a
// execução reusa os handlers normais via bot_id, que validam as regras do
// jogo como para qualquer jogador.
import { getDb } from "../lib/db.ts";
import { getRodadaWithSala, getJogadoresAtivos, forbidden } from "../lib/queries.ts";
import { isPrimeiroTurno } from "../lib/regras.ts";
import { limiteEliminacoesErradas } from "../lib/espias.ts";
import { EVENTOS } from "../lib/eventos.ts";
import { aleatorio, eventoAleatorioId, PALAVRAS_BOT, PERGUNTAS_BOT, RESPOSTAS_BOT } from "../lib/bot.ts";
import {
  acusadoIA, acusarDeflexaoIA, adivinhacaoIA, palavraIA, perguntaIA, respostaIA, votoIA,
  type ContextoBotIA,
} from "../lib/bot-ia.ts";
import { dizerPalavra } from "./dizer-palavra.ts";
import { fazerPergunta } from "./fazer-pergunta.ts";
import { responderPergunta } from "./responder-pergunta.ts";
import { proximoTurno } from "./proximo-turno.ts";
import { acusar } from "./acusar.ts";
import { votar } from "./votar.ts";
import { adivinhar } from "./adivinhar.ts";
import { adivinharFimTempo } from "./adivinhar-fim-tempo.ts";
import type { BotAgirPayload, Jogador } from "../lib/types.ts";

// Quando a IA está disponível, ela decide POR CONFIANÇA: o espia só
// adivinha e o grupo só acusa quando a confiança supera o limiar abaixo —
// alinhado à estratégia de pontos (esconder-se vale 2; errar custa 0).
const LIMIAR_ADIVINHAR_ESPIA = 70; // confiança mínima para o espia arriscar
const LIMIAR_ACUSAR_BASE = 65;     // confiança mínima para acusar (grupo com folga)
const LIMIAR_ACUSAR_SEM_TOLERANCIA = 85; // exigência maior quando 1 erro encerra o jogo
const CHANCE_ESPIA_ACUSAR = 0.12;  // por turno do espia: acusa para desviar suspeita de si

// Chances do fallback aleatório, usadas só quando a IA está indisponível.
const CHANCE_ADIVINHAR_ESPIA = 0.25; // por turno do bot espia, a partir da 3ª volta
const CHANCE_ACUSAR = 0.2;           // por turno do bot, quando acusação é permitida
const CHANCE_VOTO_SIM = 0.6;

export async function botAgir(userId: string, payload: unknown) {
  const { rodada_id } = payload as BotAgirPayload;
  if (!rodada_id) throw new Error("rodada_id obrigatório");

  const db = getDb();
  const rodada = await getRodadaWithSala(db, rodada_id);
  if (rodada.salas.anfitriao !== userId) forbidden("Apenas o anfitrião pode acionar os bots");
  if (rodada.encerrada_em) return { agiu: false };

  const estado = rodada.estado;
  const modo = rodada.salas.modo;

  const { data } = await db
    .from("jogadores")
    .select("*")
    .eq("sala_id", rodada.sala_id)
    .eq("is_bot", true);
  const bots = (data ?? []) as Jogador[];
  if (bots.length === 0) return { agiu: false };
  const botPorId = new Map(bots.map((b) => [b.id, b]));

  const fase = estado.fase;

  const ativos = await getJogadoresAtivos(db, rodada.sala_id);
  const eventoRodada = EVENTOS.find((e) => e.id === rodada.evento_id) ?? null;

  const tempoRestanteSeg = estado.timer_end
    ? (new Date(estado.timer_end).getTime() - Date.now()) / 1000
    : null;
  const tempoAcabando = tempoRestanteSeg != null && tempoRestanteSeg < 90;

  // Contexto que a IA enxerga ao decidir por um bot — o espia nunca recebe o evento.
  function contexto(bot: Jogador): ContextoBotIA {
    const souEspia = estado.espia_ids.includes(bot.id);
    return {
      apelido: bot.apelido,
      souEspia,
      evento: souEspia || !eventoRodada ? null : { evento: eventoRodada.evento, local: eventoRodada.local },
      jogadores: ativos.filter((j) => j.id !== bot.id).map((j) => ({ id: j.id, apelido: j.apelido })),
      palavras: estado.palavras_turno ?? [],
      historico: estado.historico ?? [],
      tempoRestanteSeg,
    };
  }

  // ── Turno de um bot (palavra ou pergunta) ─────────────────────────────
  if (fase === "turno_palavras" || fase === "jogando") {
    const bot = botPorId.get(estado.turno_atual);
    if (!bot) return { agiu: false };

    if (fase === "turno_palavras") {
      // No presencial a palavra é dita em voz alta — só concluir o turno
      if (modo === "presencial") {
        await proximoTurno(userId, { rodada_id });
        return { agiu: true, acao: "proximo_turno" };
      }
      const palavra = (await palavraIA(contexto(bot))) ?? aleatorio(PALAVRAS_BOT);
      await dizerPalavra(userId, { rodada_id, palavra, bot_id: bot.id });
      return { agiu: true, acao: "dizer_palavra" };
    }

    const souEspia = estado.espia_ids.includes(bot.id);

    // Espia: a partir da 3ª volta, a IA estima confiança e só arrisca se for
    // alta o bastante; sem IA, cai no sorteio de chance fixa.
    if (souEspia && (estado.turno_numero_atual ?? 1) >= 3) {
      const palpite = await adivinhacaoIA(contexto(bot));
      const deveAdivinhar = palpite
        ? palpite.confianca >= LIMIAR_ADIVINHAR_ESPIA
        : Math.random() < CHANCE_ADIVINHAR_ESPIA;
      if (deveAdivinhar) {
        await adivinhar(userId, { rodada_id, evento_id: palpite?.evento_id ?? eventoAleatorioId(), bot_id: bot.id });
        return { agiu: true, acao: "adivinhar" };
      }
    }

    const alvos = ativos.filter((j) => j.id !== bot.id);

    // Grupo: a IA aponta o suspeito e sua confiança; o limiar sobe quando o
    // grupo não tem tolerância a erro (4 jogadores). Sem IA, sorteio fixo.
    if (!souEspia && alvos.length > 0 && !estado.acusou_neste_turno && !isPrimeiroTurno(estado)) {
      const suspeito = await acusadoIA(contexto(bot));
      const totalRodada = estado.ordem_turnos.length || ativos.length;
      const limite = limiteEliminacoesErradas(totalRodada, estado.espia_ids.length);
      // Com o tempo acabando, o grupo precisa agir antes do estouro — afrouxa
      // o limiar (mas nunca abaixo de 45, e nunca quando não há tolerância a erro).
      const reducaoTempo = tempoAcabando && limite > 0 ? 15 : 0;
      const limiar = (limite === 0 ? LIMIAR_ACUSAR_SEM_TOLERANCIA : LIMIAR_ACUSAR_BASE) - reducaoTempo;
      const deveAcusar = suspeito
        ? suspeito.confianca >= limiar
        : Math.random() < CHANCE_ACUSAR;
      if (deveAcusar) {
        await acusar(userId, { rodada_id, acusado_id: suspeito?.acusado_id ?? aleatorio(alvos).id, bot_id: bot.id });
        return { agiu: true, acao: "acusar" };
      }
    }

    // Espia: ocasionalmente acusa para desviar a suspeita de si e se misturar.
    if (
      souEspia && alvos.length > 0 && !estado.acusou_neste_turno &&
      !isPrimeiroTurno(estado) && Math.random() < CHANCE_ESPIA_ACUSAR
    ) {
      const alvo = (await acusarDeflexaoIA(contexto(bot)))?.acusado_id ?? aleatorio(alvos).id;
      await acusar(userId, { rodada_id, acusado_id: alvo, bot_id: bot.id });
      return { agiu: true, acao: "acusar" };
    }

    if (modo === "presencial" || alvos.length === 0) {
      await proximoTurno(userId, { rodada_id });
      return { agiu: true, acao: "proximo_turno" };
    }

    const pergunta = await perguntaIA(contexto(bot));
    await fazerPergunta(userId, {
      rodada_id,
      destinatario_id: pergunta?.destinatario_id ?? aleatorio(alvos).id,
      texto: pergunta?.texto ?? aleatorio(PERGUNTAS_BOT),
      bot_id: bot.id,
    });
    return { agiu: true, acao: "fazer_pergunta" };
  }

  // ── Bot deve responder a pergunta pendente ────────────────────────────
  if (fase === "aguardando_resposta") {
    const perguntaAtual = estado.pergunta_atual;
    const bot = perguntaAtual ? botPorId.get(perguntaAtual.destinatario_id) : undefined;
    if (!bot || !perguntaAtual) return { agiu: false };
    const resposta = (await respostaIA(contexto(bot), perguntaAtual)) ?? aleatorio(RESPOSTAS_BOT);
    await responderPergunta(userId, { rodada_id, resposta, bot_id: bot.id });
    return { agiu: true, acao: "responder_pergunta" };
  }

  // ── Bots votam na acusação em andamento (um por chamada) ──────────────
  if (fase === "votacao") {
    const { data: votos } = await db
      .from("votos")
      .select("votante_id")
      .eq("rodada_id", rodada_id)
      .eq("acusado_id", estado.acusado_id);
    const jaVotaram = new Set((votos ?? []).map((v) => v.votante_id));
    const pendente = bots.find((b) => b.ativo && b.id !== estado.acusado_id && !jaVotaram.has(b.id));
    if (!pendente) return { agiu: false };
    const acusadoApelido = ativos.find((j) => j.id === estado.acusado_id)?.apelido ?? "?";
    // Custo alto: um erro agora encerra o jogo (ou já está no limite de erros).
    const totalRodada = estado.ordem_turnos.length || ativos.length;
    const limite = limiteEliminacoesErradas(totalRodada, estado.espia_ids.length);
    const custoErroAlto = (estado.eliminacoes_erradas ?? 0) >= limite;
    const aprovado = (await votoIA(contexto(pendente), acusadoApelido, custoErroAlto)) ?? (Math.random() < CHANCE_VOTO_SIM);
    await votar(userId, { rodada_id, aprovado, bot_id: pendente.id });
    return { agiu: true, acao: "votar" };
  }

  // ── Bot espia pego por votação tem 30s para adivinhar ─────────────────
  if (fase === "adivinhacao") {
    const bot = estado.acusado_id ? botPorId.get(estado.acusado_id) : undefined;
    if (!bot || !estado.espia_ids.includes(bot.id)) return { agiu: false };
    const evento_id = (await adivinhacaoIA(contexto(bot)))?.evento_id ?? eventoAleatorioId();
    await adivinhar(userId, { rodada_id, evento_id, bot_id: bot.id });
    return { agiu: true, acao: "adivinhar" };
  }

  // ── Fim de tempo: bots espias com adivinhação pendente ────────────────
  if (fase === "adivinhacao_fim_tempo") {
    const pendentes = Object.entries(estado.adivinhacoes_fim_tempo ?? {})
      .filter(([id, guess]) => guess == null && botPorId.has(id));
    if (pendentes.length === 0) return { agiu: false };
    const bot = botPorId.get(pendentes[0][0])!;
    const evento_id = (await adivinhacaoIA(contexto(bot)))?.evento_id ?? eventoAleatorioId();
    await adivinharFimTempo(userId, { rodada_id, evento_id, bot_id: bot.id });
    return { agiu: true, acao: "adivinhar_fim_tempo" };
  }

  return { agiu: false };
}
