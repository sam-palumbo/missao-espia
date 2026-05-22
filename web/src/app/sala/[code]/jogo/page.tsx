"use client";
import { use, useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { EVENTOS } from "@/lib/eventos";
import { usePlayers } from "@/hooks/usePlayers";
import { useGameState } from "@/hooks/useGameState";
import { useAuth } from "@/hooks/useAuth";
import { gameActions } from "@/lib/game-actions";
import { createClient } from "@/lib/supabase";
import { toast } from "sonner";
import { ParchmentBg, InsetFrame, MEMedallion, MEAvatar, MERule, MEIcon, Eyebrow, PrimaryBtn, T, F } from "@/components/ui/design";

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
      <div style={{ position: "relative", zIndex: 1, display: "flex", flexDirection: "column", flex: 1, gap: 16 }}>
        {/* Badge */}
        <div style={{ alignSelf: "center", background: T.goldSoft, color: T.ink, padding: "5px 14px", borderRadius: 999 }}>
          <Eyebrow color={T.ink} size={9}>Só você pode ver</Eyebrow>
        </div>

        {/* Card */}
        <div style={{ background: `radial-gradient(140% 90% at 50% 0%, ${T.cardWarm} 0%, ${T.card} 80%)`, borderRadius: 22, padding: "22px 18px 20px", boxShadow: "0 16px 36px -16px rgba(58,42,20,0.4)", position: "relative", overflow: "hidden" }}>
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
        </div>

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
      </div>
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

  const { display, pct } = useTimer(rodada?.estado.timer_end ?? null);

  useEffect(() => {
    const supabase = createClient();
    supabase.from("salas").select("id").eq("codigo", code).single()
      .then(({ data }) => { if (data) setSalaId(data.id); });
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
  const meuEliminado = meuJogador?.ativo === false;

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

  async function handleProximoTurno() {
    if (!rodada) return;
    try { await gameActions.proximoTurno(rodada.id); }
    catch (err) { toast.error(err instanceof Error ? err.message : "Erro ao avançar turno"); }
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
        <div style={{ position: "relative", zIndex: 1, background: T.inkDeep, borderRadius: 18, padding: "12px 14px", display: "flex", alignItems: "center", gap: 12, overflow: "hidden" }}>
          <InsetFrame color={T.gold} inset={5} radius={14} opacity={0.4} opacity2={0.2} />
          <div style={{ position: "relative" }}>
            <MEAvatar size={38} initial={currentPlayer.apelido.slice(0,1)} variant={currentPlayer.id === meuJogador?.id ? "gold" : "dark"} />
          </div>
          <div style={{ flex: 1, position: "relative" }}>
            <Eyebrow color={T.gold} size={9}>Vez de</Eyebrow>
            <div style={{ fontFamily: F.serif, fontSize: 18, fontWeight: 600, color: T.cardWarm, marginTop: 3, lineHeight: 1.1 }}>
              {currentPlayer.id === meuJogador?.id ? "Sua vez" : primeiraRodada ? `${currentPlayer.apelido} está falando…` : `${currentPlayer.apelido} está perguntando…`}
            </div>
          </div>
          {ehMeuTurno && fase === "jogando" && primeiraRodada && (
            <button onClick={() => setShowWordInput(true)} style={{ position: "relative", background: T.goldSoft, color: T.ink, border: "none", borderRadius: 999, padding: "6px 12px", fontFamily: F.sans, fontSize: 10, fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase", cursor: "pointer" }}>
              Dizer Palavra
            </button>
          )}
          {ehMeuTurno && fase === "jogando" && !primeiraRodada && (
            <button onClick={handleProximoTurno} style={{ position: "relative", background: T.goldSoft, color: T.ink, border: "none", borderRadius: 999, padding: "6px 12px", fontFamily: F.sans, fontSize: 10, fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase", cursor: "pointer" }}>
              Passar →
            </button>
          )}
        </div>
      )}

      {/* Players grid */}
      <div style={{ position: "relative", zIndex: 1, background: T.card, borderRadius: 18, padding: 12, boxShadow: "0 4px 16px -12px rgba(58,42,20,0.22)" }}>
        <InsetFrame color={T.sienna} inset={5} radius={14} opacity={0.22} opacity2={0.1} />
        <div style={{ position: "relative", display: "flex", gap: 8, overflowX: "auto", paddingBottom: 4 }}>
          {players.map(p => {
            const isActive = p.id === rodada?.estado.turno_atual;
            const isEliminated = !p.ativo;
            return (
              <button
                key={p.id}
                onClick={ehMeuTurno && !isEliminated ? handleProximoTurno : undefined}
                disabled={!ehMeuTurno || isEliminated}
                style={{ flexShrink: 0, display: "flex", flexDirection: "column", alignItems: "center", gap: 6, background: "none", border: "none", cursor: ehMeuTurno && !isEliminated ? "pointer" : "default", padding: "4px 2px", opacity: isEliminated ? 0.4 : 1 }}
              >
                <div style={{ width: 44, height: 44, borderRadius: "50%", border: `2px solid ${isActive ? T.gold : T.hairlineStrong}`, background: isEliminated ? T.hairline : isActive ? T.goldSoft : T.cardWarm, display: "flex", alignItems: "center", justifyContent: "center", transition: "all 0.2s" }}>
                  <span style={{ fontFamily: F.serif, fontSize: 14, fontWeight: 600, color: isActive ? T.sienna : T.inkSoft, textDecoration: isEliminated ? "line-through" : "none" }}>{p.apelido.slice(0,2).toUpperCase()}</span>
                </div>
                <span style={{ fontFamily: F.sans, fontSize: 10, color: isActive ? T.ink : T.muted, fontWeight: isActive ? 700 : 400, textDecoration: isEliminated ? "line-through" : "none" }}>{p.apelido.split(" ")[0]}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Histórico - Infinite scroll frame below names */}
      <div style={{ position: "relative", zIndex: 1, background: T.card, borderRadius: 18, padding: "16px 14px", boxShadow: "0 4px 16px -8px rgba(58,42,20,0.2)", flex: 1, minHeight: 200, maxHeight: 400, overflowY: "auto" }}>
        <InsetFrame color={T.sienna} inset={4} radius={15} opacity={0.2} opacity2={0.1} />
        
        {primeiraRodada && rodada?.estado.palavras_primeira_rodada && rodada.estado.palavras_primeira_rodada.length > 0 && (
          <>
            <Eyebrow color={T.inkSoft} size={8}>Palavras da Primeira Rodada</Eyebrow>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginTop: 8, marginBottom: 16 }}>
              {rodada.estado.palavras_primeira_rodada.map((p, i) => (
                <div key={i} style={{ display: "flex", alignItems: "center", gap: 6, background: T.cardWarm, borderRadius: 999, padding: "6px 12px" }}>
                  <MEAvatar size={20} initial={p.apelido.slice(0,1)} variant="light" />
                  <span style={{ fontFamily: F.sans, fontSize: 13, fontWeight: 600, color: T.ink }}>{p.apelido}:</span>
                  <span style={{ fontFamily: F.bodySerif, fontSize: 13, fontStyle: "italic", color: T.inkSoft }}>"{p.palavra}"</span>
                </div>
              ))}
            </div>
            {rodada?.estado.historico && rodada.estado.historico.length > 0 && (
              <div style={{ height: 1, background: T.hairline, margin: "12px 0" }} />
            )}
          </>
        )}

        {rodada?.estado.historico && rodada.estado.historico.length > 0 && (
          <>
            <Eyebrow color={T.inkSoft} size={8}>Histórico de Perguntas</Eyebrow>
            <div style={{ display: "flex", flexDirection: "column", gap: 10, marginTop: 8 }}>
              {rodada.estado.historico.map((h, i) => (
                <div key={i} style={{ display: "flex", flexDirection: "column", gap: 4, paddingBottom: 8, borderBottom: i < rodada.estado.historico.length - 1 ? `1px solid ${T.hairline}` : "none" }}>
                  <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
                    <MEAvatar size={18} initial={h.perguntador_apelido.slice(0,1)} variant="light" />
                    <span style={{ fontFamily: F.sans, fontSize: 12, fontWeight: 600, color: T.ink }}>{h.perguntador_apelido}</span>
                    <span style={{ fontFamily: F.bodySerif, fontSize: 12, color: T.inkSoft }}>→</span>
                    <MEAvatar size={18} initial={h.destinatario_apelido.slice(0,1)} variant="light" />
                    <span style={{ fontFamily: F.sans, fontSize: 12, fontWeight: 600, color: T.ink }}>{h.destinatario_apelido}</span>
                  </div>
                  <div style={{ fontFamily: F.bodySerif, fontSize: 13, color: T.ink, paddingLeft: 24 }}>
                    <span style={{ fontStyle: "italic", color: T.inkSoft }}>{h.pergunta}</span>
                  </div>
                  <div style={{ fontFamily: F.bodySerif, fontSize: 13, color: T.sienna, paddingLeft: 24, fontWeight: 500 }}>
                    {h.resposta}
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </div>

      <div style={{ flex: 1 }} />

      {/* Action buttons */}
      <div style={{ position: "relative", zIndex: 1, display: "flex", gap: 10 }}>
        {!meuEliminado && isSpy && (fase === "jogando" || fase === "adivinhacao") && (
          <button onClick={() => setShowGuess(true)} style={{ flex: 1, background: T.card, color: T.ink, border: `1.5px solid ${T.sienna}`, borderRadius: 999, padding: "13px 16px", fontFamily: F.sans, fontSize: 12, fontWeight: 700, letterSpacing: "0.06em", textTransform: "uppercase", cursor: "pointer" }}>
            Adivinhar
          </button>
        )}
        {!meuEliminado && ehMeuTurno && fase === "jogando" && !primeiraRodada && (
          <button onClick={() => setShowAskQuestion(true)} style={{ flex: 1, background: T.sienna, color: "white", border: "none", borderRadius: 999, padding: "13px 16px", fontFamily: F.sans, fontSize: 12, fontWeight: 700, letterSpacing: "0.06em", textTransform: "uppercase", cursor: "pointer" }}>
            Fazer Pergunta
          </button>
        )}
        {!meuEliminado && ehMeuTurno && fase === "jogando" && !acusouNesteTurno && (
          <button onClick={() => setShowAccuse(true)} style={{ flex: 1, background: T.brick, color: "white", border: "none", borderRadius: 999, padding: "13px 16px", fontFamily: F.sans, fontSize: 12, fontWeight: 700, letterSpacing: "0.06em", textTransform: "uppercase", display: "flex", alignItems: "center", justifyContent: "center", gap: 8, cursor: "pointer" }}>
            <MEIcon name="spy" size={15} color="white" />
            Acusar
          </button>
        )}
      </div>

      {/* ELIMINATED OBSERVER BANNER */}
      {/* banner oculto durante votação — o overlay de votação já exibe a mensagem de observador */}
      {meuEliminado && fase !== "votacao" && (
        <div style={{ position: "relative", zIndex: 1, background: T.brick, borderRadius: 14, padding: "12px 16px", textAlign: "center" }}>
          <span style={{ fontFamily: F.sans, fontSize: 13, fontWeight: 700, color: "white", letterSpacing: "0.05em", textTransform: "uppercase" }}>
            Você foi eliminado — apenas observe
          </span>
        </div>
      )}

      {/* VOTING OVERLAY */}
      {fase === "votacao" && acusadoNome && (
        <div style={{ position: "fixed", inset: 0, zIndex: 50, display: "flex", flexDirection: "column", justifyContent: "flex-end", background: "rgba(26,18,8,0.7)", backdropFilter: "blur(4px)" }}>
          <div style={{ background: T.card, borderRadius: "22px 22px 0 0", padding: "24px 20px", display: "flex", flexDirection: "column", gap: 16, maxWidth: 390, margin: "0 auto", width: "100%", position: "relative" }}>
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
          </div>
        </div>
      )}

      {/* ACCUSATION SHEET */}
      {showAccuse && (
        <div style={{ position: "fixed", inset: 0, zIndex: 50, display: "flex", flexDirection: "column", justifyContent: "flex-end", background: "rgba(26,18,8,0.7)", backdropFilter: "blur(4px)" }}>
          <div style={{ background: T.card, borderRadius: "22px 22px 0 0", padding: "24px 20px", display: "flex", flexDirection: "column", gap: 14, maxWidth: 390, margin: "0 auto", width: "100%", position: "relative" }}>
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
          </div>
        </div>
      )}

      {/* ASK QUESTION SHEET */}
      {showAskQuestion && (
        <div style={{ position: "fixed", inset: 0, zIndex: 50, display: "flex", flexDirection: "column", justifyContent: "flex-end", background: "rgba(26,18,8,0.7)", backdropFilter: "blur(4px)" }}>
          <div style={{ background: T.card, borderRadius: "22px 22px 0 0", padding: "24px 20px", display: "flex", flexDirection: "column", gap: 14, maxWidth: 390, margin: "0 auto", width: "100%", position: "relative", maxHeight: "80dvh" }}>
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
          </div>
        </div>
      )}

      {/* ANSWER QUESTION SHEET */}
      {showAnswerQuestion && rodada?.estado.pergunta_atual && (
        <div style={{ position: "fixed", inset: 0, zIndex: 50, display: "flex", flexDirection: "column", justifyContent: "flex-end", background: "rgba(26,18,8,0.7)", backdropFilter: "blur(4px)" }}>
          <div style={{ background: T.card, borderRadius: "22px 22px 0 0", padding: "24px 20px", display: "flex", flexDirection: "column", gap: 14, maxWidth: 390, margin: "0 auto", width: "100%", position: "relative" }}>
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
          </div>
        </div>
      )}

      {/* WORD INPUT SHEET (Primeira Rodada) */}
      {showWordInput && (
        <div style={{ position: "fixed", inset: 0, zIndex: 50, display: "flex", flexDirection: "column", justifyContent: "flex-end", background: "rgba(26,18,8,0.7)", backdropFilter: "blur(4px)" }}>
          <div style={{ background: T.card, borderRadius: "22px 22px 0 0", padding: "24px 20px", display: "flex", flexDirection: "column", gap: 14, maxWidth: 390, margin: "0 auto", width: "100%", position: "relative" }}>
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
          </div>
        </div>
      )}

      {/* GUESS SHEET */}
      {showGuess && (
        <div style={{ position: "fixed", inset: 0, zIndex: 50, display: "flex", flexDirection: "column", justifyContent: "flex-end", background: "rgba(26,18,8,0.7)", backdropFilter: "blur(4px)" }}>
          <div style={{ background: T.card, borderRadius: "22px 22px 0 0", padding: "24px 20px 0", display: "flex", flexDirection: "column", gap: 14, maxWidth: 390, margin: "0 auto", width: "100%", position: "relative", maxHeight: "80dvh" }}>
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
          </div>
        </div>
      )}
    </main>
  );
}
