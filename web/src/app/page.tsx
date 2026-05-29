"use client";
import Link from "next/link";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { motion } from "motion/react";
import { toast } from "sonner";
import { useAuth } from "@/hooks/useAuth";
import { validarEmail } from "@/lib/auth-validation";
import { PageShell, InsetFrame, MEMedallion, MERule, Eyebrow, PrimaryBtn, OutlineBtn, T, F } from "@/components/ui/design";

export default function HomePage() {
  const router = useRouter();
  const { entrar, entrarComGoogle, isAnonymous, loading: authLoading } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPwd, setShowPwd] = useState(false);
  const [loading, setLoading] = useState(false);

  // Já logado (sessão real persistida) → pula a tela de login.
  const jaLogado = !authLoading && !isAnonymous;
  useEffect(() => {
    if (jaLogado) router.replace("/entrar");
  }, [jaLogado, router]);

  async function handleEntrar() {
    if (!validarEmail(email) || !password) return;
    setLoading(true);
    const { error } = await entrar(email.trim(), password);
    setLoading(false);
    if (error) {
      toast.error(error);
      return;
    }
    router.push("/entrar");
  }

  async function handleGoogle() {
    const { error } = await entrarComGoogle();
    if (error) toast.error(error);
    // Em sucesso, o provedor redireciona para /auth/callback.
  }

  // Enquanto resolve a sessão ou redireciona um usuário já logado,
  // não mostra o formulário de login (evita flash).
  if (authLoading || jaLogado) return null;

  return (
    <PageShell>

      {/* Hebrew watermark */}
      <div style={{ position: "absolute", top: 60, left: "50%", transform: "translateX(-50%)", fontFamily: F.display, fontSize: 280, lineHeight: 1, color: T.sienna, opacity: 0.055, pointerEvents: "none", userSelect: "none", zIndex: 0 }}>שׁ</div>

      {/* Decorative medallion */}
      <motion.div
        initial={{ opacity: 0, scale: 0.8 }}
        animate={{ opacity: 0.3, scale: 1 }}
        transition={{ duration: 0.6, delay: 0.2, ease: "easeOut" }}
        style={{ position: "absolute", top: 24, right: 18, zIndex: 1 }}
      >
        <MEMedallion size={48} inset="eye" variant="light" />
      </motion.div>

      {/* Brand block */}
      <motion.div
        initial={{ opacity: 0, y: 18 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.42, ease: "easeOut" }}
        style={{ position: "relative", zIndex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 14, marginTop: 32, flex: 1 }}
      >
        <Eyebrow color={T.sienna}>Um jogo de dedução</Eyebrow>
        <div style={{ position: "relative" }}>
          {/* Walls of Jericho — bricks circle the title clockwise, then tumble outward */}
          <div style={{ position: "absolute", top: "calc(50% + 40px)", left: "50%", width: 0, height: 0, pointerEvents: "none", zIndex: 0 }}>
            {Array.from({ length: 18 }, (_, i) => {
              const angle = (i * 360) / 18 - 90;
              const rad = (angle * Math.PI) / 180;
              const radius = 160;
              const x = Math.cos(rad) * radius;
              const y = Math.sin(rad) * radius;
              const buildDelay = 0.6 + i * 0.09;
              const tumbleX = Math.cos(rad) * 90;
              const tumbleY = Math.sin(rad) * 90 + 70;
              const tumbleRot = i % 2 === 0 ? 80 : -80;
              return (
                <motion.div
                  key={i}
                  animate={{
                    opacity: [0, 0.5, 0.5, 0],
                    scale: [0.3, 1, 1, 0.85],
                    x: [x, x, x, x + tumbleX],
                    y: [y, y, y, y + tumbleY],
                    rotate: [angle + 90, angle + 90, angle + 90, angle + 90 + tumbleRot],
                  }}
                  transition={{
                    duration: 6,
                    delay: buildDelay,
                    times: [0, 0.1, 0.72, 1],
                    ease: ["easeOut", "linear", "easeIn"],
                    repeat: Infinity,
                    repeatDelay: 1.2,
                  }}
                  style={{ position: "absolute", top: 0, left: 0, width: 26, height: 9, marginLeft: -13, marginTop: -4.5, background: T.brick, borderRadius: 1.5 }}
                />
              );
            })}
          </div>
          <div style={{ position: "relative", zIndex: 1, fontFamily: F.display, fontSize: 52, fontWeight: 500, lineHeight: 0.95, letterSpacing: "-0.01em", color: T.ink, textAlign: "center" }}>
            Missão<br />
            <span style={{ color: T.sienna, fontWeight: 700 }}>Espia</span>
          </div>
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
            <Link href="/conta/recuperar" style={{ background: "none", border: "none", fontFamily: F.sans, fontSize: 12, fontWeight: 500, color: T.muted, cursor: "pointer", padding: 0, textDecoration: "none" }}>
              Esqueci a senha
            </Link>
          </div>

          <div style={{ position: "relative" }}>
            <PrimaryBtn accent={T.gold} disabled={!email.trim() || !password || loading} onClick={handleEntrar}>
              {loading ? "Entrando…" : "Entrar"}
            </PrimaryBtn>
          </div>
        </div>

        {/* Google CTA */}
        <div style={{ marginTop: 14 }}>
          <OutlineBtn onClick={handleGoogle} icon={
            <svg viewBox="0 0 24 24" width={16} height={16}>
              <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.27-4.74 3.27-8.1z"/>
              <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84A11 11 0 0 0 12 23z"/>
              <path fill="#FBBC05" d="M5.84 14.1a6.6 6.6 0 0 1 0-4.2V7.06H2.18a11 11 0 0 0 0 9.88l3.66-2.84z"/>
              <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84C6.71 7.31 9.14 5.38 12 5.38z"/>
            </svg>
          }>
            Entrar com Google
          </OutlineBtn>
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
        <Link href="/conta/criar" style={{ fontFamily: F.sans, fontSize: 13, fontWeight: 600, color: T.sienna, textDecoration: "none", letterSpacing: "0.02em" }}>
          Crie sua conta
        </Link>
      </motion.div>
    </PageShell>
  );
}
