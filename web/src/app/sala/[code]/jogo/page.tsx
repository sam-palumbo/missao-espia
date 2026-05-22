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
    <main style={{ position: "relative", minHeight: "100dvh", display: "flex", flexDirection: "column", padding: "62px 20px 48px", maxWidth: 390, margin: "0 auto", background: T.bg }}>
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
  const isSpy = rodada ? (rodada.estado.espia_ids ?? []).includes(meuJogador?.id ?? "") : false;
  const ehMeuTurno = meuJogador?.id === rodada?.estado.turno_atual;
  const fase = rodada?.estado.fase ?? "jogando";
  const evento = EVENTOS.find(e => e.id === rodada?.evento_id);
  const acusadoNome = rodada?.estado.acusado_id ? players.find(p => p.id === rodada.estado.acusado_id)?.apelido : null;

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

  // Show reveal screen first
  if (!isRevealed && rodada) {
    return <RevealScreen isSpy={isSpy} evento={evento} onReveal={() => setIsRevealed(true)} />;
  }

  const timerColor = pct < 0.15 ? T.brick : pct < 0.4 ? T.gold : T.sienna;
  const timerBarPct = Math.round(pct * 100);
  const currentPlayer = players.find(p => p.id === rodada?.estado.turno_atual);

  return (
    <main style={{ position: "relative", minHeight: "100dvh", display: "flex", flexDirection: "column", padding: "62px 20px 48px", maxWidth: 390, margin: "0 auto", background: T.bg, gap: 14 }}>
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
              {currentPlayer.id === meuJogador?.id ? "Sua vez" : `${currentPlayer.apelido} está perguntando…`}
            </div>
          </div>
          {ehMeuTurno && fase === "jogando" && (
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
          {players.filter(p => p.ativo).map(p => {
            const isActive = p.id === rodada?.estado.turno_atual;
            return (
              <button key={p.id} onClick={ehMeuTurno ? handleProximoTurno : undefined} disabled={!ehMeuTurno} style={{ flexShrink: 0, display: "flex", flexDirection: "column", alignItems: "center", gap: 6, background: "none", border: "none", cursor: ehMeuTurno ? "pointer" : "default", padding: "4px 2px" }}>
                <div style={{ width: 44, height: 44, borderRadius: "50%", border: `2px solid ${isActive ? T.gold : T.hairlineStrong}`, background: isActive ? T.goldSoft : T.cardWarm, display: "flex", alignItems: "center", justifyContent: "center", transition: "all 0.2s" }}>
                  <span style={{ fontFamily: F.serif, fontSize: 14, fontWeight: 600, color: isActive ? T.sienna : T.inkSoft }}>{p.apelido.slice(0,2).toUpperCase()}</span>
                </div>
                <span style={{ fontFamily: F.sans, fontSize: 10, color: isActive ? T.ink : T.muted, fontWeight: isActive ? 700 : 400 }}>{p.apelido.split(" ")[0]}</span>
              </button>
            );
          })}
        </div>
      </div>

      <div style={{ flex: 1 }} />

      {/* Action buttons */}
      <div style={{ position: "relative", zIndex: 1, display: "flex", gap: 10 }}>
        {isSpy && (fase === "jogando" || fase === "adivinhacao") && (
          <button onClick={() => setShowGuess(true)} style={{ flex: 1, background: T.card, color: T.ink, border: `1.5px solid ${T.sienna}`, borderRadius: 999, padding: "13px 16px", fontFamily: F.sans, fontSize: 12, fontWeight: 700, letterSpacing: "0.06em", textTransform: "uppercase", cursor: "pointer" }}>
            Adivinhar
          </button>
        )}
        {ehMeuTurno && fase === "jogando" && (
          <button onClick={() => setShowAccuse(true)} style={{ flex: 1, background: T.brick, color: "white", border: "none", borderRadius: 999, padding: "13px 16px", fontFamily: F.sans, fontSize: 12, fontWeight: 700, letterSpacing: "0.06em", textTransform: "uppercase", display: "flex", alignItems: "center", justifyContent: "center", gap: 8, cursor: "pointer" }}>
            <MEIcon name="spy" size={15} color="white" />
            Acusar
          </button>
        )}
      </div>

      {/* VOTING OVERLAY */}
      {fase === "votacao" && acusadoNome && (
        <div style={{ position: "fixed", inset: 0, zIndex: 50, display: "flex", flexDirection: "column", justifyContent: "flex-end", background: "rgba(26,18,8,0.7)", backdropFilter: "blur(4px)" }}>
          <div style={{ background: T.card, borderRadius: "22px 22px 0 0", padding: "24px 20px", display: "flex", flexDirection: "column", gap: 16, maxWidth: 390, margin: "0 auto", width: "100%", position: "relative" }}>
            <InsetFrame color={T.sienna} inset={6} radius={22} opacity={0.3} opacity2={0.15} />
            <div style={{ width: 40, height: 4, background: T.hairlineStrong, borderRadius: 2, margin: "0 auto 4px" }} />
            <Eyebrow color={T.inkSoft}>Votação</Eyebrow>
            <div style={{ fontFamily: F.serif, fontSize: 24, fontWeight: 600, color: T.ink, lineHeight: 1.1 }}>{acusadoNome} é o espia?</div>
            {meuJogador?.id !== rodada?.estado.acusado_id ? (
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
