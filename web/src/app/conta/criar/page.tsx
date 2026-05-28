"use client";
import { useState } from "react";
import Link from "next/link";
import { motion } from "motion/react";
import { toast } from "sonner";
import { Input } from "@/components/ui/Input";
import { useAuth } from "@/hooks/useAuth";
import { validarEmail, validarSenha, validarConfirmacao } from "@/lib/auth-validation";
import { ParchmentBg, InsetFrame, Eyebrow, PrimaryBtn, OutlineBtn, T, F } from "@/components/ui/design";

const GoogleIcon = (
  <svg viewBox="0 0 24 24" width={16} height={16}>
    <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.27-4.74 3.27-8.1z"/>
    <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84A11 11 0 0 0 12 23z"/>
    <path fill="#FBBC05" d="M5.84 14.1a6.6 6.6 0 0 1 0-4.2V7.06H2.18a11 11 0 0 0 0 9.88l3.66-2.84z"/>
    <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84C6.71 7.31 9.14 5.38 12 5.38z"/>
  </svg>
);

export default function CriarContaPage() {
  const { criarConta, entrarComGoogle } = useAuth();
  const [email, setEmail] = useState("");
  const [senha, setSenha] = useState("");
  const [confirmacao, setConfirmacao] = useState("");
  const [showPwd, setShowPwd] = useState(false);
  const [loading, setLoading] = useState(false);
  const [enviado, setEnviado] = useState(false);

  async function handleCriar() {
    if (!validarEmail(email)) return toast.error("Informe um e-mail válido");
    const errSenha = validarSenha(senha);
    if (errSenha) return toast.error(errSenha);
    const errConf = validarConfirmacao(senha, confirmacao);
    if (errConf) return toast.error(errConf);

    setLoading(true);
    const { error } = await criarConta(email.trim(), senha);
    setLoading(false);
    if (error) return toast.error(error);
    setEnviado(true);
  }

  async function handleGoogle() {
    const { error } = await entrarComGoogle();
    if (error) toast.error(error);
  }

  return (
    <main className="page-root" style={{ position: "relative", minHeight: "100dvh", display: "flex", flexDirection: "column", padding: "62px clamp(20px, 5vw, 56px) 48px", background: T.bg, width: "100%", maxWidth: 860, margin: "0 auto" }}>
      <ParchmentBg />

      <div style={{ position: "relative", zIndex: 1, display: "flex", flexDirection: "column", flex: 1 }}>
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
          <Eyebrow color={T.inkSoft}>Criar conta</Eyebrow>
        </motion.div>

        {/* Hero */}
        <motion.div
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.38, ease: "easeOut", delay: 0.06 }}
          style={{ marginBottom: 24 }}
        >
          <Eyebrow color={T.sienna}>Bem-vindo</Eyebrow>
          <div style={{ fontFamily: F.display, fontSize: 36, fontWeight: 500, lineHeight: 1.1, color: T.ink, marginTop: 8 }}>
            Crie sua<br />
            <span style={{ color: T.sienna, fontWeight: 700 }}>conta</span>.
          </div>
        </motion.div>

        {enviado ? (
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            style={{ background: T.card, borderRadius: 22, padding: "28px 20px", boxShadow: "0 10px 28px -14px rgba(58,42,20,0.28)", position: "relative", textAlign: "center" }}
          >
            <InsetFrame color={T.sienna} inset={6} radius={18} />
            <div style={{ position: "relative", fontFamily: F.serif, fontSize: 20, fontWeight: 600, color: T.ink, marginBottom: 8 }}>
              Confirme seu e-mail
            </div>
            <div style={{ position: "relative", fontFamily: F.bodySerif, fontSize: 15, color: T.inkSoft, lineHeight: 1.5 }}>
              Enviamos um link de confirmação para <strong>{email}</strong>. Abra o
              e-mail e clique no link para ativar sua conta.
            </div>
            <div style={{ position: "relative", marginTop: 20 }}>
              <Link href="/" style={{ textDecoration: "none" }}>
                <PrimaryBtn accent={T.gold}>Voltar ao início</PrimaryBtn>
              </Link>
            </div>
          </motion.div>
        ) : (
          <>
            <motion.div
              initial={{ opacity: 0, y: 18 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.42, ease: "easeOut", delay: 0.12 }}
              style={{ background: T.card, borderRadius: 22, padding: "20px 18px", boxShadow: "0 10px 28px -14px rgba(58,42,20,0.28)", position: "relative", display: "flex", flexDirection: "column", gap: 16 }}
            >
              <InsetFrame color={T.sienna} inset={6} radius={18} />

              <div style={{ position: "relative" }}>
                <Input id="email" label="Seu E-mail" type="email" autoComplete="email" placeholder="joao@exemplo.com" value={email} onChange={e => setEmail(e.target.value)} />
              </div>

              <div style={{ position: "relative" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
                  <label htmlFor="senha" style={{ fontFamily: F.sans, fontSize: 11, fontWeight: 700, letterSpacing: "0.18em", color: T.inkSoft, textTransform: "uppercase" }}>Senha</label>
                  <button type="button" onClick={() => setShowPwd(v => !v)} style={{ background: "none", border: "none", fontFamily: F.sans, fontSize: 11, fontWeight: 600, color: T.sienna, cursor: "pointer", padding: 0 }}>
                    {showPwd ? "Ocultar" : "Mostrar"}
                  </button>
                </div>
                <Input id="senha" type={showPwd ? "text" : "password"} autoComplete="new-password" placeholder="Mínimo 6 caracteres" value={senha} onChange={e => setSenha(e.target.value)} />
              </div>

              <div style={{ position: "relative" }}>
                <Input id="confirmacao" label="Confirmar Senha" type={showPwd ? "text" : "password"} autoComplete="new-password" placeholder="Repita a senha" value={confirmacao} onChange={e => setConfirmacao(e.target.value)} />
              </div>

              <div style={{ position: "relative" }}>
                <PrimaryBtn accent={T.gold} disabled={!email.trim() || !senha || !confirmacao || loading} onClick={handleCriar}>
                  {loading ? "Criando…" : "Criar Conta"}
                </PrimaryBtn>
              </div>
            </motion.div>

            {/* Divider */}
            <div style={{ display: "flex", alignItems: "center", gap: 10, margin: "16px 8px 14px" }}>
              <div style={{ flex: 1, height: 1, background: T.hairlineStrong }} />
              <span style={{ fontFamily: F.sans, fontSize: 11, fontWeight: 600, color: T.inkSoft, letterSpacing: "0.18em", textTransform: "uppercase" }}>ou</span>
              <div style={{ flex: 1, height: 1, background: T.hairlineStrong }} />
            </div>

            <OutlineBtn onClick={handleGoogle} icon={GoogleIcon}>Criar com Google</OutlineBtn>

            <div style={{ flex: 1 }} />
            <div style={{ marginTop: 20, textAlign: "center" }}>
              <span style={{ fontFamily: F.bodySerif, fontStyle: "italic", fontSize: 13, color: T.inkSoft }}>Já tem conta? </span>
              <Link href="/" style={{ fontFamily: F.sans, fontSize: 13, fontWeight: 600, color: T.sienna, textDecoration: "none" }}>
                Entrar
              </Link>
            </div>
          </>
        )}
      </div>
    </main>
  );
}
