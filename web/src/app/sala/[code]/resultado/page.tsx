"use client";
import { use, useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { motion } from "motion/react";
import { toast } from "sonner";
import { EVENTOS } from "@/lib/eventos";
import { usePlayers } from "@/hooks/usePlayers";
import { useGameState } from "@/hooks/useGameState";
import { useAuth } from "@/hooks/useAuth";
import { gameActions } from "@/lib/game-actions";
import { createClient } from "@/lib/supabase";
import { ParchmentBg, InsetFrame, MEMedallion, MEAvatar, MERule, MEIcon, Eyebrow, PrimaryBtn, T, F } from "@/components/ui/design";

const listVariants = { show: { transition: { staggerChildren: 0.07, delayChildren: 0.25 } } };
const rowVariants = {
  hidden: { opacity: 0, x: -10 },
  show: { opacity: 1, x: 0, transition: { type: "spring" as const, stiffness: 360, damping: 28 } },
};

export default function ResultadoPage({ params }: { params: Promise<{ code: string }> }) {
  const { code } = use(params);
  const router = useRouter();
  const { user } = useAuth();
  const [salaId, setSalaId] = useState<string | null>(null);
  const [anfitriaoId, setAnfitriaoId] = useState<string | null>(null);
  const [salaEncerrada, setSalaEncerrada] = useState(false);
  const [revealed, setRevealed] = useState(false);
  const [starting, setStarting] = useState(false);
  const [rodadaInicialId, setRodadaInicialId] = useState<string | null>(null);

  const rodada = useGameState(salaId);
  const players = usePlayers(salaId);

  useEffect(() => {
    const supabase = createClient();
    supabase.from("salas").select("id, status, anfitriao").eq("codigo", code).single()
      .then(({ data }) => {
        if (data) {
          setSalaId(data.id);
          setSalaEncerrada(data.status === "encerrada");
          setAnfitriaoId(data.anfitriao);
        }
      });
  }, [code]);

  useEffect(() => {
    if (rodada && !rodadaInicialId) setRodadaInicialId(rodada.id);
  }, [rodada, rodadaInicialId]);

  useEffect(() => {
    if (rodada && rodadaInicialId && rodada.id !== rodadaInicialId && rodada.estado.fase !== "resultado") {
      router.push(`/sala/${code}/jogo`);
    }
  }, [rodada, rodadaInicialId, code, router]);

  const isHost = user?.id === anfitriaoId;

  async function handleProxima() {
    if (!salaId) return;
    if (!isHost) { router.push(`/sala/${code}/lobby`); return; }
    setStarting(true);
    try {
      await gameActions.iniciarRodada(salaId);
      router.push(`/sala/${code}/jogo`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erro ao iniciar");
      setStarting(false);
    }
  }

  const evento = EVENTOS.find(e => e.id === rodada?.evento_id);
  const espiaIds = rodada?.estado.espia_ids ?? [];
  const espias = players.filter(p => espiaIds.includes(p.id));
  const espiaPego = espias.some(p => !p.ativo);
  const espiaAdivinhou = (rodada?.estado.adivinhou_evento_id ?? null) !== null;
  const groupWon = espiaPego && !espiaAdivinhou;

  const adivinhacoesFimTempo = rodada?.estado.adivinhacoes_fim_tempo;
  const isFimTempo = adivinhacoesFimTempo !== undefined && adivinhacoesFimTempo !== null;

  const badgeFimTempo = (espiaId: string): string => {
    if (!adivinhacoesFimTempo || !rodada) return "+2 pt";
    const guess = adivinhacoesFimTempo[espiaId] ?? null;
    return (guess !== null && guess === rodada.evento_id) ? "+3 pt" : "+2 pt";
  };

  if (!rodada || players.length === 0) {
    return (
      <main style={{ minHeight: "100dvh", display: "flex", alignItems: "center", justifyContent: "center", background: T.bg }}>
        <div style={{ fontFamily: F.sans, fontSize: 11, letterSpacing: "0.18em", color: T.muted, textTransform: "uppercase" }}>Carregando…</div>
      </main>
    );
  }

  return (
    <main className="page-root" style={{ position: "relative", minHeight: "100dvh", display: "flex", flexDirection: "column", padding: "62px clamp(20px, 5vw, 56px) 48px", background: T.bg, gap: 16, width: "100%", maxWidth: 860, margin: "0 auto" }}>
      <ParchmentBg />

      {/* Header */}
      <div style={{ position: "relative", zIndex: 1, textAlign: "center" }}>
        <Eyebrow color={T.inkSoft}>Resultado da Rodada</Eyebrow>
        <div style={{ marginTop: 8 }}><MERule color={T.sienna} /></div>
      </div>

      {/* Victory banner */}
      <motion.div
        initial={{ opacity: 0, scale: 0.94, y: 12 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ type: "spring", stiffness: 300, damping: 26, delay: 0.05 }}
        style={{ position: "relative", zIndex: 1, background: groupWon ? `radial-gradient(120% 100% at 50% 0%, ${T.gold} 0%, #B58A30 100%)` : `linear-gradient(135deg, ${T.brick} 0%, #7A2E10 100%)`, borderRadius: 22, padding: "18px 18px 16px", overflow: "hidden" }}
      >
        <InsetFrame color={groupWon ? T.ink : T.gold} inset={6} radius={18} opacity={0.4} opacity2={0.2} />
        <div style={{ position: "relative", display: "flex", alignItems: "center", gap: 14 }}>
          <MEMedallion size={68} inset="star" variant={groupWon ? "gold" : "dark"} />
          <div style={{ flex: 1 }}>
            <Eyebrow color={groupWon ? T.ink : T.goldSoft} size={10}>{groupWon ? "Vitória do grupo" : "Vitória do espia"}</Eyebrow>
            <div style={{ fontFamily: F.serif, fontSize: 28, fontWeight: 600, lineHeight: 1.05, color: groupWon ? T.ink : T.goldSoft, marginTop: 4 }}>
              {groupWon ? "Espia caçado!" : "Missão cumprida"}
            </div>
          </div>
        </div>
      </motion.div>

      {/* Spy reveal */}
      {espias.length > 0 && (
        <div style={{ position: "relative", zIndex: 1, background: T.card, borderRadius: 20, padding: "14px 16px", boxShadow: "0 6px 20px -12px rgba(58,42,20,0.25)" }}>
          <InsetFrame color={T.sienna} inset={5} radius={16} opacity={0.22} opacity2={0.1} />
          <div style={{ position: "relative" }}>
            <Eyebrow color={T.inkSoft} size={10}>O espia era</Eyebrow>
            <div style={{ display: "flex", alignItems: "center", gap: 14, marginTop: 8 }}>
              <MEAvatar size={52} initial={espias[0].apelido.slice(0,1)} variant="light" />
              <div style={{ flex: 1 }}>
                <div style={{ fontFamily: F.serif, fontSize: 24, fontWeight: 600, lineHeight: 1.05, color: T.ink }}>{espias[0].apelido}</div>
                <Eyebrow color={T.brick} size={10}>{isFimTempo
                  ? (badgeFimTempo(espias[0].id) === "+3 pt" ? "Adivinhou o local" : "Não adivinhou o local")
                  : (espiaAdivinhou ? "Adivinhou o local" : "Não adivinhou o local")}</Eyebrow>
              </div>
              <div style={{ background: espiaAdivinhou ? T.siennaSoft : T.brickSoft, color: espiaAdivinhou ? T.sienna : T.brick, padding: "5px 10px", borderRadius: 999, fontFamily: F.mono, fontSize: 11, fontWeight: 700 }}>
                {isFimTempo ? badgeFimTempo(espias[0].id) : (espiaAdivinhou ? "+1 pt" : "0 pt")}
              </div>
            </div>
            {/* Event reveal */}
            <button onClick={() => setRevealed(true)} style={{ marginTop: 12, padding: "10px 12px", background: T.bg, borderRadius: 12, display: "flex", justifyContent: "space-between", alignItems: "center", border: `1px solid ${T.hairline}`, width: "100%", cursor: "pointer" }}>
              <div>
                <Eyebrow color={T.inkSoft} size={10}>Local da rodada</Eyebrow>
                <div style={{ fontFamily: F.serif, fontSize: 18, fontWeight: 600, color: T.ink, marginTop: 3 }}>
                  {revealed && evento ? evento.local : "Toque para revelar"}
                </div>
                {revealed && evento && <div style={{ fontFamily: F.sans, fontSize: 11, color: T.muted, marginTop: 2 }}>{evento.evento}</div>}
              </div>
              <MEIcon name="book" size={20} color={T.sienna} />
            </button>
          </div>
        </div>
      )}

      {/* Scores */}
      <div style={{ position: "relative", zIndex: 1 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 8, padding: "0 4px" }}>
          <div style={{ fontFamily: F.serif, fontSize: 18, fontWeight: 600, color: T.ink }}>Pontuação</div>
        </div>
        <motion.div
          variants={listVariants}
          initial="hidden"
          animate="show"
          style={{ background: T.card, borderRadius: 18, padding: 10, boxShadow: "0 4px 14px -10px rgba(58,42,20,0.2)", position: "relative" }}
        >
          <InsetFrame color={T.sienna} inset={5} radius={14} opacity={0.22} opacity2={0.1} />
          {[...players].sort((a,b) => b.pontuacao - a.pontuacao).map((p, i) => {
            const isEspia = espiaIds.includes(p.id);
            return (
              <motion.div key={p.id} variants={rowVariants} style={{ position: "relative", display: "flex", alignItems: "center", gap: 12, padding: "8px 10px", borderBottom: i < players.length - 1 ? `1px solid ${T.hairline}` : "none" }}>
                <div style={{ width: 18, fontFamily: F.mono, fontSize: 11, fontWeight: 700, color: i === 0 ? T.sienna : T.muted, textAlign: "center" }}>{String(i+1).padStart(2,"0")}</div>
                <MEAvatar size={34} initial={p.apelido.slice(0,1)} variant={i === 0 ? "gold" : "light"} />
                <div style={{ flex: 1, fontFamily: F.sans, fontSize: 15, fontWeight: 600, color: T.ink }}>{p.apelido}</div>
                {isEspia && <span style={{ fontFamily: F.mono, fontSize: 9, fontWeight: 700, color: T.brick, border: `1px solid ${T.brick}`, borderRadius: 4, padding: "2px 6px", textTransform: "uppercase" }}>Espia</span>}
                <div style={{ fontFamily: F.serif, fontSize: 20, fontWeight: 600, minWidth: 28, textAlign: "right", color: T.ink, fontVariantNumeric: "tabular-nums" }}>{p.pontuacao}</div>
              </motion.div>
            );
          })}
        </motion.div>
      </div>

      <div style={{ flex: 1 }} />

      <div style={{ position: "relative", zIndex: 1, display: "flex", gap: 10 }}>
        <button onClick={() => router.push("/")} style={{ flex: 1, background: T.card, color: T.ink, border: `1px solid ${T.hairlineStrong}`, borderRadius: 999, padding: "13px 16px", fontFamily: F.sans, fontSize: 12, fontWeight: 700, letterSpacing: "0.06em", textTransform: "uppercase", cursor: "pointer" }}>
          Sair
        </button>
        <div style={{ flex: 2 }}>
          {salaEncerrada ? (
            <PrimaryBtn accent={T.gold} onClick={() => router.push(`/sala/${code}/placar`)}>Ver Placar Final</PrimaryBtn>
          ) : (
            <PrimaryBtn accent={T.gold} disabled={starting} onClick={handleProxima}>
              {starting ? "Iniciando…" : "Próxima Rodada"}
            </PrimaryBtn>
          )}
        </div>
      </div>
    </main>
  );
}
