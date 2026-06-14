"use client";
import Link from "next/link";
import { use, useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "motion/react";
import { usePlayers } from "@/hooks/usePlayers";
import { useSala } from "@/hooks/useSala";
import { useAuth } from "@/hooks/useAuth";
import { gameActions } from "@/lib/game-actions";
import { createClient } from "@/lib/supabase";
import { toast } from "sonner";
import { PageShell, InsetFrame, MEAvatar, MEIcon, Eyebrow, PrimaryBtn, T, F } from "@/components/ui/design";
import { numEspias } from "@shared/espias";

const playerListVariants = {
  show: { transition: { staggerChildren: 0.07 } },
};
const playerItemVariants = {
  hidden: { opacity: 0, scale: 0.88 },
  show: { opacity: 1, scale: 1, transition: { type: "spring" as const, stiffness: 380, damping: 26 } },
};


export default function LobbyPage({ params }: { params: Promise<{ code: string }> }) {
  const { code } = use(params);
  const router = useRouter();
  const { user } = useAuth();
  const { sala, notFound } = useSala(code);
  const salaId = sala?.id ?? null;
  const anfitriaoId = sala?.anfitriao ?? null;
  const numRodadas = sala?.num_rodadas ?? null;
  const maxJogadores = sala?.max_jogadores ?? 12;
  // Modo escolhido pelo anfitrião (ou recebido via realtime) sobrepõe o da carga inicial.
  const [modoOverride, setModoOverride] = useState<"online" | "presencial" | null>(null);
  const modo = modoOverride ?? sala?.modo ?? "online";
  const [copied, setCopied] = useState(false);
  const [starting, setStarting] = useState(false);
  const [addingBot, setAddingBot] = useState(false);
  const players = usePlayers(salaId);

  useEffect(() => {
    if (notFound) { toast.error("Sala não encontrada"); router.push("/"); }
  }, [notFound, router]);

  useEffect(() => {
    if (sala?.status === "jogando") router.push(`/sala/${code}/jogo`);
  }, [sala?.status, code, router]);

  useEffect(() => {
    if (!salaId) return;
    const supabase = createClient();
    const channel = supabase
      .channel(`sala-status:${salaId}`)
      .on("postgres_changes", { event: "UPDATE", schema: "public", table: "salas", filter: `id=eq.${salaId}` },
        (payload) => {
          if (payload.new.status === "jogando") router.push(`/sala/${code}/jogo`);
          if (payload.new.modo) setModoOverride(payload.new.modo);
        })
      .subscribe();
    const interval = setInterval(async () => {
      const { data } = await supabase.from("salas").select("status").eq("id", salaId).single();
      if (data?.status === "jogando") router.push(`/sala/${code}/jogo`);
    }, 3000);
    return () => { supabase.removeChannel(channel); clearInterval(interval); };
  }, [salaId, code, router]);

  const isHost = user?.id === anfitriaoId;

  async function handleIniciar() {
    if (!salaId) return;
    setStarting(true);
    try {
      await gameActions.iniciarRodada(salaId);
      router.push(`/sala/${code}/jogo`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erro ao iniciar");
      setStarting(false);
    }
  }

  async function handleModoChange(novo: "online" | "presencial") {
    if (!salaId || !isHost || novo === modo) return;
    try {
      await gameActions.definirModo(salaId, novo);
      setModoOverride(novo);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Falha ao mudar modo");
    }
  }

  async function handleAdicionarBot() {
    if (!salaId) return;
    setAddingBot(true);
    try {
      await gameActions.adicionarBot(salaId);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erro ao adicionar bot");
    } finally {
      setAddingBot(false);
    }
  }

  async function handleRemoverBot(jogadorId: string) {
    if (!salaId) return;
    try {
      await gameActions.removerBot(salaId, jogadorId);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erro ao remover bot");
    }
  }

  function copyCode() {
    navigator.clipboard.writeText(code).catch(() => {});
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  const espias = players.length >= 4 ? numEspias(players.length) : null;

  return (
    <PageShell>

      <div style={{ position: "relative", zIndex: 1, display: "flex", flexDirection: "column", flex: 1, gap: 16 }}>
        {/* TopBar */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 4 }}>
          <Link href="/" aria-label="Voltar ao início" style={{ display: "flex", alignItems: "center", justifyContent: "center", width: 38, height: 38, borderRadius: 19, background: T.card, border: `1px solid ${T.hairline}` }}>
            <svg viewBox="0 0 24 24" width={20} height={20} fill="none" stroke={T.inkSoft} strokeWidth="1.6" strokeLinecap="round"><path d="M15 5 L8 12 L15 19" /></svg>
          </Link>
          <Eyebrow color={T.inkSoft}>Sala de Espera</Eyebrow>
          <button onClick={copyCode} aria-label="Copiar código da sala" style={{ display: "flex", alignItems: "center", justifyContent: "center", width: 38, height: 38, borderRadius: 19, background: T.card, border: `1px solid ${T.hairline}`, cursor: "pointer" }}>
            <MEIcon name="share" size={16} color={T.inkSoft} />
          </button>
        </div>

        {/* Room code — dark card */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ type: "spring", stiffness: 340, damping: 28, delay: 0.06 }}
          style={{ background: T.inkDeep, borderRadius: 22, padding: "18px 20px", display: "flex", alignItems: "center", justifyContent: "space-between", position: "relative", overflow: "hidden" }}
        >
          <InsetFrame color={T.gold} inset={6} radius={18} opacity={0.5} opacity2={0.25} />
          <div style={{ position: "relative" }}>
            <Eyebrow color={T.gold} size={10}>Código da Sala</Eyebrow>
            <div style={{ fontFamily: F.mono, fontSize: 28, fontWeight: 700, letterSpacing: "0.4em", marginTop: 6, color: T.gold }}>{code}</div>
          </div>
          <button onClick={copyCode} style={{ position: "relative", background: T.gold, color: T.ink, border: "none", borderRadius: 999, padding: "8px 14px", fontFamily: F.sans, fontSize: 11, fontWeight: 700, letterSpacing: "0.06em", textTransform: "uppercase", display: "flex", alignItems: "center", gap: 6, cursor: "pointer" }}>
            <MEIcon name="share" size={12} color={T.ink} />
            {copied ? "Copiado!" : "Convidar"}
          </button>
        </motion.div>

        {/* Stats row */}
        <div style={{ display: "flex", gap: 12 }}>
          {[
            { label: "Rodadas", value: numRodadas ?? "—", icon: "clock" },
            { label: "Espias", value: espias ?? "—", color: T.brick },
          ].map((s, i) => (
            <div key={i} style={{ flex: 1, background: T.card, borderRadius: 18, padding: "12px 14px", display: "flex", alignItems: "center", gap: 12, position: "relative", boxShadow: "0 4px 14px -10px rgba(58,42,20,0.2)" }}>
              <InsetFrame color={T.sienna} inset={5} radius={14} opacity={0.22} opacity2={0.1} />
              <div style={{ position: "relative", flex: 1 }}>
                <Eyebrow color={T.inkSoft} size={9}>{s.label}</Eyebrow>
                <div style={{ fontFamily: F.serif, fontSize: 22, fontWeight: 600, color: (s as {color?: string}).color ?? T.ink, lineHeight: 1.1, marginTop: 2 }}>{s.value}</div>
              </div>
            </div>
          ))}
        </div>

        {/* Players */}
        <div>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 10, padding: "0 4px" }}>
            <div style={{ fontFamily: F.serif, fontSize: 22, fontWeight: 600, color: T.ink }}>Jogadores</div>
            <div style={{ fontFamily: F.mono, fontSize: 11, fontWeight: 700, color: T.sienna, background: T.siennaSoft, padding: "4px 10px", borderRadius: 999, letterSpacing: "0.1em" }}>
              {String(players.length).padStart(2,"0")} / {maxJogadores}
            </div>
          </div>

          <motion.div
            style={{ background: T.card, borderRadius: 22, padding: 14, boxShadow: "0 6px 18px -12px rgba(58,42,20,0.28)", display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, position: "relative" }}
            variants={playerListVariants}
            initial="hidden"
            animate="show"
          >
            <InsetFrame color={T.sienna} inset={6} radius={18} opacity={0.25} opacity2={0.12} />
            <AnimatePresence>
              {players.map((p) => (
                <motion.div key={p.id} variants={playerItemVariants} style={{ display: "flex", alignItems: "center", gap: 10, padding: "6px 4px", position: "relative" }}>
                  <MEAvatar size={38} initial={p.apelido.slice(0,1)} variant={p.user_id === anfitriaoId ? "gold" : "light"} />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontFamily: F.sans, fontSize: 14, fontWeight: 600, color: T.ink, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{p.apelido}</div>
                    <div style={{ fontFamily: F.sans, fontSize: 10, fontWeight: 700, letterSpacing: "0.12em", color: p.user_id === anfitriaoId ? T.sienna : T.inkSoft, textTransform: "uppercase", marginTop: 2 }}>
                      {p.user_id === anfitriaoId ? "Anfitrião" : p.is_bot ? "Bot" : "Pronto"}
                    </div>
                  </div>
                  {isHost && p.is_bot && (
                    <button
                      onClick={() => handleRemoverBot(p.id)}
                      aria-label={`Remover bot ${p.apelido}`}
                      style={{ width: 24, height: 24, borderRadius: 12, background: T.cardWarm, border: `1px solid ${T.hairline}`, color: T.inkSoft, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 13, lineHeight: 1, padding: 0 }}
                    >×</button>
                  )}
                </motion.div>
              ))}
            </AnimatePresence>
            {/* Empty slots */}
            {Array.from({ length: Math.max(0, 4 - players.length) }).map((_, i) => (
              <motion.div key={`e${i}`} variants={playerItemVariants} style={{ display: "flex", alignItems: "center", gap: 10, padding: "6px 4px" }}>
                <div style={{ width: 38, height: 38, borderRadius: "50%", border: `1px dashed ${T.hairlineStrong}`, display: "flex", alignItems: "center", justifyContent: "center" }}>
                  <MEIcon name="plus" size={14} color={T.muted} />
                </div>
                <div style={{ fontFamily: F.sans, fontSize: 13, color: T.muted, fontStyle: "italic" }}>Aguardando…</div>
              </motion.div>
            ))}
          </motion.div>

          {isHost && (
            <button
              onClick={handleAdicionarBot}
              disabled={addingBot || players.length >= maxJogadores}
              style={{ width: "100%", marginTop: 10, padding: "10px 14px", borderRadius: 999, background: "transparent", border: `1px dashed ${T.hairlineStrong}`, color: T.inkSoft, fontFamily: F.sans, fontSize: 12, fontWeight: 600, letterSpacing: "0.08em", textTransform: "uppercase", cursor: addingBot || players.length >= maxJogadores ? "default" : "pointer", opacity: addingBot || players.length >= maxJogadores ? 0.5 : 1 }}
            >
              {addingBot ? "Adicionando…" : "+ Adicionar Bot"}
            </button>
          )}
        </div>

        {players.length < 4 && (
          <div style={{ textAlign: "center", fontFamily: F.bodySerif, fontStyle: "italic", fontSize: 13, color: T.inkSoft }}>
            Aguardando mínimo de 4 jogadores…
          </div>
        )}

        <div style={{ flex: 1 }} />

        {isHost ? (
          <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 16 }}>
            <Eyebrow color={T.inkSoft}>Modo</Eyebrow>
            <div style={{ position: "relative", display: "flex", background: T.cardWarm, borderRadius: 999, padding: 4 }}>
              {/* Sliding pill — CSS transform, no layoutId to keep tests clean */}
              <div style={{
                position: "absolute",
                top: 4, bottom: 4,
                left: 4,
                width: "calc(50% - 4px)",
                background: T.ink,
                borderRadius: 999,
                transform: modo === "presencial" ? "translateX(100%)" : "translateX(0)",
                transition: "transform 0.28s cubic-bezier(0.34, 1.56, 0.64, 1)",
                pointerEvents: "none",
              }} />
              <button
                onClick={() => handleModoChange("online")}
                aria-pressed={modo === "online"}
                style={{
                  position: "relative", zIndex: 1,
                  flex: 1, padding: "10px 14px", borderRadius: 999,
                  border: "none", cursor: "pointer", background: "transparent",
                  color: modo === "online" ? T.cardWarm : T.ink,
                  fontFamily: F.sans, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.08em", fontSize: 12,
                  transition: "color 0.2s",
                }}
              >Online</button>
              <button
                onClick={() => handleModoChange("presencial")}
                aria-pressed={modo === "presencial"}
                style={{
                  position: "relative", zIndex: 1,
                  flex: 1, padding: "10px 14px", borderRadius: 999,
                  border: "none", cursor: "pointer", background: "transparent",
                  color: modo === "presencial" ? T.cardWarm : T.ink,
                  fontFamily: F.sans, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.08em", fontSize: 12,
                  transition: "color 0.2s",
                }}
              >Presencial</button>
            </div>
            {modo === "presencial" && (
              <div style={{ fontFamily: F.bodySerif, fontSize: 13, color: T.inkSoft, lineHeight: 1.4 }}>
                Para jogo presencial. Cada jogador faz pergunta/responde em voz alta — o app só controla turnos, acusações e tempo.
              </div>
            )}
          </div>
        ) : (
          <div style={{ fontFamily: F.sans, fontSize: 12, color: T.inkSoft, marginBottom: 16, textTransform: "uppercase", letterSpacing: "0.08em" }}>
            Modo: {modo === "presencial" ? "Presencial" : "Online"}
          </div>
        )}

        {isHost ? (
          <PrimaryBtn disabled={players.length < 4 || starting} accent={T.gold} onClick={handleIniciar}>
            {starting ? "Iniciando…" : "Iniciar Partida"}
          </PrimaryBtn>
        ) : (
          <div style={{ textAlign: "center", fontFamily: F.bodySerif, fontStyle: "italic", fontSize: 14, color: T.inkSoft }}>
            Aguardando o anfitrião iniciar…
          </div>
        )}
      </div>
    </PageShell>
  );
}
