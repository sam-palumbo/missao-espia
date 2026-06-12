"use client";
import { use, useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { motion } from "motion/react";
import { EVENTOS } from "@/lib/eventos";
import { usePlayers } from "@/hooks/usePlayers";
import { useGameState } from "@/hooks/useGameState";
import { useAuth } from "@/hooks/useAuth";
import { useTimer } from "@/hooks/useTimer";
import { gameActions } from "@/lib/game-actions";
import { useSala } from "@/hooks/useSala";
import { toast } from "sonner";
import { PageShell, InsetFrame, Eyebrow, T, F } from "@/components/ui/design";
import { isPrimeiroTurno, isEspia, estaForaDoTurno, isMeuTurno } from "@shared/regras";
import { TurnoPresencial } from "./turno-presencial";
import HistoricoTabs from "./historico-tabs";
import { RevealScreen } from "./reveal-screen";
import { PlayersGrid } from "./players-grid";
import { ActionButtons } from "./action-buttons";
import { OverlayVotacao } from "./overlay-votacao";
import { SheetAcusar } from "./sheet-acusar";
import { SheetFazerPergunta } from "./sheet-fazer-pergunta";
import { SheetResponderPergunta } from "./sheet-responder-pergunta";
import { SheetDizerPalavra } from "./sheet-dizer-palavra";
import { SheetAdivinhar } from "./sheet-adivinhar";
import { SheetMinhaCarta } from "./sheet-minha-carta";
import { BannerFimTempo } from "./banner-fim-tempo";

export default function JogoPage({ params }: { params: Promise<{ code: string }> }) {
  const { code } = use(params);
  const router = useRouter();
  const { user } = useAuth();
  const { sala } = useSala(code);
  const salaId = sala?.id ?? null;
  const players = usePlayers(salaId);
  const rodada = useGameState(salaId);

  const modo = sala?.modo ?? "online";
  const testamentos = sala?.testamentos ?? ["AT", "NT"];
  const anfitriao = sala?.anfitriao ?? null;
  const [isRevealed, setIsRevealed] = useState(false);
  const [showAccuse, setShowAccuse] = useState(false);
  const [showGuess, setShowGuess] = useState(false);
  const [showWordInput, setShowWordInput] = useState(false);
  const [wordInput, setWordInput] = useState("");
  const [showAskQuestion, setShowAskQuestion] = useState(false);
  const [questionInput, setQuestionInput] = useState("");
  const [selectedRecipientId, setSelectedRecipientId] = useState<string | null>(null);
  const [showAnswerQuestion, setShowAnswerQuestion] = useState(false);
  const [answerInput, setAnswerInput] = useState("");
  const [selectedGuessId, setSelectedGuessId] = useState<number | null>(null);
  const [selectedFimTempoGuessId, setSelectedFimTempoGuessId] = useState<number | null>(null);
  const [acting, setActing] = useState(false);
  const [jaVotei, setJaVotei] = useState(false);
  const [showMyCard, setShowMyCard] = useState(false);
  const [showFimTempoGuess, setShowFimTempoGuess] = useState(false);
  const [adivinheiNaFimTempo, setAdivinheiNaFimTempo] = useState(false);

  const { display, secs, pct } = useTimer(rodada?.estado.timer_end ?? null);
  const adivTimer = useTimer(rodada?.estado.timer_adivinhacao_end ?? null);

  const encerradoPorTempoRef = useRef(false);
  const finalizadoFimTempoRef = useRef(false);
  const lastRodadaIdRef = useRef<string | null>(null);

  useEffect(() => {
    if (rodada?.estado.fase === "resultado") router.push(`/sala/${code}/resultado`);
  }, [rodada?.estado.fase, code, router]);

  useEffect(() => {
    setJaVotei(false);
  }, [rodada?.estado.acusado_id]);

  const meuJogador = players.find(p => p.user_id === user?.id);

  useEffect(() => {
    if (rodada?.estado.fase === "aguardando_resposta" && rodada.estado.pergunta_atual) {
      const isRecipient = rodada.estado.pergunta_atual.destinatario_id === meuJogador?.id;
      if (isRecipient) setShowAnswerQuestion(true);
    } else {
      setShowAnswerQuestion(false);
    }
  }, [rodada?.estado.fase, rodada?.estado.pergunta_atual, meuJogador?.id]);

  const isSpy = rodada && meuJogador ? isEspia(rodada.estado, meuJogador.id) : false;
  const ehMeuTurno = rodada && meuJogador ? isMeuTurno(rodada.estado, meuJogador.id) : false;
  const fase = rodada?.estado.fase ?? "jogando";

  useEffect(() => {
    if (rodada?.id && rodada.id !== lastRodadaIdRef.current) {
      lastRodadaIdRef.current = rodada.id;
      encerradoPorTempoRef.current = false;
      finalizadoFimTempoRef.current = false;
      setAdivinheiNaFimTempo(false);
      setShowFimTempoGuess(false);
      setSelectedFimTempoGuessId(null);
      setShowAskQuestion(false);
      setShowWordInput(false);
    }
  }, [rodada?.id]);

  useEffect(() => {
    // Inclui "aguardando_resposta" e "turno_palavras" para cobrir o caso em que o timer
    // expira enquanto uma pergunta está pendente de resposta ou na fase de palavras.
    const faseAtiva = fase === "jogando" || fase === "aguardando_resposta" || fase === "turno_palavras";
    if (secs === 0 && faseAtiva && rodada && !encerradoPorTempoRef.current && user?.id === anfitriao && new Date() > new Date(rodada.estado.timer_end)) {
      encerradoPorTempoRef.current = true;
      gameActions.encerrarPorTempo(rodada.id).catch(() => {});
    }
  }, [secs, fase, rodada, user, anfitriao]);

  useEffect(() => {
    // Cobre as duas fases com timer de adivinhação: fim por tempo (todos os espias)
    // e espia pego por votação (30s para adivinhar antes de encerrar como pego).
    const faseAdivinhacao = fase === "adivinhacao_fim_tempo" || fase === "adivinhacao";
    if (adivTimer.secs === 0 && faseAdivinhacao && rodada?.estado.timer_adivinhacao_end && !finalizadoFimTempoRef.current && new Date() > new Date(rodada.estado.timer_adivinhacao_end)) {
      finalizadoFimTempoRef.current = true;
      gameActions.finalizarAdivinhacaoFimTempo(rodada.id).catch(() => {});
    }
  }, [adivTimer.secs, fase, rodada]);

  useEffect(() => {
    if (fase === "adivinhacao_fim_tempo" && isSpy && !adivinheiNaFimTempo) setShowFimTempoGuess(true);
  }, [fase, isSpy, adivinheiNaFimTempo]);


  // Combina dois sinais por causa da race condition entre usePlayers e useGameState:
  // useGameState pode atualizar ordem_turnos antes de usePlayers refletir ativo=false (e vice-versa).
  const meuEliminado =
    meuJogador?.ativo === false ||
    (!!meuJogador && !!rodada && estaForaDoTurno(rodada.estado, meuJogador.id));

  useEffect(() => {
    if (meuEliminado) {
      setShowAccuse(false);
      setShowGuess(false);
      setShowWordInput(false);
      setShowAskQuestion(false);
      setShowFimTempoGuess(false);
    }
  }, [meuEliminado]);

  // Espia pego por votação: abre o sheet de adivinhação automaticamente — ele
  // tem 30s e não deve perder tempo procurando o botão. Declarado APÓS o efeito
  // de meuEliminado: o espia pego sai de ordem_turnos (meuEliminado=true) no
  // mesmo update que muda a fase, e este efeito precisa prevalecer.
  useEffect(() => {
    if (fase === "adivinhacao" && rodada?.estado.acusado_id && rodada.estado.acusado_id === meuJogador?.id) {
      setShowGuess(true);
    }
  }, [fase, rodada?.estado.acusado_id, meuJogador?.id]);

  // O cliente do anfitrião dá o "tique" dos bots: a cada chamada o servidor
  // executa no máximo uma ação de bot pendente (bot_agir), o que define a
  // cadência das jogadas. Erros (ex: 409 de lock otimista) são ignorados —
  // o próximo tique tenta de novo sobre o estado atual.
  const temBots = players.some(p => p.is_bot);
  const rodadaId = rodada?.id ?? null;
  const rodadaEncerrada = !!rodada?.encerrada_em;
  useEffect(() => {
    if (!temBots || !rodadaId || rodadaEncerrada || !user?.id || user.id !== anfitriao) return;
    const interval = setInterval(() => {
      gameActions.botAgir(rodadaId).catch(() => {});
    }, 3000);
    return () => clearInterval(interval);
  }, [temBots, rodadaId, rodadaEncerrada, user?.id, anfitriao]);

  // Envolve uma ação de jogo com o ciclo padrão setActing/try-catch-toast/finally.
  // onSuccess roda só se a ação resolver sem erro.
  async function runAction(action: () => Promise<unknown>, errMsg: string, onSuccess?: () => void) {
    setActing(true);
    try {
      await action();
      onSuccess?.();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : errMsg);
    } finally {
      setActing(false);
    }
  }

  async function handleAcusar(acusadoId: string) {
    if (!rodada) return;
    await runAction(() => gameActions.acusar(rodada.id, acusadoId), "Erro ao acusar", () => setShowAccuse(false));
  }

  async function handleVotar(aprovado: boolean) {
    if (!rodada) return;
    await runAction(() => gameActions.votar(rodada.id, aprovado), "Erro ao votar", () => setJaVotei(true));
  }

  async function handleAdivinhar() {
    if (!rodada || selectedGuessId === null) return;
    await runAction(() => gameActions.adivinhar(rodada.id, selectedGuessId), "Erro ao adivinhar", () => setShowGuess(false));
  }

  async function handleAdivinharFimTempo() {
    if (!rodada || selectedFimTempoGuessId === null) return;
    await runAction(
      () => gameActions.adivinharFimTempo(rodada.id, selectedFimTempoGuessId),
      "Erro ao adivinhar",
      () => { setAdivinheiNaFimTempo(true); setShowFimTempoGuess(false); setSelectedFimTempoGuessId(null); },
    );
  }

  async function handleDizerPalavra() {
    if (!rodada || !wordInput.trim()) return;
    await runAction(() => gameActions.dizerPalavra(rodada.id, wordInput.trim()), "Erro ao dizer palavra", () => { setWordInput(""); setShowWordInput(false); });
  }

  async function handleFazerPergunta() {
    if (!rodada || !selectedRecipientId || !questionInput.trim()) return;
    // Guard: se uma nova rodada começou enquanto o sheet estava aberto, o estado já
    // estará em fase "turno_palavras" mesmo antes do useEffect fechar o sheet.
    if (turnoPalavras) { setShowAskQuestion(false); return; }
    await runAction(
      () => gameActions.fazerPergunta(rodada.id, selectedRecipientId, questionInput.trim()),
      "Erro ao fazer pergunta",
      () => { setQuestionInput(""); setSelectedRecipientId(null); setShowAskQuestion(false); },
    );
  }

  async function handleResponderPergunta() {
    if (!rodada || !answerInput.trim()) return;
    await runAction(() => gameActions.responderPergunta(rodada.id, answerInput.trim()), "Erro ao responder pergunta", () => { setAnswerInput(""); setShowAnswerQuestion(false); });
  }

  async function handleProximoTurno() {
    if (!rodada) return;
    await runAction(() => gameActions.proximoTurno(rodada.id), "Erro ao avançar turno");
  }

  function handleClickTurnoAction() {
    if (modo === "presencial") { handleProximoTurno(); return; }
    if (turnoPalavras) setShowWordInput(true);
    else setShowAskQuestion(true);
  }

  if (!isRevealed && rodada) {
    return <RevealScreen isSpy={isSpy} evento={EVENTOS.find(e => e.id === rodada.evento_id)} onReveal={() => setIsRevealed(true)} />;
  }

  const timerColor = pct < 0.15 ? T.brick : pct < 0.4 ? T.gold : T.sienna;
  const timerBarPct = Math.round(pct * 100);
  const currentPlayer = players.find(p => p.id === rodada?.estado.turno_atual);
  const evento = EVENTOS.find(e => e.id === rodada?.evento_id);
  const acusadoNome = rodada?.estado.acusado_id ? players.find(p => p.id === rodada.estado.acusado_id)?.apelido ?? null : null;
  const turnoPalavras = rodada?.estado.fase === "turno_palavras";
  const acusouNesteTurno = rodada?.estado.acusou_neste_turno ?? false;
  const primeiroTurno = rodada ? isPrimeiroTurno(rodada.estado) : true;

  return (
    <PageShell style={{ gap: 14 }}>

      {/* TopBar */}
      <div style={{ position: "relative", zIndex: 1, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div>
          <Eyebrow color={T.inkSoft} size={10}>Sala {code}</Eyebrow>
          <div style={{ fontFamily: F.serif, fontSize: 16, fontWeight: 600, color: T.ink, marginTop: 2 }}>Rodada {rodada?.numero ?? "—"}</div>
        </div>
        <div style={{ fontFamily: F.mono, fontSize: 11, fontWeight: 700, color: T.sienna, background: T.siennaSoft, padding: "4px 10px", borderRadius: 999, letterSpacing: "0.1em" }}>
          R{rodada?.numero ?? 1}
        </div>
      </div>

      {/* Timer */}
      <div style={{ position: "relative", zIndex: 1, background: T.card, borderRadius: 22, padding: "20px 18px", boxShadow: "0 10px 28px -16px rgba(58,42,20,0.3)", textAlign: "center", overflow: "hidden" }}>
        {/* Urgency pulse overlay */}
        {pct < 0.15 && (
          <motion.div
            animate={{ opacity: [0, 0.1, 0] }}
            transition={{ duration: 1.1, repeat: Infinity, ease: "easeInOut" }}
            style={{ position: "absolute", inset: 0, background: T.brick, borderRadius: 22, pointerEvents: "none" }}
          />
        )}
        <InsetFrame color={pct < 0.15 ? T.brick : T.sienna} inset={6} radius={18} />
        <div style={{ position: "relative" }}>
          <Eyebrow color={T.inkSoft} size={9}>Tempo restante</Eyebrow>
          <motion.div
            animate={pct < 0.15 ? { scale: [1, 1.05, 1] } : { scale: 1 }}
            transition={pct < 0.15
              ? { duration: 1.1, repeat: Infinity, ease: "easeInOut" }
              : { duration: 0.3 }}
            style={{ fontFamily: F.serif, fontSize: 56, fontWeight: 600, letterSpacing: "-0.02em", lineHeight: 1, color: timerColor, marginTop: 6, fontVariantNumeric: "tabular-nums", transition: "color 0.5s" }}
          >
            {display}
          </motion.div>
          <div style={{ marginTop: 12, height: 6, background: T.siennaSoft, borderRadius: 3, overflow: "hidden" }}>
            <div style={{ width: `${timerBarPct}%`, height: "100%", background: `linear-gradient(90deg, ${T.sienna}, ${T.gold})`, borderRadius: 3, transition: "width 1s linear" }} />
          </div>
        </div>
      </div>

      {currentPlayer && (
        <TurnoPresencial
          isMinhaVez={currentPlayer.id === meuJogador?.id}
          jogadorAtualApelido={currentPlayer.apelido}
          turnoPalavras={turnoPalavras}
        />
      )}

      <PlayersGrid players={players} turnoAtual={rodada?.estado.turno_atual} />

      <HistoricoTabs
        historico={rodada?.estado.historico ?? []}
        palavrasTurno={rodada?.estado.palavras_turno ?? []}
      />

      <div style={{ flex: 1 }} />

      <ActionButtons
        isSpy={isSpy}
        ehMeuTurno={ehMeuTurno}
        meuEliminado={meuEliminado}
        fase={fase}
        turnoPalavras={turnoPalavras}
        primeiroTurno={primeiroTurno}
        acusouNesteTurno={acusouNesteTurno}
        modo={modo}
        acting={acting}
        onMinhaCarta={() => setShowMyCard(true)}
        onAdivinhar={() => setShowGuess(true)}
        onClickTurnoAction={handleClickTurnoAction}
        onAcusar={() => setShowAccuse(true)}
        onProximoTurno={handleProximoTurno}
      />

      {/* banner oculto durante votação — overlay de votação já exibe mensagem de observador */}
      {/* banner oculto para espia pego durante adivinhacao — ele ainda precisa adivinhar */}
      {meuEliminado && fase !== "votacao" && !(isSpy && fase === "adivinhacao") && (
        <div style={{ position: "relative", zIndex: 1, background: T.brick, borderRadius: 14, padding: "12px 16px", textAlign: "center" }}>
          <span style={{ fontFamily: F.sans, fontSize: 13, fontWeight: 700, color: "white", letterSpacing: "0.05em", textTransform: "uppercase" }}>
            Você foi eliminado — apenas observe
          </span>
        </div>
      )}

      {fase === "votacao" && (
        <OverlayVotacao
          acusadoNome={acusadoNome}
          meuEliminado={meuEliminado}
          meuId={meuJogador?.id}
          acusadoId={rodada?.estado.acusado_id ?? undefined}
          acting={acting}
          jaVotei={jaVotei}
          onVotar={handleVotar}
        />
      )}

      <SheetAcusar open={showAccuse} onClose={() => setShowAccuse(false)} players={players} meuId={meuJogador?.id} acting={acting} onAcusar={handleAcusar} />
      <SheetFazerPergunta open={showAskQuestion} onClose={() => setShowAskQuestion(false)} players={players} meuId={meuJogador?.id} selectedRecipientId={selectedRecipientId} setSelectedRecipientId={setSelectedRecipientId} questionInput={questionInput} setQuestionInput={setQuestionInput} acting={acting} onSubmit={handleFazerPergunta} />
      <SheetResponderPergunta open={showAnswerQuestion} perguntaAtual={rodada?.estado.pergunta_atual} answerInput={answerInput} setAnswerInput={setAnswerInput} acting={acting} onSubmit={handleResponderPergunta} onClose={() => { setShowAnswerQuestion(false); setAnswerInput(""); }} />
      <SheetDizerPalavra open={showWordInput} onClose={() => setShowWordInput(false)} wordInput={wordInput} setWordInput={setWordInput} acting={acting} onSubmit={handleDizerPalavra} />
      <SheetAdivinhar open={showGuess} onClose={() => setShowGuess(false)} title="Adivinhar Local" selectedGuessId={selectedGuessId} setSelectedGuessId={setSelectedGuessId} acting={acting} onConfirm={handleAdivinhar} testamentos={testamentos} timerDisplay={fase === "adivinhacao" ? adivTimer.display : undefined} />
      <SheetAdivinhar open={showFimTempoGuess} title="Tempo Esgotado — Adivinha o Local" selectedGuessId={selectedFimTempoGuessId} setSelectedGuessId={setSelectedFimTempoGuessId} acting={acting} onConfirm={handleAdivinharFimTempo} testamentos={testamentos} timerDisplay={adivTimer.display} />
      {fase === "adivinhacao_fim_tempo" && !isSpy && <BannerFimTempo adivTimerDisplay={adivTimer.display} />}
      {fase === "adivinhacao" && !isSpy && (
        <BannerFimTempo
          adivTimerDisplay={adivTimer.display}
          title="Espia desmascarado!"
          subtitle="O espia tem 30 segundos para tentar adivinhar o local…"
        />
      )}
      <SheetMinhaCarta open={showMyCard} onClose={() => setShowMyCard(false)} isSpy={isSpy} evento={evento} testamentos={testamentos} />
    </PageShell>
  );
}
