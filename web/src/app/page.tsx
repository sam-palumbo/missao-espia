"use client";
import Link from "next/link";
import { useState } from "react";
import { motion } from "motion/react";
import { ParchmentBg, InsetFrame, MEMedallion, MERule, Eyebrow, PrimaryBtn, OutlineBtn, T, F } from "@/components/ui/design";

export default function HomePage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPwd, setShowPwd] = useState(false);

  return (
    <main className="page-root" style={{ position: "relative", minHeight: "100dvh", display: "flex", flexDirection: "column", padding: "62px clamp(20px, 5vw, 56px) 48px", background: T.bg, width: "100%", maxWidth: 860, margin: "0 auto" }}>
      <ParchmentBg />

      {/* Hebrew watermark */}
      <div style={{ position: "absolute", top: 60, left: "50%", transform: "translateX(-50%)", fontFamily: F.display, fontSize: 280, lineHeight: 1, color: T.sienna, opacity: 0.055, pointerEvents: "none", userSelect: "none", zIndex: 0 }}>שׁ</div>

      {/* Decorative medallion */}
      <motion.div
        initial={{ opacity: 0, scale: 0.8 }}
        animate={{ opacity: 0.3, scale: 1 }}
        transition={{ duration: 0.6, delay: 0.2, ease: "easeOut" }}
        style={{ position: "absolute", top: 24, right: 18, zIndex: 1 }}
      >
        <MEMedallion size={48} inset="star" variant="light" />
      </motion.div>

      {/* Brand block */}
      <motion.div
        initial={{ opacity: 0, y: 18 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.42, ease: "easeOut" }}
        style={{ position: "relative", zIndex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 14, marginTop: 32, flex: 1 }}
      >
        <Eyebrow color={T.sienna}>Um jogo de dedução</Eyebrow>
        <div style={{ fontFamily: F.display, fontSize: 52, fontWeight: 500, lineHeight: 0.95, letterSpacing: "-0.01em", color: T.ink, textAlign: "center" }}>
          Missão<br />
          <span style={{ color: T.sienna, fontWeight: 700 }}>Espia</span>
        </div>
        <div style={{ width: "60%" }}><MERule color={T.sienna} /></div>
        <div style={{ fontFamily: F.bodySerif, fontStyle: "italic", fontSize: 15, lineHeight: 1.4, color: T.inkSoft, textAlign: "center", maxWidth: 260 }}>
          Reúna seus amigos.<br />Descubra quem é o espia.
        </div>
      </motion.div>

      {/* Login card + actions */}
      <motion.div
        initial={{ opacity: 0, y: 28 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.42, ease: "easeOut", delay: 0.1 }}
        style={{ position: "relative", zIndex: 1, marginTop: 28 }}
      >
        {/* Card with email + password */}
        <div style={{ background: T.card, borderRadius: 22, padding: "20px 18px", boxShadow: "0 10px 28px -14px rgba(58,42,20,0.28)", position: "relative", display: "flex", flexDirection: "column", gap: 14 }}>
          <InsetFrame color={T.sienna} inset={6} radius={18} />

          <div style={{ position: "relative" }}>
            <label style={{ display: "block", fontFamily: F.sans, fontSize: 10, fontWeight: 700, letterSpacing: "0.18em", color: T.inkSoft, textTransform: "uppercase", marginBottom: 6 }}>Seu E-mail</label>
            <input
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              placeholder="joao@exemplo.com"
              autoComplete="email"
              style={{ width: "100%", background: T.cardWarm, border: `1px solid ${T.hairlineStrong}`, borderRadius: 12, padding: "13px 14px", fontFamily: F.bodySerif, fontSize: 15, color: T.ink, outline: "none", boxSizing: "border-box" }}
            />
          </div>

          <div style={{ position: "relative" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
              <label style={{ fontFamily: F.sans, fontSize: 10, fontWeight: 700, letterSpacing: "0.18em", color: T.inkSoft, textTransform: "uppercase" }}>Senha</label>
              <button type="button" onClick={() => setShowPwd(v => !v)} style={{ background: "none", border: "none", fontFamily: F.sans, fontSize: 11, fontWeight: 600, color: T.sienna, cursor: "pointer", padding: 0 }}>
                {showPwd ? "Ocultar" : "Mostrar"}
              </button>
            </div>
            <input
              type={showPwd ? "text" : "password"}
              value={password}
              onChange={e => setPassword(e.target.value)}
              placeholder="••••••••"
              autoComplete="current-password"
              style={{ width: "100%", background: T.cardWarm, border: `1px solid ${T.hairlineStrong}`, borderRadius: 12, padding: "13px 14px", fontFamily: F.bodySerif, fontSize: 15, color: T.ink, outline: "none", boxSizing: "border-box" }}
            />
          </div>

          <div style={{ textAlign: "right", marginTop: -6 }}>
            <button type="button" style={{ background: "none", border: "none", fontFamily: F.sans, fontSize: 12, fontWeight: 500, color: T.muted, cursor: "pointer", padding: 0 }}>
              Esqueci a senha
            </button>
          </div>

          <div style={{ position: "relative" }}>
            <PrimaryBtn accent={T.gold} disabled={!email.trim() || !password}>Entrar</PrimaryBtn>
          </div>
        </div>

        {/* Divider */}
        <div style={{ display: "flex", alignItems: "center", gap: 10, margin: "16px 8px 14px" }}>
          <div style={{ flex: 1, height: 1, background: T.hairlineStrong }} />
          <span style={{ fontFamily: F.sans, fontSize: 11, fontWeight: 600, color: T.inkSoft, letterSpacing: "0.18em", textTransform: "uppercase" }}>ou</span>
          <div style={{ flex: 1, height: 1, background: T.hairlineStrong }} />
        </div>

        {/* Visitor CTA */}
        <Link href="/entrar" style={{ textDecoration: "none" }}>
          <OutlineBtn icon={
            <svg viewBox="0 0 24 24" width={14} height={14} fill="none" stroke={T.sienna} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
              <path d="M13 6 L19 12 L13 18" />
            </svg>
          }>
            Entrar como Visitante
          </OutlineBtn>
        </Link>
      </motion.div>

      {/* Footer */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.4, delay: 0.3 }}
        style={{ position: "relative", zIndex: 1, marginTop: 20, textAlign: "center" }}
      >
        <span style={{ fontFamily: F.bodySerif, fontStyle: "italic", fontSize: 13, color: T.inkSoft }}>Novo por aqui? </span>
        <Link href="/criar" style={{ fontFamily: F.sans, fontSize: 13, fontWeight: 600, color: T.sienna, textDecoration: "none", letterSpacing: "0.02em" }}>
          Crie sua conta
        </Link>
      </motion.div>
    </main>
  );
}
