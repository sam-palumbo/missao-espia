"use client";
import { use, useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "motion/react";
import { EVENTOS } from "@/lib/eventos";
import { usePlayers } from "@/hooks/usePlayers";
import { useGameState } from "@/hooks/useGameState";
import { useAuth } from "@/hooks/useAuth";
import { gameActions } from "@/lib/game-actions";
import { createClient } from "@/lib/supabase";
import { toast } from "sonner";
import { ParchmentBg, InsetFrame, MEMedallion, MEAvatar, MERule, MEIcon, Eyebrow, PrimaryBtn, T, F } from "@/components/ui/design";
import { TurnoPresencial } from "./turno-presencial";
import HistoricoTabs from "./historico-tabs";

const SHEET_SPRING = { type: "spring" as const, damping: 28, stiffness: 320 };

// ── Timer ──────────────────────────────────────────────────────
function useTimer(timerEnd: string | null) {
  const [secs, setSecs] = useState(0);
  const initial = useRef(0);
  useEffect(() => {
    if (!timerEnd) return;
    const total = Math.max(0, Math.round((new Date(timerEnd).getTime() - Date.now()) / 1000));
    initial.current = total;
    setSecs(total);
    const id = setInterval(() => setSecs(s => Math.max(0, s - 1)), 1000);
    return () => clearInterval(id);
  }, [timerEnd]);
  const m = Math.floor(secs / 60).toString().padStart(2, "0");
  const s = (secs % 60).toString().padStart(2, "0");
  return { display: `${m}:${s}`, secs, pct: initial.current > 0 ? secs / initial.current : 1 };
}

// ── Reveal Screen (before tap) ─────────────────────────────────
function RevealScreen({ isSpy, evento, onReveal }: { isSpy: boolean; evento: { evento: string; local: string; testament: string } | undefined; onReveal: () => void }) {
  return (
    <main className="page-root" style={{ position: "relative", minHeight: "100dvh", display: "flex", flexDirection: "column", padding: "62px clamp(20px, 5vw, 56px) 48px", background: T.bg, width: "100%", maxWidth: 860, margin: "0 auto" }}>
      <ParchmentBg />
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.38, ease: "easeOut" }}
        style={{ position: "relative", zIndex: 1, display: "flex", flexDirection: "column", flex: 1, gap: 16 }}
      >
        {/* Badge */}
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.15, type: "spring", stiffness: 400, damping: 24 }}
          style={{ alignSelf: "center", background: T.goldSoft, color: T.ink, padding: "5px 14px", borderRadius: 999 }}
        >
          <Eyebrow color={T.ink} size={9}>Só você pode ver</Eyebrow>
        </motion.div>

        {/* Card */}
        <motion.div
          initial={{ opacity: 0, y: 20, scale: 0.97 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ delay: 0.1, type: "spring", stiffness: 280, damping: 28 }}
          style={{ background: `radial-gradient(140% 90% at 50% 0%, ${T.cardWarm} 0%, ${T.card} 80%)`, borderRadius: 22, padding: "22px 18px 20px", boxShadow: "0 16px 36px -16px rgba(58,42,20,0.4)", position: "relative", overflow: "hidden" }}
        >
          <InsetFrame color={T.sienna} inset={6} radius={18} />
          <div style={{ position: "relative", display: "flex", flexDirection: "column", alignItems: "center", gap: 10 }}>
            {isSpy ? (
              <>
                <Eyebrow color={T.sienna} size={11}>Carta do Espia</Eyebrow>
                <div style={{ margin: "4px 0" }}><MEMedallion size={110} inset="eye" variant="light" /></div>
                <div style={{ fontFamily: F.serif, fontSize: 40, fontWeight: 600, color: T.ink, lineHeight: 1, letterSpacing: "0.02em", fontStyle: "italic" }}>Espia</div>
                <div style={{ width: "55%" }}><MERule color={T.sienna} /></div>
                <div style={{ fontFamily: F.bodySerif, fontSize: 16, color: T.ink, textAlign: "center", lineHeight: 1.45, maxWidth: 270, paddingBottom: 6, fontWeight: 500 }}>
                  Você não conhece o local desta rodada. Descubra-o por perguntas — sem se entregar.
                </div>
              </>
            ) : (
              <>
                <Eyebrow color={T.sienna} size={11}>{evento?.testament === "AT" ? "Antigo Testamento" : "Novo Testamento"}</Eyebrow>
                <div style={{ margin: "4px 0" }}><MEMedallion size={110} inset="scroll" variant="light" /></div>
                <Eyebrow color={T.inkSoft} size={10}>Evento</Eyebrow>
                <div style={{ fontFamily: F.serif, fontSize: 28, fontWeight: 600, lineHeight: 1.05, color: T.ink, textAlign: "center", padding: "0 10px" }}>
                  {evento?.evento ?? "—"}
                </div>
                <div style={{ width: "55%" }}><MERule color={T.sienna} /></div>
                <Eyebrow color={T.inkSoft} size={10}>Local</Eyebrow>
                <div style={{ fontFamily: F.bodySerif, fontSize: 20, fontWeight: 500, color: T.ink, textAlign: "center", lineHeight: 1.2, paddingBottom: 6 }}>
                  {evento?.local ?? "—"}
                </div>
              </>
            )}
          </div>
        </motion.div>

        {/* Hint card */}
        <div style={{ padding: "12px 14px", background: T.card, borderRadius: 16, display: "flex", alignItems: "center", gap: 12, boxShadow: "0 4px 14px -10px rgba(58,42,20,0.2)", position: "relative" }}>
          <InsetFrame color={T.sienna} inset={5} radius={12} opacity={0.22} opacity2={0.1} />
          <div style={{ position: "relative", width: 36, height: 36, borderRadius: "50%", background: isSpy ? T.goldSoft : T.brickSoft, display: "flex", alignItems: "center", justifyContent: "center" }}>
            <MEIcon name={isSpy ? "trophy" : "spy"} size={18} color={isSpy ? T.sienna : T.brick} />
          </div>
          <div style={{ flex: 1, position: "relative" }}>
            <div style={{ fontFamily: F.serif, fontSize: 18, fontWeight: 600, color: T.ink }}>
              {isSpy ? "Adivinhe o local" : "Há um espia entre vocês"}
            </div>
            <Eyebrow color={T.inkSoft} size={10}>
              {isSpy ? "+2 pontos antes da votação" : "Descubra-o sem se revelar"}
            </Eyebrow>
          </div>
        </div>

        <div style={{ flex: 1 }} />
        <PrimaryBtn accent={T.gold} onClick={onReveal}>Memorizei</PrimaryBtn>
      </motion.div>
    </main>
  );
}

// ── Discussion Screen ──────────────────────────────────────────
export default function JogoPage({ params }: { params: Promise<{ code: string }> }) {
  const { code } = use(params);
  const router = useRouter();
  const { user } = useAuth();
  const [salaId, setSalaId] = useState<string | null>(null);
  const players = usePlayers(salaId);
  const rodada = useGameState(salaId);

  const [modo, setModo] = useState<"online" | "presencial">("online");
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
  const [acting, setActing] = useState(false);
  const [showMyCard, setShowMyCard] = useState(false);

  const { display, pct } = useTimer(rodada?.estado.timer_end ?? null);

  useEffect(() => {
    const supabase = createClient();
    supabase.from("salas").select("id, modo").eq("codigo", code).single()
      .then(({ data }) => {
        if (data) {
          setSalaId(data.id);
          setModo(data.modo ?? "online");
        }
      });
  }, [code]);

  useEffect(() => {
    if (rodada?.estado.fase === "resultado") router.push(`/sala/${code}/resultado`);
  }, [rodada?.estado.fase, code, router]);

  const meuJogador = players.find(p => p.user_id === user?.id);

  // Show answer sheet when player is the recipient of a question; close when phase changes
  useEffect(() => {
    if (rodada?.estado.fase === "aguardando_resposta" && rodada.estado.pergunta_atual) {
      const isRecipient = rodada.estado.pergunta_atual.destinatario_id === meuJogador?.id;
      if (isRecipient) setShowAnswerQuestion(true);
    } else {
      setShowAnswerQuestion(false);
    }
  }, [rodada?.estado.fase, rodada?.estado.pergunta_atual, meuJogador?.id]);
  const isSpy = rodada ? (rodada.estado.espia_ids ?? []).includes(meuJogador?.id ?? "") : false;
  const ehMeuTurno = meuJogador?.id === rodada?.estado.turno_atual;
  const fase = rodada?.estado.fase ?? "jogando";
  const evento = EVENTOS.find(e => e.id === rodada?.evento_id);
  const acusadoNome = rodada?.estado.acusado_id ? players.find(p => p.id === rodada.estado.acusado_id)?.apelido : null;
  const primeiraRodada = rodada?.estado.primeira_rodada ?? false;
  const acusouNesteTurno = rodada?.estado.acusou_neste_turno ?? false;
  const primeiroTurno = primeiraRodada
    ? (rodada?.estado.palavras_primeira_rodada?.length ?? 0) === 0
    : (rodada?.estado.historico.length ?? 0) === 0;
  // Eliminado se: (a) ativo=false em jogadores, OU (b) ausente de ordem_turnos quando ordem está populada.
  // (b) cobre race condition entre usePlayers e useGameState (cada um com seu próprio polling/Realtime):
  // useGameState pode atualizar ordem_turnos antes de usePlayers refletir ativo=false.
  const meuEliminado =
    meuJogador?.ativo === false ||
    (!!meuJogador &&
      !!rodada &&
      rodada.estado.ordem_turnos.length > 0 &&
      !rodada.estado.ordem_turnos.includes(meuJogador.id));

  // Quando o jogador é eliminado no meio da rodada, fecha qualquer sheet aberto
  // — o backend já recusa a ação, mas a UI não deve permitir que ele continue tentando.
  useEffect(() => {
    if (meuEliminado) {
      setShowAccuse(false);
      setShowGuess(false);
      setShowWordInput(false);
      setShowAskQuestion(false);
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
    try { await gameActions.votar(rodada.id, aprovado); }
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

  async function handleDizerPalavra() {
    if (!rodada || !wordInput.trim()) return;
    setActing(true);
    try { await gameActions.dizerPalavra(rodada.id, wordInput.trim()); setWordInput(""); setShowWordInput(false); }
    catch (err) { toast.error(err instanceof Error ? err.message : "Erro ao dizer palavra"); }
    finally { setActing(false); }
  }

  async function handleFazerPergunta() {
    if (!rodada || !selectedRecipientId || !questionInput.trim()) return;
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

  // Show reveal screen first
  if (!isRevealed && rodada) {
    return <RevealScreen isSpy={isSpy} evento={evento} onReveal={() => setIsRevealed(true)} />;
  }

  const timerColor = pct < 0.15 ? T.brick : pct < 0.4 ? T.gold : T.sienna;
  const timerBarPct = Math.round(pct * 100);
  const currentPlayer = players.find(p => p.id === rodada?.estado.turno_atual);

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

      {/* Timer card */}
      <div style={{ position: "relative", zIndex: 1, background: T.card, borderRadius: 22, padding: "20px 18px", boxShadow: "0 10px 28px -16px rgba(58,42,20,0.3)", textAlign: "center" }}>
        <InsetFrame color={T.sienna} inset={6} radius={18} />
        <div style={{ position: "relative" }}>
          <Eyebrow color={T.inkSoft} size={9}>Tempo restante</Eyebrow>
          <div style={{ fontFamily: F.serif, fontSize: 56, fontWeight: 600, letterSpacing: "-0.02em", lineHeight: 1, color: timerColor, marginTop: 6, fontVariantNumeric: "tabular-nums", transition: "color 0.5s" }}>
            {display}
          </div>
          <div style={{ marginTop: 12, height: 6, background: T.siennaSoft, borderRadius: 3, overflow: "hidden" }}>
            <div style={{ width: `${timerBarPct}%`, height: "100%", background: `linear-gradient(90deg, ${T.sienna}, ${T.gold})`, borderRadius: 3, transition: "width 1s linear" }} />
          </div>
        </div>
      </div>

      {/* Current turn */}
      {currentPlayer && (
        <TurnoPresencial
          isMinhaVez={currentPlayer.id === meuJogador?.id}
          jogadorAtualApelido={currentPlayer.apelido}
          primeiraRodada={primeiraRodada}
        />
      )}

      {/* Players grid */}
      <div style={{ position: "relative", zIndex: 1, background: T.card, borderRadius: 18, padding: 12, boxShadow: "0 4px 16px -12px rgba(58,42,20,0.22)" }}>
        <InsetFrame color={T.sienna} inset={5} radius={14} opacity={0.22} opacity2={0.1} />
        <div style={{ position: "relative", display: "flex", gap: 8, overflowX: "auto", paddingBottom: 4 }}>
          {players.map(p => {
            const isActive = p.id === rodada?.estado.turno_atual;
            const isEliminated = !p.ativo;
            return (
              <div
                key={p.id}
                style={{ flexShrink: 0, display: "flex", flexDirection: "column", alignItems: "center", gap: 6, padding: "4px 2px", opacity: isEliminated ? 0.4 : 1 }}
              >
                <div style={{ width: 44, height: 44, borderRadius: "50%", border: `2px solid ${isActive ? T.gold : T.hairlineStrong}`, background: isEliminated ? T.hairline : isActive ? T.goldSoft : T.cardWarm, display: "flex", alignItems: "center", justifyContent: "center", transition: "all 0.2s" }}>
                  <span style={{ fontFamily: F.serif, fontSize: 14, fontWeight: 600, color: isActive ? T.sienna : T.inkSoft, textDecoration: isEliminated ? "line-through" : "none" }}>{p.apelido.slice(0,2).toUpperCase()}</span>
                </div>
                <span style={{ fontFamily: F.sans, fontSize: 10, color: isActive ? T.ink : T.muted, fontWeight: isActive ? 700 : 400, textDecoration: isEliminated ? "line-through" : "none" }}>{p.apelido.split(" ")[0]}</span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Histórico - Infinite scroll frame below names */}
      <HistoricoTabs
        historico={rodada?.estado.historico ?? []}
        palavrasPrimeiraRodada={rodada?.estado.palavras_primeira_rodada ?? []}
        primeiraRodada={primeiraRodada}
      />

      <div style={{ flex: 1 }} />

      {/* Action buttons */}
      <div style={{ position: "relative", zIndex: 1, display: "flex", flexDirection: "column", gap: 10 }}>
        <div style={{ display: "flex", gap: 10 }}>
          <button onClick={() => setShowMyCard(true)} style={{ flex: 1, background: T.card, color: T.inkSoft, border: `1.5px solid ${T.hairlineStrong}`, borderRadius: 999, padding: "13px 16px", fontFamily: F.sans, fontSize: 12, fontWeight: 700, letterSpacing: "0.06em", textTransform: "uppercase", cursor: "pointer", whiteSpace: "nowrap" }}>
            Minha Carta
          </button>
          {isSpy && fase === "adivinhacao" && (
            <button onClick={() => setShowGuess(true)} style={{ flex: 1, background: T.card, color: T.ink, border: `1.5px solid ${T.sienna}`, borderRadius: 999, padding: "13px 16px", fontFamily: F.sans, fontSize: 12, fontWeight: 700, letterSpacing: "0.06em", textTransform: "uppercase", cursor: "pointer" }}>
              Adivinhar
            </button>
          )}
        </div>
        {ehMeuTurno && !meuEliminado && fase === "jogando" && (
          <div style={{ display: "flex", flexWrap: "wrap", gap: 10 }}>
            {primeiraRodada ? (
              <button
                disabled={acting}
                onClick={async () => {
                  if (!rodada) return;
                  if (modo === "presencial") {
                    setActing(true);
                    try { await gameActions.proximoTurno(rodada.id); }
                    catch (err) { toast.error(err instanceof Error ? err.message : "Erro ao avançar turno"); }
                    finally { setActing(false); }
                  } else {
                    setShowWordInput(true);
                  }
                }}
                style={{ flex: 1, minWidth: 160, background: T.gold, color: T.ink, border: "none", borderRadius: 999, padding: "13px 16px", fontFamily: F.sans, fontSize: 12, fontWeight: 700, letterSpacing: "0.06em", textTransform: "uppercase", cursor: "pointer" }}
              >
                Diga uma palavra
              </button>
            ) : (
              <button
                disabled={acting}
                onClick={async () => {
                  if (!rodada) return;
                  if (modo === "presencial") {
                    setActing(true);
                    try { await gameActions.proximoTurno(rodada.id); }
                    catch (err) { toast.error(err instanceof Error ? err.message : "Erro ao avançar turno"); }
                    finally { setActing(false); }
                  } else {
                    setShowAskQuestion(true);
                  }
                }}
                style={{ flex: 1, minWidth: 160, background: T.sienna, color: "white", border: "none", borderRadius: 999, padding: "13px 16px", fontFamily: F.sans, fontSize: 12, fontWeight: 700, letterSpacing: "0.06em", textTransform: "uppercase", cursor: "pointer" }}
              >
                Fazer Pergunta
              </button>
            )}
            {!primeiroTurno && !acusouNesteTurno && (
              <button
                disabled={acting}
                onClick={() => setShowAccuse(true)}
                style={{ flex: 1, minWidth: 130, background: T.brick, color: "white", border: "none", borderRadius: 999, padding: "13px 16px", fontFamily: F.sans, fontSize: 12, fontWeight: 700, letterSpacing: "0.06em", textTransform: "uppercase", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 8 }}
              >
                <MEIcon name="spy" size={15} color="white" />
                Acusar
              </button>
            )}
            {isSpy && !primeiraRodada && (
              <button
                disabled={acting}
                onClick={() => setShowGuess(true)}
                style={{ flex: 1, minWidth: 130, background: T.card, color: T.ink, border: `1.5px solid ${T.sienna}`, borderRadius: 999, padding: "13px 16px", fontFamily: F.sans, fontSize: 12, fontWeight: 700, letterSpacing: "0.06em", textTransform: "uppercase", cursor: "pointer" }}
              >
                Adivinhar
              </button>
            )}
            {modo === "presencial" && (
              <button
                disabled={acting}
                onClick={async () => {
                  if (!rodada) return;
                  setActing(true);
                  try { await gameActions.proximoTurno(rodada.id); }
                  catch (err) { toast.error(err instanceof Error ? err.message : "Erro ao avançar turno"); }
                  finally { setActing(false); }
                }}
                style={{ flex: 1, minWidth: 130, background: T.ink, color: T.cardWarm, border: "none", borderRadius: 999, padding: "13px 16px", fontFamily: F.sans, fontSize: 12, fontWeight: 700, letterSpacing: "0.06em", textTransform: "uppercase", cursor: "pointer" }}
              >
                Concluí turno
              </button>
            )}
          </div>
        )}
      </div>

      {/* ELIMINATED OBSERVER BANNER */}
      {/* banner oculto durante votação — o overlay de votação já exibe a mensagem de observador */}
      {/* banner oculto para espia pego durante adivinhacao — ele ainda precisa adivinhar */}
      {meuEliminado && fase !== "votacao" && !(isSpy && fase === "adivinhacao") && (
        <div style={{ position: "relative", zIndex: 1, background: T.brick, borderRadius: 14, padding: "12px 16px", textAlign: "center" }}>
          <span style={{ fontFamily: F.sans, fontSize: 13, fontWeight: 700, color: "white", letterSpacing: "0.05em", textTransform: "uppercase" }}>
            Você foi eliminado — apenas observe
          </span>
        </div>
      )}

      {/* VOTING OVERLAY */}
      <AnimatePresence>
        {fase === "votacao" && acusadoNome && (
          <motion.div
            key="voting"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            style={{ position: "fixed", inset: 0, zIndex: 50, display: "flex", flexDirection: "column", justifyContent: "flex-end", background: "rgba(26,18,8,0.72)", backdropFilter: "blur(4px)" }}
          >
            <motion.div
              initial={{ y: "100%" }}
              animate={{ y: 0 }}
              exit={{ y: "100%" }}
              transition={SHEET_SPRING}
              style={{ background: T.card, borderRadius: "22px 22px 0 0", padding: "24px 20px", display: "flex", flexDirection: "column", gap: 16, maxWidth: 390, margin: "0 auto", width: "100%", position: "relative" }}
            >
              <InsetFrame color={T.sienna} inset={6} radius={22} opacity={0.3} opacity2={0.15} />
              <div style={{ width: 40, height: 4, background: T.hairlineStrong, borderRadius: 2, margin: "0 auto 4px" }} />
              <Eyebrow color={T.inkSoft}>Votação</Eyebrow>
              <div style={{ fontFamily: F.serif, fontSize: 24, fontWeight: 600, color: T.ink, lineHeight: 1.1 }}>{acusadoNome} é o espia?</div>
              {meuEliminado ? (
                <div style={{ textAlign: "center", fontFamily: F.bodySerif, fontStyle: "italic", fontSize: 15, color: T.inkSoft, padding: "10px 0" }}>Você foi eliminado — apenas observe.</div>
              ) : meuJogador?.id !== rodada?.estado.acusado_id ? (
                <div style={{ display: "flex", gap: 10 }}>
                  <button disabled={acting} onClick={() => handleVotar(true)} style={{ flex: 1, background: T.ink, color: T.cardWarm, border: "none", borderRadius: 999, padding: "15px", fontFamily: F.sans, fontSize: 15, fontWeight: 700, cursor: "pointer" }}>
                    👍 Sim
                  </button>
                  <button disabled={acting} onClick={() => handleVotar(false)} style={{ flex: 1, background: T.card, color: T.ink, border: `1.5px solid ${T.hairlineStrong}`, borderRadius: 999, padding: "15px", fontFamily: F.sans, fontSize: 15, fontWeight: 700, cursor: "pointer" }}>
                    👎 Não
                  </button>
                </div>
              ) : (
                <div style={{ textAlign: "center", fontFamily: F.bodySerif, fontStyle: "italic", fontSize: 15, color: T.inkSoft, padding: "10px 0" }}>Aguardando votação…</div>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ACCUSATION SHEET */}
      <AnimatePresence>
        {showAccuse && (
          <motion.div key="accuse" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} style={{ position: "fixed", inset: 0, zIndex: 50, display: "flex", flexDirection: "column", justifyContent: "flex-end", background: "rgba(26,18,8,0.72)", backdropFilter: "blur(4px)" }}>
            <motion.div initial={{ y: "100%" }} animate={{ y: 0 }} exit={{ y: "100%" }} transition={SHEET_SPRING} style={{ background: T.card, borderRadius: "22px 22px 0 0", padding: "24px 20px", display: "flex", flexDirection: "column", gap: 14, maxWidth: 390, margin: "0 auto", width: "100%", position: "relative" }}>
              <InsetFrame color={T.sienna} inset={6} radius={22} opacity={0.3} opacity2={0.15} />
              <div style={{ width: 40, height: 4, background: T.hairlineStrong, borderRadius: 2, margin: "0 auto 4px" }} />
              <Eyebrow color={T.inkSoft}>Acusar Jogador</Eyebrow>
              <div style={{ fontFamily: F.serif, fontSize: 24, fontWeight: 600, color: T.ink }}>Quem é o Espia?</div>
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {players.filter(p => p.ativo && p.id !== meuJogador?.id).map(p => (
                  <button key={p.id} disabled={acting} onClick={() => handleAcusar(p.id)} style={{ display: "flex", alignItems: "center", gap: 12, padding: "12px 14px", borderRadius: 14, border: `1.5px solid ${T.hairline}`, background: T.cardWarm, cursor: "pointer", textAlign: "left" }}>
                    <MEAvatar size={38} initial={p.apelido.slice(0,1)} variant="light" />
                    <span style={{ fontFamily: F.sans, fontWeight: 600, fontSize: 15, color: T.ink }}>{p.apelido}</span>
                  </button>
                ))}
              </div>
              <button onClick={() => setShowAccuse(false)} style={{ background: "none", border: "none", fontFamily: F.sans, fontSize: 13, fontWeight: 600, color: T.inkSoft, cursor: "pointer", padding: "8px 0", textTransform: "uppercase", letterSpacing: "0.1em" }}>
                Cancelar
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ASK QUESTION SHEET */}
      <AnimatePresence>
        {showAskQuestion && (
          <motion.div key="ask" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} style={{ position: "fixed", inset: 0, zIndex: 50, display: "flex", flexDirection: "column", justifyContent: "flex-end", background: "rgba(26,18,8,0.72)", backdropFilter: "blur(4px)" }}>
          <motion.div initial={{ y: "100%" }} animate={{ y: 0 }} exit={{ y: "100%" }} transition={SHEET_SPRING} style={{ background: T.card, borderRadius: "22px 22px 0 0", padding: "24px 20px", display: "flex", flexDirection: "column", gap: 14, maxWidth: 390, margin: "0 auto", width: "100%", position: "relative", maxHeight: "80dvh" }}>
            <InsetFrame color={T.sienna} inset={6} radius={22} opacity={0.3} opacity2={0.15} />
            <div style={{ width: 40, height: 4, background: T.hairlineStrong, borderRadius: 2, margin: "0 auto 4px" }} />
            <Eyebrow color={T.inkSoft}>Fazer Pergunta</Eyebrow>
            <div style={{ fontFamily: F.serif, fontSize: 24, fontWeight: 600, color: T.ink }}>Para quem perguntar?</div>
            <div style={{ display: "flex", flexDirection: "column", gap: 8, overflowY: "auto", paddingBottom: 8 }}>
              {players.filter(p => p.ativo && p.id !== meuJogador?.id).map(p => (
                <button key={p.id} onClick={() => setSelectedRecipientId(p.id)} style={{ display: "flex", alignItems: "center", gap: 12, padding: "12px 14px", borderRadius: 14, border: `2px solid ${selectedRecipientId === p.id ? T.sienna : T.hairline}`, background: selectedRecipientId === p.id ? T.siennaSoft : T.cardWarm, cursor: "pointer", textAlign: "left", transition: "all 150ms" }}>
                  <MEAvatar size={38} initial={p.apelido.slice(0,1)} variant="light" />
                  <span style={{ fontFamily: F.sans, fontWeight: 600, fontSize: 15, color: T.ink }}>{p.apelido}</span>
                </button>
              ))}
            </div>
            {selectedRecipientId && (
              <>
                <input
                  type="text"
                  value={questionInput}
                  onChange={e => setQuestionInput(e.target.value)}
                  placeholder="Sua pergunta…"
                  maxLength={200}
                  autoFocus
                  style={{ background: T.cardWarm, border: `1.5px solid ${T.hairlineStrong}`, borderRadius: 12, padding: "14px 16px", fontFamily: F.bodySerif, fontSize: 16, color: T.ink, outline: "none" }}
                />
                <div style={{ display: "flex", gap: 10, marginTop: 4 }}>
                  <button onClick={() => { setShowAskQuestion(false); setQuestionInput(""); setSelectedRecipientId(null); }} style={{ flex: 1, background: "none", border: `1.5px solid ${T.hairlineStrong}`, borderRadius: 999, padding: "13px", fontFamily: F.sans, fontSize: 12, fontWeight: 700, color: T.inkSoft, cursor: "pointer", textTransform: "uppercase", letterSpacing: "0.08em" }}>
                    Cancelar
                  </button>
                  <button disabled={!questionInput.trim() || acting} onClick={handleFazerPergunta} style={{ flex: 2, background: T.ink, color: T.cardWarm, border: "none", borderRadius: 999, padding: "13px", fontFamily: F.sans, fontSize: 12, fontWeight: 700, cursor: questionInput.trim() ? "pointer" : "not-allowed", opacity: questionInput.trim() ? 1 : 0.5, textTransform: "uppercase", letterSpacing: "0.08em" }}>
                    Enviar ✦
                  </button>
                </div>
              </>
            )}
          </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ANSWER QUESTION SHEET */}
      <AnimatePresence>
        {showAnswerQuestion && rodada?.estado.pergunta_atual && (
          <motion.div key="answer" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} style={{ position: "fixed", inset: 0, zIndex: 50, display: "flex", flexDirection: "column", justifyContent: "flex-end", background: "rgba(26,18,8,0.72)", backdropFilter: "blur(4px)" }}>
          <motion.div initial={{ y: "100%" }} animate={{ y: 0 }} exit={{ y: "100%" }} transition={SHEET_SPRING} style={{ background: T.card, borderRadius: "22px 22px 0 0", padding: "24px 20px", display: "flex", flexDirection: "column", gap: 14, maxWidth: 390, margin: "0 auto", width: "100%", position: "relative" }}>
            <InsetFrame color={T.sienna} inset={6} radius={22} opacity={0.3} opacity2={0.15} />
            <div style={{ width: 40, height: 4, background: T.hairlineStrong, borderRadius: 2, margin: "0 auto 4px" }} />
            <Eyebrow color={T.inkSoft}>Responder Pergunta</Eyebrow>
            <div style={{ fontFamily: F.serif, fontSize: 24, fontWeight: 600, color: T.ink }}>{rodada.estado.pergunta_atual.perguntador_apelido} perguntou:</div>
            <div style={{ background: T.cardWarm, borderRadius: 12, padding: "14px 16px", fontFamily: F.bodySerif, fontSize: 16, color: T.ink, lineHeight: 1.4 }}>
              {rodada.estado.pergunta_atual.texto}
            </div>
            <input
              type="text"
              value={answerInput}
              onChange={e => setAnswerInput(e.target.value)}
              onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleResponderPergunta(); } }}
              placeholder="Sua resposta…"
              maxLength={200}
              autoFocus
              style={{ background: T.cardWarm, border: `1.5px solid ${T.hairlineStrong}`, borderRadius: 12, padding: "14px 16px", fontFamily: F.bodySerif, fontSize: 16, color: T.ink, outline: "none" }}
            />
            <div style={{ display: "flex", gap: 10, marginTop: 4 }}>
              <button onClick={() => { setShowAnswerQuestion(false); setAnswerInput(""); }} style={{ flex: 1, background: "none", border: `1.5px solid ${T.hairlineStrong}`, borderRadius: 999, padding: "13px", fontFamily: F.sans, fontSize: 12, fontWeight: 700, color: T.inkSoft, cursor: "pointer", textTransform: "uppercase", letterSpacing: "0.08em" }}>
                Cancelar
              </button>
              <button disabled={!answerInput.trim() || acting} onClick={handleResponderPergunta} style={{ flex: 2, background: T.ink, color: T.cardWarm, border: "none", borderRadius: 999, padding: "13px", fontFamily: F.sans, fontSize: 12, fontWeight: 700, cursor: answerInput.trim() ? "pointer" : "not-allowed", opacity: answerInput.trim() ? 1 : 0.5, textTransform: "uppercase", letterSpacing: "0.08em" }}>
                Responder ✦
              </button>
            </div>
          </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* WORD INPUT SHEET (Primeira Rodada) */}
      <AnimatePresence>
        {showWordInput && (
          <motion.div key="word" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} style={{ position: "fixed", inset: 0, zIndex: 50, display: "flex", flexDirection: "column", justifyContent: "flex-end", background: "rgba(26,18,8,0.72)", backdropFilter: "blur(4px)" }}>
          <motion.div initial={{ y: "100%" }} animate={{ y: 0 }} exit={{ y: "100%" }} transition={SHEET_SPRING} style={{ background: T.card, borderRadius: "22px 22px 0 0", padding: "24px 20px", display: "flex", flexDirection: "column", gap: 14, maxWidth: 390, margin: "0 auto", width: "100%", position: "relative" }}>
            <InsetFrame color={T.sienna} inset={6} radius={22} opacity={0.3} opacity2={0.15} />
            <div style={{ width: 40, height: 4, background: T.hairlineStrong, borderRadius: 2, margin: "0 auto 4px" }} />
            <Eyebrow color={T.inkSoft}>Primeira Rodada</Eyebrow>
            <div style={{ fontFamily: F.serif, fontSize: 24, fontWeight: 600, color: T.ink }}>Diga uma palavra</div>
            <div style={{ fontFamily: F.bodySerif, fontSize: 14, color: T.inkSoft, lineHeight: 1.4 }}>
              Na primeira rodada, cada jogador diz apenas uma palavra relacionada ao evento ou local.
            </div>
            <input
              type="text"
              value={wordInput}
              onChange={e => setWordInput(e.target.value)}
              onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleDizerPalavra(); } }}
              placeholder="Uma palavra apenas…"
              maxLength={50}
              autoFocus
              style={{ background: T.cardWarm, border: `1.5px solid ${T.hairlineStrong}`, borderRadius: 12, padding: "14px 16px", fontFamily: F.bodySerif, fontSize: 16, color: T.ink, outline: "none" }}
            />
            <div style={{ display: "flex", gap: 10, marginTop: 4 }}>
              <button onClick={() => { setShowWordInput(false); setWordInput(""); }} style={{ flex: 1, background: "none", border: `1.5px solid ${T.hairlineStrong}`, borderRadius: 999, padding: "13px", fontFamily: F.sans, fontSize: 12, fontWeight: 700, color: T.inkSoft, cursor: "pointer", textTransform: "uppercase", letterSpacing: "0.08em" }}>
                Cancelar
              </button>
              <button disabled={!wordInput.trim() || acting} onClick={handleDizerPalavra} style={{ flex: 2, background: T.ink, color: T.cardWarm, border: "none", borderRadius: 999, padding: "13px", fontFamily: F.sans, fontSize: 12, fontWeight: 700, cursor: wordInput.trim() ? "pointer" : "not-allowed", opacity: wordInput.trim() ? 1 : 0.5, textTransform: "uppercase", letterSpacing: "0.08em" }}>
                Confirmar ✦
              </button>
            </div>
          </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* GUESS SHEET */}
      <AnimatePresence>
        {showGuess && (
          <motion.div key="guess" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} style={{ position: "fixed", inset: 0, zIndex: 50, display: "flex", flexDirection: "column", justifyContent: "flex-end", background: "rgba(26,18,8,0.72)", backdropFilter: "blur(4px)" }}>
          <motion.div initial={{ y: "100%" }} animate={{ y: 0 }} exit={{ y: "100%" }} transition={SHEET_SPRING} style={{ background: T.card, borderRadius: "22px 22px 0 0", padding: "24px 20px 0", display: "flex", flexDirection: "column", gap: 14, maxWidth: 390, margin: "0 auto", width: "100%", position: "relative", maxHeight: "80dvh" }}>
            <InsetFrame color={T.sienna} inset={6} radius={22} opacity={0.3} opacity2={0.15} />
            <div style={{ width: 40, height: 4, background: T.hairlineStrong, borderRadius: 2, margin: "0 auto 4px" }} />
            <Eyebrow color={T.inkSoft}>Adivinhar Local</Eyebrow>
            <div style={{ fontFamily: F.serif, fontSize: 24, fontWeight: 600, color: T.ink }}>Onde você está?</div>
            <div style={{ display: "flex", flexDirection: "column", gap: 8, overflowY: "auto", paddingBottom: 8 }}>
              {EVENTOS.map(e => (
                <button key={e.id} onClick={() => setSelectedGuessId(e.id)} style={{ display: "flex", flexDirection: "column", padding: "12px 14px", borderRadius: 12, border: `2px solid ${selectedGuessId === e.id ? T.sienna : T.hairline}`, background: selectedGuessId === e.id ? T.siennaSoft : T.cardWarm, cursor: "pointer", textAlign: "left", transition: "all 150ms" }}>
                  <span style={{ fontFamily: F.sans, fontWeight: 600, fontSize: 14, color: T.ink }}>{e.evento}</span>
                  <span style={{ fontFamily: F.bodySerif, fontSize: 12, color: T.inkSoft, marginTop: 2 }}>{e.local}</span>
                </button>
              ))}
            </div>
            <div style={{ display: "flex", gap: 10, padding: "14px 0", borderTop: `1px solid ${T.hairline}`, background: T.card, position: "sticky", bottom: 0 }}>
              <button onClick={() => setShowGuess(false)} style={{ flex: 1, background: "none", border: `1.5px solid ${T.hairlineStrong}`, borderRadius: 999, padding: "13px", fontFamily: F.sans, fontSize: 12, fontWeight: 700, color: T.inkSoft, cursor: "pointer", textTransform: "uppercase", letterSpacing: "0.08em" }}>
                Cancelar
              </button>
              <button disabled={selectedGuessId === null || acting} onClick={handleAdivinhar} style={{ flex: 2, background: T.ink, color: T.cardWarm, border: "none", borderRadius: 999, padding: "13px", fontFamily: F.sans, fontSize: 12, fontWeight: 700, cursor: selectedGuessId !== null ? "pointer" : "not-allowed", opacity: selectedGuessId !== null ? 1 : 0.5, textTransform: "uppercase", letterSpacing: "0.08em" }}>
                Confirmar ✦
              </button>
            </div>
          </motion.div>
          </motion.div>
        )}
      </AnimatePresence>



      {/* MY CARD SHEET */}
      <AnimatePresence>
        {showMyCard && (
          <motion.div key="mycard" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} style={{ position: "fixed", inset: 0, zIndex: 50, display: "flex", flexDirection: "column", justifyContent: "flex-end", background: "rgba(26,18,8,0.72)", backdropFilter: "blur(4px)" }} onClick={() => setShowMyCard(false)}>
            <motion.div initial={{ y: "100%" }} animate={{ y: 0 }} exit={{ y: "100%" }} transition={SHEET_SPRING} onClick={e => e.stopPropagation()} style={{ background: T.card, borderRadius: "22px 22px 0 0", padding: "24px 20px 32px", display: "flex", flexDirection: "column", gap: 12, maxWidth: 390, margin: "0 auto", width: "100%", position: "relative" }}>
              <InsetFrame color={T.sienna} inset={6} radius={22} opacity={0.3} opacity2={0.15} />
              <div style={{ width: 40, height: 4, background: T.hairlineStrong, borderRadius: 2, margin: "0 auto 4px" }} />
              <Eyebrow color={T.inkSoft}>Minha Carta</Eyebrow>
              {isSpy ? (
                <div style={{ fontFamily: F.serif, fontSize: 28, fontWeight: 600, color: T.ink }}>Espia</div>
              ) : (
                <>
                  <div style={{ fontFamily: F.serif, fontSize: 22, fontWeight: 600, color: T.ink, lineHeight: 1.1 }}>{evento?.evento ?? "—"}</div>
                  <div style={{ fontFamily: F.bodySerif, fontSize: 17, color: T.inkSoft, fontWeight: 500 }}>{evento?.local ?? "—"}</div>
                </>
              )}
              <button onClick={() => setShowMyCard(false)} style={{ marginTop: 8, background: "none", border: `1.5px solid ${T.hairlineStrong}`, borderRadius: 999, padding: "13px", fontFamily: F.sans, fontSize: 12, fontWeight: 700, color: T.inkSoft, cursor: "pointer", textTransform: "uppercase", letterSpacing: "0.08em" }}>
                Fechar
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </main>
  );
}
