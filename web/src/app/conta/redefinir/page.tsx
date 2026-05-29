"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { motion } from "motion/react";
import { toast } from "sonner";
import { Input } from "@/components/ui/Input";
import { createClient } from "@/lib/supabase";
import { useAuth } from "@/hooks/useAuth";
import { validarSenha, validarConfirmacao } from "@/lib/auth-validation";
import { PageShell, InsetFrame, Eyebrow, PrimaryBtn, T, F } from "@/components/ui/design";

type Estado = "verificando" | "pronto" | "invalido";

export default function RedefinirSenhaPage() {
  const router = useRouter();
  const { redefinirSenha } = useAuth();
  const [estado, setEstado] = useState<Estado>("verificando");
  const [senha, setSenha] = useState("");
  const [confirmacao, setConfirmacao] = useState("");
  const [showPwd, setShowPwd] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const supabase = createClient();
    let settled = false;

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === "PASSWORD_RECOVERY" || (event === "SIGNED_IN" && session)) {
        settled = true;
        setEstado("pronto");
      }
    });

    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) {
        settled = true;
        setEstado("pronto");
      } else {
        // Sem sessão de recuperação após o processamento do link (AC5.4).
        setTimeout(() => { if (!settled) setEstado("invalido"); }, 1500);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  async function handleRedefinir() {
    const errSenha = validarSenha(senha);
    if (errSenha) return toast.error(errSenha);
    const errConf = validarConfirmacao(senha, confirmacao);
    if (errConf) return toast.error(errConf);

    setLoading(true);
    const { error } = await redefinirSenha(senha);
    setLoading(false);
    if (error) return toast.error(error);
    toast.success("Senha redefinida! Faça login.");
    router.push("/");
  }

  return (
    <PageShell>

      <div style={{ position: "relative", zIndex: 1, display: "flex", flexDirection: "column", flex: 1 }}>
        <motion.div
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, ease: "easeOut" }}
          style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 24 }}
        >
          <Link href="/" aria-label="Voltar ao início" style={{ display: "flex", alignItems: "center", justifyContent: "center", width: 38, height: 38, borderRadius: 19, background: T.card, border: `1px solid ${T.hairline}` }}>
            <svg viewBox="0 0 24 24" width={20} height={20} fill="none" stroke={T.inkSoft} strokeWidth="1.6" strokeLinecap="round"><path d="M15 5 L8 12 L15 19" /></svg>
          </Link>
          <Eyebrow color={T.inkSoft}>Nova senha</Eyebrow>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.38, ease: "easeOut", delay: 0.06 }}
          style={{ marginBottom: 24 }}
        >
          <Eyebrow color={T.sienna}>Quase lá</Eyebrow>
          <div style={{ fontFamily: F.display, fontSize: 34, fontWeight: 500, lineHeight: 1.1, color: T.ink, marginTop: 8 }}>
            Defina sua<br />
            <span style={{ color: T.sienna, fontWeight: 700 }}>nova senha</span>.
          </div>
        </motion.div>

        {estado === "invalido" && (
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            style={{ background: T.card, borderRadius: 22, padding: "28px 20px", boxShadow: "0 10px 28px -14px rgba(58,42,20,0.28)", position: "relative", textAlign: "center" }}
          >
            <InsetFrame color={T.sienna} inset={6} radius={18} />
            <div style={{ position: "relative", fontFamily: F.serif, fontSize: 20, fontWeight: 600, color: T.ink, marginBottom: 8 }}>
              Link inválido ou expirado
            </div>
            <div style={{ position: "relative", fontFamily: F.bodySerif, fontSize: 15, color: T.inkSoft, lineHeight: 1.5 }}>
              Este link de redefinição não é mais válido. Solicite um novo.
            </div>
            <div style={{ position: "relative", marginTop: 20 }}>
              <Link href="/conta/recuperar" style={{ textDecoration: "none" }}>
                <PrimaryBtn accent={T.gold}>Solicitar novo link</PrimaryBtn>
              </Link>
            </div>
          </motion.div>
        )}

        {estado === "pronto" && (
          <motion.div
            initial={{ opacity: 0, y: 18 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.42, ease: "easeOut" }}
            style={{ background: T.card, borderRadius: 22, padding: "20px 18px", boxShadow: "0 10px 28px -14px rgba(58,42,20,0.28)", position: "relative", display: "flex", flexDirection: "column", gap: 16 }}
          >
            <InsetFrame color={T.sienna} inset={6} radius={18} />

            <div style={{ position: "relative" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
                <label htmlFor="senha" style={{ fontFamily: F.sans, fontSize: 11, fontWeight: 700, letterSpacing: "0.18em", color: T.inkSoft, textTransform: "uppercase" }}>Nova Senha</label>
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
              <PrimaryBtn accent={T.gold} disabled={!senha || !confirmacao || loading} onClick={handleRedefinir}>
                {loading ? "Salvando…" : "Redefinir Senha"}
              </PrimaryBtn>
            </div>
          </motion.div>
        )}
      </div>
    </PageShell>
  );
}
