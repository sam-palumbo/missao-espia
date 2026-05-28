"use client";
import { useState } from "react";
import Link from "next/link";
import { motion } from "motion/react";
import { toast } from "sonner";
import { Input } from "@/components/ui/Input";
import { useAuth } from "@/hooks/useAuth";
import { validarEmail } from "@/lib/auth-validation";
import { ParchmentBg, InsetFrame, Eyebrow, PrimaryBtn, T, F } from "@/components/ui/design";

export default function RecuperarSenhaPage() {
  const { recuperarSenha } = useAuth();
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [enviado, setEnviado] = useState(false);

  async function handleEnviar() {
    if (!validarEmail(email)) return toast.error("Informe um e-mail válido");
    setLoading(true);
    await recuperarSenha(email.trim());
    setLoading(false);
    // Mensagem neutra sempre — não revela se o e-mail existe (P3/AC4.2).
    setEnviado(true);
  }

  return (
    <main className="page-root" style={{ position: "relative", minHeight: "100dvh", display: "flex", flexDirection: "column", padding: "62px clamp(20px, 5vw, 56px) 48px", background: T.bg, width: "100%", maxWidth: 860, margin: "0 auto" }}>
      <ParchmentBg />

      <div style={{ position: "relative", zIndex: 1, display: "flex", flexDirection: "column", flex: 1 }}>
        <motion.div
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, ease: "easeOut" }}
          style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 24 }}
        >
          <Link href="/" style={{ display: "flex", alignItems: "center", justifyContent: "center", width: 38, height: 38, borderRadius: 19, background: T.card, border: `1px solid ${T.hairline}` }}>
            <svg viewBox="0 0 24 24" width={20} height={20} fill="none" stroke={T.inkSoft} strokeWidth="1.6" strokeLinecap="round"><path d="M15 5 L8 12 L15 19" /></svg>
          </Link>
          <Eyebrow color={T.inkSoft}>Recuperar senha</Eyebrow>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.38, ease: "easeOut", delay: 0.06 }}
          style={{ marginBottom: 24 }}
        >
          <Eyebrow color={T.sienna}>Esqueceu a senha?</Eyebrow>
          <div style={{ fontFamily: F.display, fontSize: 34, fontWeight: 500, lineHeight: 1.1, color: T.ink, marginTop: 8 }}>
            Enviaremos um<br />
            <span style={{ color: T.sienna, fontWeight: 700 }}>link</span> para você.
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
              Verifique seu e-mail
            </div>
            <div style={{ position: "relative", fontFamily: F.bodySerif, fontSize: 15, color: T.inkSoft, lineHeight: 1.5 }}>
              Se houver uma conta com este e-mail, enviamos um link para redefinir a
              senha.
            </div>
            <div style={{ position: "relative", marginTop: 20 }}>
              <Link href="/" style={{ textDecoration: "none" }}>
                <PrimaryBtn accent={T.gold}>Voltar ao início</PrimaryBtn>
              </Link>
            </div>
          </motion.div>
        ) : (
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
              <PrimaryBtn accent={T.gold} disabled={!email.trim() || loading} onClick={handleEnviar}>
                {loading ? "Enviando…" : "Enviar link"}
              </PrimaryBtn>
            </div>
          </motion.div>
        )}
      </div>
    </main>
  );
}
