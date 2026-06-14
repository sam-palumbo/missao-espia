"use client";
import { use } from "react";
import { motion } from "motion/react";
import { PageShell, InsetFrame, Eyebrow, T, F } from "@/components/ui/design";
import { useJogo } from "./use-jogo";
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
  const {
    rodada, players, modo, testamentos, meuJogador,
    isSpy, ehMeuTurno, fase, meuEliminado, evento, currentPlayer,
    acusadoNome, turnoPalavras, acusouNesteTurno, primeiroTurno,
    display, pct, timerColor, timerBarPct, adivTimer,
    isRevealed, setIsRevealed,
    showAccuse, setShowAccuse,
    showGuess, setShowGuess,
    showWordInput, setShowWordInput,
    wordInput, setWordInput,
    showAskQuestion, setShowAskQuestion,
    questionInput, setQuestionInput,
    selectedRecipientId, setSelectedRecipientId,
    showAnswerQuestion, setShowAnswerQuestion,
    answerInput, setAnswerInput,
    selectedGuessId, setSelectedGuessId,
    selectedFimTempoGuessId, setSelectedFimTempoGuessId,
    acting, jaVotei,
    showMyCard, setShowMyCard,
    showFimTempoGuess, setShowFimTempoGuess,
    handleAcusar, handleVotar, handleAdivinhar, handleAdivinharFimTempo,
    handleDizerPalavra, handleFazerPergunta, handleResponderPergunta,
    handleProximoTurno, handleClickTurnoAction,
  } = useJogo(code);

  if (!isRevealed && rodada) {
    return <RevealScreen isSpy={isSpy} evento={evento} onReveal={() => setIsRevealed(true)} />;
  }

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
          fase={fase}
        />
      )}

      <PlayersGrid players={players} turnoAtual={rodada?.estado.turno_atual} />

      <HistoricoTabs
        historico={rodada?.estado.historico ?? []}
        palavrasTurno={rodada?.estado.palavras_turno ?? []}
        perguntaAtual={fase === "aguardando_resposta" ? rodada?.estado.pergunta_atual ?? null : null}
        turnoNumeroAtual={rodada?.estado.turno_numero_atual ?? 1}
      />

      {/* Barra de ações fixa no rodapé — sangra de ponta a ponta e sempre fácil de tocar no celular.
          marginTop:auto empurra pro fundo; as margens negativas cancelam o padding do PageShell
          para o fundo cobrir a tela inteira; o banner de eliminado fica dentro da área fixa. */}
      <div style={{
        position: "sticky",
        bottom: 0,
        zIndex: 20,
        marginTop: "auto",
        marginLeft: "calc(-1 * clamp(20px, 5vw, 56px))",
        marginRight: "calc(-1 * clamp(20px, 5vw, 56px))",
        marginBottom: -48,
        paddingLeft: "clamp(20px, 5vw, 56px)",
        paddingRight: "clamp(20px, 5vw, 56px)",
        paddingTop: 16,
        paddingBottom: "max(20px, env(safe-area-inset-bottom))",
        display: "flex",
        flexDirection: "column",
        gap: 10,
        background: `linear-gradient(to top, ${T.bg} 78%, transparent)`,
      }}>
        {/* banner oculto durante votação — overlay de votação já exibe mensagem de observador */}
        {/* banner oculto para espia pego durante adivinhacao — ele ainda precisa adivinhar */}
        {meuEliminado && fase !== "votacao" && !(isSpy && fase === "adivinhacao") && (
          <div style={{ background: T.brick, borderRadius: 14, padding: "12px 16px", textAlign: "center" }}>
            <span style={{ fontFamily: F.sans, fontSize: 13, fontWeight: 700, color: "white", letterSpacing: "0.05em", textTransform: "uppercase" }}>
              Você foi eliminado — apenas observe
            </span>
          </div>
        )}

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
      </div>

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
