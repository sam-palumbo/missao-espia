"use client";
import { use, useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { EVENTOS } from "@/lib/eventos";
import { usePlayers } from "@/hooks/usePlayers";
import { useGameState } from "@/hooks/useGameState";
import { useAuth } from "@/hooks/useAuth";
import { gameActions } from "@/lib/game-actions";
import { createClient } from "@/lib/supabase";
import { toast } from "sonner";

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

function TimerRing({ pct }: { pct: number }) {
  const r = 38;
  const circ = 2 * Math.PI * r;
  const dash = circ * pct;
  const color = pct > 0.4 ? "var(--gold)" : pct > 0.15 ? "#E09B2A" : "var(--crimson)";
  return (
    <svg viewBox="0 0 88 88" className="w-full h-full -rotate-90">
      <circle cx="44" cy="44" r={r} fill="none" stroke="var(--border)" strokeWidth="4" />
      <circle
        cx="44" cy="44" r={r}
        fill="none"
        stroke={color}
        strokeWidth="4"
        strokeLinecap="round"
        strokeDasharray={`${dash} ${circ}`}
        style={{ transition: "stroke-dasharray 1s linear, stroke 0.5s" }}
      />
    </svg>
  );
}

function EventCard({ evento, local, testament, isRevealed }: { evento: string; local: string; testament: string; isRevealed: boolean }) {
  return (
    <div className="relative w-full" style={{ perspective: "1000px", height: "200px" }}>
      <div style={{
        position: "relative", width: "100%", height: "100%",
        transformStyle: "preserve-3d",
        transition: "transform 0.6s cubic-bezier(0.4, 0, 0.2, 1)",
        transform: isRevealed ? "rotateY(0deg)" : "rotateY(180deg)",
      }}>
        <div className="absolute inset-0 card flex flex-col items-center justify-center gap-4 p-6"
          style={{ backfaceVisibility: "hidden", WebkitBackfaceVisibility: "hidden" }}>
          <div className="ornament w-full">
            <span className="font-display text-[10px] tracking-[0.3em] text-[var(--gold)] whitespace-nowrap">
              {testament === "AT" ? "Antigo Testamento" : "Novo Testamento"}
            </span>
          </div>
          <div className="text-center">
            <p className="font-display text-xl font-bold text-[var(--stone)] leading-tight mb-1">{evento}</p>
            <p className="text-sm text-[var(--muted)] font-light tracking-wide">{local}</p>
          </div>
          <div className="ornament w-full"><span className="text-[var(--gold)]">✦</span></div>
        </div>

        <div className="absolute inset-0 card flex flex-col items-center justify-center gap-2 p-6"
          style={{ backfaceVisibility: "hidden", WebkitBackfaceVisibility: "hidden", transform: "rotateY(180deg)", background: "var(--stone)" }}>
          <div className="text-center">
            <p className="font-display text-[10px] tracking-[0.4em] text-[var(--gold)] uppercase mb-3">Missão Espia</p>
            <svg viewBox="0 0 80 80" className="w-16 h-16 opacity-20" aria-hidden>
              <circle cx="40" cy="40" r="36" fill="none" stroke="var(--gold-light)" strokeWidth="1" strokeDasharray="3 2"/>
              <polygon points="40,18 44,32 58,32 47,41 51,55 40,46 29,55 33,41 22,32 36,32" fill="var(--gold-light)"/>
            </svg>
            <p className="font-display text-xs tracking-widest text-[var(--muted)] mt-3 uppercase">Toque para revelar</p>
          </div>
        </div>
      </div>
    </div>
  );
}

function SpyCard() {
  return (
    <div className="card flex flex-col items-center justify-center gap-4 p-6" style={{ height: "200px", background: "var(--crimson)" }}>
      <div className="ornament w-full" style={{ "--gold": "rgba(255,255,255,0.3)" } as React.CSSProperties}>
        <span className="font-display text-[10px] tracking-[0.3em] text-white/60 whitespace-nowrap uppercase">Você é o</span>
      </div>
      <div className="text-center">
        <p className="font-display text-4xl font-black text-white tracking-widest">ESPIA</p>
        <p className="text-sm text-white/60 font-light mt-1">Descubra onde todos estão</p>
      </div>
      <div className="flex gap-1" aria-hidden>
        {[...Array(3)].map((_, i) => <span key={i} className="w-1.5 h-1.5 rounded-full bg-white/30"/>)}
      </div>
    </div>
  );
}

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

  // Redirect when round ends
  useEffect(() => {
    if (rodada?.estado.fase === "resultado") {
      router.push(`/sala/${code}/resultado`);
    }
  }, [rodada?.estado.fase, code, router]);

  const meuJogador = players.find(p => p.user_id === user?.id);
  const isSpy = rodada ? (rodada.estado.espia_ids ?? []).includes(meuJogador?.id ?? "") : false;
  const ehMeuTurno = meuJogador?.id === rodada?.estado.turno_atual;
  const fase = rodada?.estado.fase ?? "jogando";

  const evento = EVENTOS.find(e => e.id === rodada?.evento_id);
  const urgentColor = pct < 0.15 ? "var(--crimson)" : "var(--stone)";

  async function handleAcusar(acusadoId: string) {
    if (!rodada) return;
    setActing(true);
    try {
      await gameActions.acusar(rodada.id, acusadoId);
      setShowAccuse(false);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erro ao acusar");
    } finally {
      setActing(false);
    }
  }

  async function handleVotar(aprovado: boolean) {
    if (!rodada) return;
    setActing(true);
    try {
      await gameActions.votar(rodada.id, aprovado);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erro ao votar");
    } finally {
      setActing(false);
    }
  }

  async function handleAdivinhar() {
    if (!rodada || selectedGuessId === null) return;
    setActing(true);
    try {
      await gameActions.adivinhar(rodada.id, selectedGuessId);
      setShowGuess(false);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erro ao adivinhar");
    } finally {
      setActing(false);
    }
  }

  async function handleProximoTurno() {
    if (!rodada) return;
    try {
      await gameActions.proximoTurno(rodada.id);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erro ao avançar turno");
    }
  }

  const acusadoNome = rodada?.estado.acusado_id
    ? players.find(p => p.id === rodada.estado.acusado_id)?.apelido
    : null;

  return (
    <main className="relative min-h-dvh flex flex-col px-4 pt-8 pb-6 max-w-sm mx-auto gap-5 overflow-hidden">

      <header className="flex items-center justify-between animate-fade-up">
        <div className="flex flex-col">
          <p className="font-display text-[10px] tracking-[0.3em] text-[var(--muted)] uppercase">Sala {code}</p>
          <p className="font-display text-sm font-bold text-[var(--stone)]">Rodada {rodada?.numero ?? "—"}</p>
        </div>
        <div className="relative w-14 h-14">
          <TimerRing pct={pct} />
          <div className="absolute inset-0 flex items-center justify-center">
            <span className="font-display text-xs font-bold tabular-nums" style={{ color: urgentColor, transition: "color 0.5s" }}>
              {display}
            </span>
          </div>
        </div>
      </header>

      <div className="animate-fade-up delay-100">
        {isSpy ? (
          <SpyCard />
        ) : (
          <div onClick={() => setIsRevealed(r => !r)} className="cursor-pointer select-none">
            {evento ? (
              <EventCard evento={evento.evento} local={evento.local} testament={evento.testament} isRevealed={isRevealed} />
            ) : (
              <div className="card flex items-center justify-center" style={{ height: "200px" }}>
                <p className="font-display text-xs text-[var(--muted)] tracking-widest">Carregando...</p>
              </div>
            )}
            {!isRevealed && (
              <p className="text-center text-xs text-[var(--muted)] mt-2 font-display tracking-wider">
                Toque para revelar sua carta
              </p>
            )}
          </div>
        )}
      </div>

      <div className="card p-4 animate-fade-up delay-200">
        <p className="font-display text-[10px] tracking-widest text-[var(--muted)] uppercase mb-3">
          Jogadores · Turno Atual
        </p>
        <div className="flex gap-2 overflow-x-auto pb-1">
          {players.filter(p => p.ativo).map(p => {
            const isActive = p.id === rodada?.estado.turno_atual;
            return (
              <button key={p.id} onClick={handleProximoTurno} className="flex flex-col items-center gap-1.5 flex-shrink-0" disabled={!ehMeuTurno}>
                <div className="w-11 h-11 rounded-full flex items-center justify-center border-2 transition-all duration-200"
                  style={{ borderColor: isActive ? "var(--gold)" : "var(--border)", background: isActive ? "var(--gold-bg)" : "white" }}>
                  <span className="font-display text-xs font-bold" style={{ color: isActive ? "var(--gold)" : "var(--muted)" }}>
                    {p.apelido.slice(0, 2).toUpperCase()}
                  </span>
                </div>
                <span className="text-[10px] font-display tracking-wide" style={{ color: isActive ? "var(--stone)" : "var(--muted)" }}>
                  {p.apelido.split(" ")[0]}
                </span>
              </button>
            );
          })}
        </div>
        {ehMeuTurno && fase === "jogando" && (
          <p className="text-[10px] text-[var(--gold)] font-display tracking-wider mt-2 text-center">
            É o seu turno — toque em um jogador para passar
          </p>
        )}
      </div>

      <div className="flex gap-3 animate-fade-up delay-300">
        {ehMeuTurno && fase === "jogando" && (
          <Button variant="danger" size="md" className="flex-1 font-display tracking-widest text-xs" onClick={() => setShowAccuse(true)}>
            Acusar
          </Button>
        )}
        {isSpy && (fase === "jogando" || fase === "adivinhacao") && (
          <Button variant="secondary" size="md" className="flex-1 font-display tracking-widest text-xs" onClick={() => setShowGuess(true)}>
            Adivinhar
          </Button>
        )}
      </div>

      {/* Voting UI */}
      {fase === "votacao" && acusadoNome && (
        <div className="fixed inset-0 z-50 flex flex-col justify-end" style={{ background: "rgba(28,25,23,0.6)", backdropFilter: "blur(4px)" }}>
          <div className="card rounded-b-none p-6 flex flex-col gap-4 animate-fade-up mx-auto w-full max-w-sm">
            <div className="w-10 h-1 rounded-full bg-[var(--border)] mx-auto mb-2" />
            <p className="font-display text-[10px] tracking-widest text-[var(--muted)] uppercase">Votação</p>
            <h3 className="font-display text-xl font-bold text-[var(--stone)]">{acusadoNome} é o espia?</h3>
            {meuJogador?.id !== rodada?.estado.acusado_id ? (
              <div className="flex gap-3">
                <Button variant="primary" size="lg" className="flex-1 font-display tracking-widest text-sm" disabled={acting} onClick={() => handleVotar(true)}>
                  👍 Sim
                </Button>
                <Button variant="ghost" size="lg" className="flex-1 font-display tracking-widest text-sm" disabled={acting} onClick={() => handleVotar(false)}>
                  👎 Não
                </Button>
              </div>
            ) : (
              <p className="text-sm text-center text-[var(--muted)] font-display tracking-wider">Aguardando votação...</p>
            )}
          </div>
        </div>
      )}

      {/* Accusation bottom sheet */}
      {showAccuse && (
        <div className="fixed inset-0 z-50 flex flex-col justify-end" style={{ background: "rgba(28,25,23,0.6)", backdropFilter: "blur(4px)" }}>
          <div className="card rounded-b-none p-6 flex flex-col gap-4 animate-fade-up mx-auto w-full max-w-sm">
            <div className="w-10 h-1 rounded-full bg-[var(--border)] mx-auto mb-2" />
            <p className="font-display text-[10px] tracking-widest text-[var(--muted)] uppercase">Acusar Jogador</p>
            <h3 className="font-display text-xl font-bold text-[var(--stone)]">Quem é o Espia?</h3>
            <div className="flex flex-col gap-2">
              {players.filter(p => p.ativo && p.id !== meuJogador?.id).map(p => (
                <button key={p.id} disabled={acting}
                  onClick={() => handleAcusar(p.id)}
                  className="flex items-center gap-3 p-3 rounded-xl border border-[var(--border)] hover:border-[var(--crimson)] hover:bg-[var(--crimson-bg)] transition-all text-left">
                  <div className="w-9 h-9 rounded-full bg-[var(--gold-bg)] flex items-center justify-center">
                    <span className="font-display text-xs font-bold text-[var(--gold)]">{p.apelido.slice(0, 2).toUpperCase()}</span>
                  </div>
                  <span className="font-body font-bold text-sm text-[var(--stone)]">{p.apelido}</span>
                </button>
              ))}
            </div>
            <Button variant="ghost" onClick={() => setShowAccuse(false)} className="font-display tracking-wider text-sm">
              Cancelar
            </Button>
          </div>
        </div>
      )}

      {/* Spy guess bottom sheet */}
      {showGuess && (
        <div className="fixed inset-0 z-50 flex flex-col justify-end" style={{ background: "rgba(28,25,23,0.6)", backdropFilter: "blur(4px)" }}>
          <div className="card rounded-b-none p-6 flex flex-col gap-4 animate-fade-up mx-auto w-full max-w-sm max-h-[80dvh] overflow-y-auto">
            <div className="w-10 h-1 rounded-full bg-[var(--border)] mx-auto mb-2" />
            <p className="font-display text-[10px] tracking-widest text-[var(--muted)] uppercase">Adivinhar Evento</p>
            <h3 className="font-display text-xl font-bold text-[var(--stone)]">Onde você está?</h3>
            <div className="flex flex-col gap-2">
              {EVENTOS.map(e => (
                <button key={e.id} onClick={() => setSelectedGuessId(e.id)}
                  className="flex flex-col p-3 rounded-xl border-2 transition-all text-left"
                  style={{
                    borderColor: selectedGuessId === e.id ? "var(--gold)" : "var(--border)",
                    background: selectedGuessId === e.id ? "var(--gold-bg)" : "white",
                  }}>
                  <span className="font-body font-bold text-sm text-[var(--stone)]">{e.evento}</span>
                  <span className="text-xs text-[var(--muted)] font-light">{e.local}</span>
                </button>
              ))}
            </div>
            <div className="flex gap-3 sticky bottom-0 bg-white pt-3 border-t border-[var(--border)]">
              <Button variant="ghost" onClick={() => setShowGuess(false)} className="font-display tracking-wider text-sm flex-1">
                Cancelar
              </Button>
              <Button variant="primary" size="md" className="flex-1 font-display tracking-widest text-xs"
                disabled={selectedGuessId === null || acting} onClick={handleAdivinhar}>
                Confirmar ✦
              </Button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
