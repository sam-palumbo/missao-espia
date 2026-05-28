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
import { createClient } from "@/lib/supabase";
import { toast } from "sonner";
import { ParchmentBg, InsetFrame, Eyebrow, T, F } from "@/components/ui/design";
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
  const [salaId, setSalaId] = useState<string | null>(null);
  const players = usePlayers(salaId);
  const rodada = useGameState(salaId);

  const [modo, setModo] = useState<"online" | "presencial">("online")
  const [testamentos, setTestamentos] = useState<string[]>(["AT", "NT"]);
  const [anfitriao, setAnfitriao] = useState<string | null>(null);
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
    const supabase = createClient();
    supabase.from("salas").select("id, modo, testamentos, anfitriao").eq("codigo", code).single()
      .then(({ data }) => {
        if (data) {
          setSalaId(data.id);
          setModo(data.modo ?? "online");
          setTestamentos(data.testamentos ?? ["AT", "NT"]);
          setAnfitriao(data.anfitriao ?? null);
        }
      });
  }, [code]);

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
    if (adivTimer.secs === 0 && fase === "adivinhacao_fim_tempo" && rodada?.estado.timer_adivinhacao_end && !finalizadoFimTempoRef.current && new Date() > new Date(rodada.estado.timer_adivinhacao_end)) {
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

  async function handleAcusar(acusadoId: string) {
    if (!rodada) return;
    setActing(true);
    try { await gameActions.acusar(rodada.id, acusadoId); setShowAccuse(false); }
    catch (err) { toast.error(err instanceof Error ? err.message : "Erro ao acusar"); }
    finally { setActing(false); }
  }

  async function handleVotar(aprovado: boolean) {
    if (!rodada) return;
    setActing(true);
    try { await gameActions.votar(rodada.id, aprovado); setJaVotei(true); }
    catch (err) { toast.error(err instanceof Error ? err.message : "Erro ao votar"); }
    finally { setActing(false); }
  }

  async function handleAdivinhar() {
    if (!rodada || selectedGuessId === null) return;
    setActing(true);
    try { await gameActions.adivinhar(rodada.id, selectedGuessId); setShowGuess(false); }
    catch (err) { toast.error(err instanceof Error ? err.message : "Erro ao adivinhar"); }
    finally { setActing(false); }
  }

  async function handleAdivinharFimTempo() {
    if (!rodada || selectedFimTempoGuessId === null) return;
    setActing(true);
    try {
      await gameActions.adivinharFimTempo(rodada.id, selectedFimTempoGuessId);
      setAdivinheiNaFimTempo(true);
      setShowFimTempoGuess(false);
      setSelectedFimTempoGuessId(null);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erro ao adivinhar");
    } finally {
      setActing(false);
    }
  }

  async function handleDizerPalavra() {
    if (!rodada || !wordInput.trim()) return;
    setActing(true);
    try { await gameActions.dizerPalavra(rodada.id, wordInput.trim()); setWordInput(""); setShowWordInput(false); }
    catch (err) { toast.error(err instanceof Error ? err.message : "Erro ao dizer palavra"); }
    finally { setActing(false); }
  }

  async function handleFazerPergunta() {
    if (!rodada || !selectedRecipientId || !questionInput.trim()) return;
    // Guard: se uma nova rodada começou enquanto o sheet estava aberto, o estado já
    // estará em fase "turno_palavras" mesmo antes do useEffect fechar o sheet.
    if (turnoPalavras) { setShowAskQuestion(false); return; }
    setActing(true);
    try { await gameActions.fazerPergunta(rodada.id, selectedRecipientId, questionInput.trim()); setQuestionInput(""); setSelectedRecipientId(null); setShowAskQuestion(false); }
    catch (err) { toast.error(err instanceof Error ? err.message : "Erro ao fazer pergunta"); }
    finally { setActing(false); }
  }

  async function handleResponderPergunta() {
    if (!rodada || !answerInput.trim()) return;
    setActing(true);
    try { await gameActions.responderPergunta(rodada.id, answerInput.trim()); setAnswerInput(""); setShowAnswerQuestion(false); }
    catch (err) { toast.error(err instanceof Error ? err.message : "Erro ao responder pergunta"); }
    finally { setActing(false); }
  }

  async function handleProximoTurno() {
    if (!rodada) return;
    setActing(true);
    try { await gameActions.proximoTurno(rodada.id); }
    catch (err) { toast.error(err instanceof Error ? err.message : "Erro ao avançar turno"); }
    finally { setActing(false); }
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
    <main className="page-root" style={{ position: "relative", minHeight: "100dvh", display: "flex", flexDirection: "column", padding: "62px clamp(20px, 5vw, 56px) 48px", background: T.bg, gap: 14 }}>
      <ParchmentBg />

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
      <SheetAdivinhar open={showGuess} onClose={() => setShowGuess(false)} title="Adivinhar Local" selectedGuessId={selectedGuessId} setSelectedGuessId={setSelectedGuessId} acting={acting} onConfirm={handleAdivinhar} testamentos={testamentos} />
      <SheetAdivinhar open={showFimTempoGuess} title="Tempo Esgotado — Adivinha o Local" selectedGuessId={selectedFimTempoGuessId} setSelectedGuessId={setSelectedFimTempoGuessId} acting={acting} onConfirm={handleAdivinharFimTempo} testamentos={testamentos} />
      {fase === "adivinhacao_fim_tempo" && !isSpy && <BannerFimTempo adivTimerDisplay={adivTimer.display} />}
      <SheetMinhaCarta open={showMyCard} onClose={() => setShowMyCard(false)} isSpy={isSpy} evento={evento} testamentos={testamentos} />
    </main>
  );
}
