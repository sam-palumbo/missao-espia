"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { motion, AnimatePresence } from "motion/react";
import { Input } from "@/components/ui/Input";
import { gameActions } from "@/lib/game-actions";
import { EVENTOS } from "@/lib/eventos";
import { toast } from "sonner";
import { ParchmentBg, InsetFrame, MEMedallion, MERule, Eyebrow, PrimaryBtn, T, F } from "@/components/ui/design";

const atEvents = EVENTOS.filter(e => e.testament === "AT");
const ntEvents = EVENTOS.filter(e => e.testament === "NT");
const atMin = Math.min(...atEvents.map(e => e.id));
const atMax = Math.max(...atEvents.map(e => e.id));
const ntMin = Math.min(...ntEvents.map(e => e.id));
const ntMax = Math.max(...ntEvents.map(e => e.id));

function numEspias(n: number) {
  if (n <= 6) return 1;
  if (n <= 9) return 2;
  return 3;
}
function duracaoRecomendada(maxJog: number) {
  return 5 + maxJog - numEspias(maxJog);
}

function ConfigSlider({ label, value, min, max, onChange, unit, badge }: {
  label: string; value: number; min: number; max: number;
  onChange: (v: number) => void; unit?: string; badge?: string;
}) {
  const count = max - min + 1;
  const dotSize = count > 10 ? 5 : 7;
  const thumbSize = count > 10 ? 16 : 20;
  const fillPct = ((value - min) / (max - min)) * 100;

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
        <Eyebrow color={T.inkSoft} size={10}>{label}</Eyebrow>
        <div style={{ display: "flex", alignItems: "baseline", gap: 5 }}>
          <motion.span
            key={value}
            initial={{ opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ type: "spring", stiffness: 500, damping: 30 }}
            style={{ fontFamily: F.serif, fontSize: 22, fontWeight: 600, color: T.sienna, lineHeight: 1 }}
          >
            {value}
          </motion.span>
          {unit && <span style={{ fontFamily: F.mono, fontSize: 10, color: T.muted }}>{unit}</span>}
          {badge && (
            <span style={{ fontFamily: F.mono, fontSize: 9, fontWeight: 700, color: T.sienna, background: T.siennaSoft, borderRadius: 5, padding: "2px 7px", letterSpacing: "0.06em" }}>
              {badge}
            </span>
          )}
        </div>
      </div>

      <div style={{ position: "relative", height: 36, display: "flex", alignItems: "center" }}>
        {/* track bg */}
        <div style={{ position: "absolute", left: 0, right: 0, height: 2, borderRadius: 1, background: "rgba(138,90,30,0.18)" }} />
        {/* track fill */}
        <div style={{ position: "absolute", left: 0, width: `${fillPct}%`, height: 2, borderRadius: 1, background: T.sienna, transition: "width 0.08s" }} />

        {/* step dots */}
        {Array.from({ length: count }, (_, i) => {
          const v = min + i;
          const pct = count === 1 ? 50 : (i / (count - 1)) * 100;
          const isActive = v === value;
          const isFilled = v <= value;
          const sz = isActive ? thumbSize : dotSize;
          return (
            <div key={v} style={{
              position: "absolute",
              left: `calc(${pct}% - ${sz / 2}px)`,
              width: sz, height: sz,
              borderRadius: "50%",
              background: isActive ? T.sienna : isFilled ? T.sienna : "rgba(138,90,30,0.22)",
              border: isActive ? `2.5px solid ${T.card}` : "none",
              boxShadow: isActive ? `0 0 0 2px ${T.sienna}, 0 3px 10px rgba(138,90,30,0.38)` : "none",
              transition: "all 0.12s",
              zIndex: isActive ? 2 : 1,
              pointerEvents: "none",
            }} />
          );
        })}

        {/* invisible native input for interaction */}
        <input
          type="range" min={min} max={max} value={value} step={1}
          aria-label={label}
          onChange={e => onChange(Number(e.target.value))}
          style={{ position: "absolute", inset: 0, opacity: 0, cursor: "pointer", width: "100%", height: "100%", margin: 0, zIndex: 3 }}
        />
      </div>

      <div style={{ display: "flex", justifyContent: "space-between", marginTop: 5 }}>
        <span style={{ fontFamily: F.mono, fontSize: 10, color: T.muted }}>{min}</span>
        <span style={{ fontFamily: F.mono, fontSize: 10, color: T.muted }}>{max}</span>
      </div>
    </div>
  );
}

const listVariants = {
  show: { transition: { staggerChildren: 0.08 } },
};
const itemVariants = {
  hidden: { opacity: 0, y: 10 },
  show: { opacity: 1, y: 0, transition: { type: "spring" as const, stiffness: 380, damping: 28 } },
};

export default function CriarPage() {
  const router = useRouter();
  const [apelido, setApelido] = useState("");
  const [numRodadas, setNumRodadas] = useState(5);
  const [maxJogadores, setMaxJogadores] = useState(12);
  const [duracaoMinutos, setDuracaoMinutos] = useState(() => duracaoRecomendada(12));
  const [duracaoTocada, setDuracaoTocada] = useState(false);
  const [senha, setSenha] = useState("");
  const [loading, setLoading] = useState(false);
  const [atSel, setAtSel] = useState(true);
  const [ntSel, setNtSel] = useState(true);

  function handleMaxJogadoresChange(v: number) {
    setMaxJogadores(v);
    setDuracaoMinutos(duracaoRecomendada(v));
    setDuracaoTocada(false);
  }
  function handleDuracaoChange(v: number) {
    setDuracaoMinutos(v);
    setDuracaoTocada(true);
  }

  const totalLocais = (atSel ? atEvents.length : 0) + (ntSel ? ntEvents.length : 0);
  const canCreate = (atSel || ntSel) && apelido.trim();

  async function handleCriar() {
    if (!canCreate) return;
    setLoading(true);
    try {
      const testamentos = ([atSel && "AT", ntSel && "NT"] as const).filter(Boolean) as string[];
      const { sala } = await gameActions.criarSala(apelido.trim(), numRodadas, { senha: senha || undefined, testamentos, max_jogadores: maxJogadores, duracao_minutos: duracaoMinutos });
      router.push(`/sala/${sala.codigo}/lobby`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erro ao criar sala");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="page-root" style={{ position: "relative", minHeight: "100dvh", display: "flex", flexDirection: "column", padding: "62px clamp(20px, 5vw, 56px) 48px", background: T.bg }}>
      <ParchmentBg />

      <div style={{ position: "relative", zIndex: 1, display: "flex", flexDirection: "column", flex: 1, gap: 0 }}>
        {/* TopBar */}
        <motion.div
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, ease: "easeOut" }}
          style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 24 }}
        >
          <Link href="/" style={{ display: "flex", alignItems: "center", justifyContent: "center", width: 38, height: 38, borderRadius: 19, background: T.card, border: `1px solid ${T.hairline}` }}>
            <svg viewBox="0 0 24 24" width={20} height={20} fill="none" stroke={T.inkSoft} strokeWidth="1.6" strokeLinecap="round"><path d="M15 5 L8 12 L15 19" /></svg>
          </Link>
          <Eyebrow color={T.inkSoft}>Nova Partida</Eyebrow>
        </motion.div>

        {/* Hero */}
        <motion.div
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.38, ease: "easeOut", delay: 0.06 }}
          style={{ marginBottom: 22 }}
        >
          <Eyebrow color={T.sienna}>Configurar a partida</Eyebrow>
          <div style={{ fontFamily: F.display, fontSize: 34, fontWeight: 500, lineHeight: 1.08, color: T.ink, marginTop: 8 }}>
            Qual escritura<br />
            vamos <span style={{ color: T.sienna, fontWeight: 700 }}>jogar?</span>
          </div>
        </motion.div>

        {/* Scripture selection cards */}
        <motion.div
          variants={listVariants}
          initial="hidden"
          animate="show"
          style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 12 }}
        >
          {/* AT card */}
          <motion.button
            variants={itemVariants}
            onClick={() => { if (ntSel || !atSel) setAtSel(v => !v); }}
            whileTap={{ scale: 0.97 }}
            style={{
              background: atSel ? T.card : T.bg,
              border: `2px solid ${atSel ? T.sienna : T.hairlineStrong}`,
              borderRadius: 18,
              padding: "16px 14px 14px",
              cursor: "pointer",
              textAlign: "left",
              display: "flex",
              flexDirection: "column",
              gap: 8,
              position: "relative",
              boxShadow: atSel ? "0 8px 24px -12px rgba(58,42,20,0.25)" : "none",
              transition: "box-shadow 0.2s, border-color 0.2s, background 0.2s",
            }}
          >
            {atSel && <InsetFrame color={T.sienna} inset={5} radius={14} opacity={0.28} opacity2={0.12} />}
            <div style={{ position: "relative", display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
              <MEMedallion size={40} inset="tablets" variant={atSel ? "light" : "light"} />
              <AnimatePresence>
                {atSel && (
                  <motion.div
                    initial={{ scale: 0, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    exit={{ scale: 0, opacity: 0 }}
                    transition={{ type: "spring", stiffness: 500, damping: 25 }}
                    style={{ width: 20, height: 20, borderRadius: 10, background: T.sienna, display: "flex", alignItems: "center", justifyContent: "center" }}
                  >
                    <svg viewBox="0 0 24 24" width={10} height={10} fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M5 12 L10 17 L19 7" />
                    </svg>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
            <div style={{ position: "relative" }}>
              <div style={{ fontFamily: F.sans, fontSize: 13, fontWeight: 700, color: atSel ? T.ink : T.muted, letterSpacing: "0.01em" }}>Antigo Testamento</div>
              <div style={{ fontFamily: F.mono, fontSize: 11, color: atSel ? T.sienna : T.muted, marginTop: 2 }}>{atEvents.length} locais</div>
              <div style={{ marginTop: 6, display: "inline-flex", background: atSel ? T.siennaSoft : T.hairline, borderRadius: 6, padding: "3px 8px", fontFamily: F.mono, fontSize: 10, fontWeight: 700, color: atSel ? T.sienna : T.muted, letterSpacing: "0.05em" }}>
                {String(atMin).padStart(2,"0")} – {String(atMax).padStart(2,"0")}
              </div>
            </div>
          </motion.button>

          {/* NT card */}
          <motion.button
            variants={itemVariants}
            onClick={() => { if (atSel || !ntSel) setNtSel(v => !v); }}
            whileTap={{ scale: 0.97 }}
            style={{
              background: ntSel ? T.card : T.bg,
              border: `2px solid ${ntSel ? T.sienna : T.hairlineStrong}`,
              borderRadius: 18,
              padding: "16px 14px 14px",
              cursor: "pointer",
              textAlign: "left",
              display: "flex",
              flexDirection: "column",
              gap: 8,
              position: "relative",
              boxShadow: ntSel ? "0 8px 24px -12px rgba(58,42,20,0.25)" : "none",
              transition: "box-shadow 0.2s, border-color 0.2s, background 0.2s",
            }}
          >
            {ntSel && <InsetFrame color={T.sienna} inset={5} radius={14} opacity={0.28} opacity2={0.12} />}
            <div style={{ position: "relative", display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
              <MEMedallion size={40} inset="cross-crown" variant={ntSel ? "light" : "light"} />
              <AnimatePresence>
                {ntSel && (
                  <motion.div
                    initial={{ scale: 0, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    exit={{ scale: 0, opacity: 0 }}
                    transition={{ type: "spring", stiffness: 500, damping: 25 }}
                    style={{ width: 20, height: 20, borderRadius: 10, background: T.sienna, display: "flex", alignItems: "center", justifyContent: "center" }}
                  >
                    <svg viewBox="0 0 24 24" width={10} height={10} fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M5 12 L10 17 L19 7" />
                    </svg>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
            <div style={{ position: "relative" }}>
              <div style={{ fontFamily: F.sans, fontSize: 13, fontWeight: 700, color: ntSel ? T.ink : T.muted, letterSpacing: "0.01em" }}>Novo Testamento</div>
              <div style={{ fontFamily: F.mono, fontSize: 11, color: ntSel ? T.sienna : T.muted, marginTop: 2 }}>{ntEvents.length} locais</div>
              <div style={{ marginTop: 6, display: "inline-flex", background: ntSel ? T.siennaSoft : T.hairline, borderRadius: 6, padding: "3px 8px", fontFamily: F.mono, fontSize: 10, fontWeight: 700, color: ntSel ? T.sienna : T.muted, letterSpacing: "0.05em" }}>
                {String(ntMin).padStart(2,"0")} – {String(ntMax).padStart(2,"0")}
              </div>
            </div>
          </motion.button>
        </motion.div>

        {/* Stats row */}
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.32, delay: 0.22 }}
          style={{ display: "flex", gap: 8, marginBottom: 20 }}
        >
          {[
            { label: "Total", value: <><motion.span key={totalLocais} initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }}>{totalLocais}</motion.span></>, unit: "locais" },
            { label: "Jogadores", value: <motion.span key={maxJogadores} initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }}>4 – {maxJogadores}</motion.span>, unit: "" },
            { label: "Duração", value: <motion.span key={duracaoMinutos} initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }}>~{duracaoMinutos}</motion.span>, unit: "min/rodada" },
          ].map((s, i) => (
            <div key={i} style={{ flex: 1, background: T.card, borderRadius: 14, padding: "10px 12px", textAlign: "center", position: "relative" }}>
              <InsetFrame color={T.sienna} inset={4} radius={11} opacity={0.18} opacity2={0.08} />
              <div style={{ position: "relative", fontFamily: F.serif, fontSize: 18, fontWeight: 600, color: T.ink, lineHeight: 1 }}>{s.value}</div>
              <div style={{ fontFamily: F.sans, fontSize: 9, fontWeight: 700, letterSpacing: "0.12em", color: T.muted, textTransform: "uppercase", marginTop: 3 }}>
                {s.label}{s.unit ? ` ${s.unit}` : ""}
              </div>
            </div>
          ))}
        </motion.div>

        {/* Form card */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.36, ease: "easeOut", delay: 0.16 }}
          style={{ background: T.card, borderRadius: 22, padding: "20px 18px", boxShadow: "0 10px 28px -14px rgba(58,42,20,0.28)", position: "relative", display: "flex", flexDirection: "column", gap: 20, marginBottom: 16 }}
        >
          <InsetFrame color={T.sienna} inset={6} radius={18} />

          <div style={{ position: "relative" }}>
            <Input id="apelido" label="Seu Apelido" placeholder="Ex: Davi, Ester..." value={apelido} onChange={e => setApelido(e.target.value)} maxLength={20} />
          </div>

          <ConfigSlider label="Número de Rodadas" value={numRodadas} min={1} max={7} onChange={setNumRodadas} />

          <ConfigSlider label="Máx. de Jogadores" value={maxJogadores} min={4} max={12} onChange={handleMaxJogadoresChange} />

          <ConfigSlider
            label="Duração por Rodada"
            value={duracaoMinutos}
            min={3}
            max={20}
            onChange={handleDuracaoChange}
            unit="min"
            badge={!duracaoTocada ? "recomendado" : undefined}
          />

          <div style={{ position: "relative" }}>
            <Input id="senha" label="Senha (opcional)" placeholder="Sala pública se vazia" value={senha} onChange={e => setSenha(e.target.value)} maxLength={20} type="password" />
          </div>
        </motion.div>

        {/* Ornament */}
        <div style={{ display: "flex", justifyContent: "center", marginBottom: 16, opacity: 0.45 }}>
          <MERule color={T.sienna} />
        </div>

        <div style={{ flex: 1 }} />

        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.32, delay: 0.28 }}
        >
          <PrimaryBtn disabled={!canCreate || loading} accent={T.gold} onClick={handleCriar}>
            {loading ? "Criando…" : "Criar Sala"}
          </PrimaryBtn>
        </motion.div>
      </div>
    </main>
  );
}
