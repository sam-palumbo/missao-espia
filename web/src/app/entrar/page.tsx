"use client";
import { useState, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import Link from "next/link";
import { motion, AnimatePresence } from "motion/react";
import { Input } from "@/components/ui/Input";
import { gameActions } from "@/lib/game-actions";
import { toast } from "sonner";
import { useAuth } from "@/hooks/useAuth";
import { PageShell, InsetFrame, Eyebrow, PrimaryBtn, OutlineBtn, MEIcon, T, F } from "@/components/ui/design";

function EntrarForm() {
  const params = useSearchParams();
  const router = useRouter();
  const { isAnonymous, loading: authLoading, sair } = useAuth();
  const [codigo, setCodigo] = useState((params.get("code") ?? "").toUpperCase());
  const [apelido, setApelido] = useState("");
  const [senha, setSenha] = useState("");
  const [precisaSenha, setPrecisaSenha] = useState(false);
  const [loading, setLoading] = useState(false);
  const [saindo, setSaindo] = useState(false);

  const logado = !authLoading && !isAnonymous;

  async function handleSair() {
    setSaindo(true);
    const { error } = await sair();
    if (error) {
      setSaindo(false);
      toast.error(error);
      return;
    }
    router.replace("/");
  }

  async function handleEntrar() {
    if (!apelido.trim() || codigo.length < 4) return;
    setLoading(true);
    try {
      const { sala } = await gameActions.entrarSala(codigo, apelido.trim(), senha || undefined);
      router.push(`/sala/${sala.codigo}/lobby`);
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Erro ao entrar";
      if (msg.toLowerCase().includes("senha")) setPrecisaSenha(true);
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={{ position: "relative", zIndex: 1, display: "flex", flexDirection: "column", flex: 1, gap: 0 }}>
      {/* TopBar */}
      <motion.div
        initial={{ opacity: 0, y: -8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, ease: "easeOut" }}
        style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 24 }}
      >
        <Link href="/" aria-label="Voltar ao início" style={{ display: "flex", alignItems: "center", justifyContent: "center", width: 38, height: 38, borderRadius: 19, background: T.card, border: `1px solid ${T.hairline}` }}>
          <svg viewBox="0 0 24 24" width={20} height={20} fill="none" stroke={T.inkSoft} strokeWidth="1.6" strokeLinecap="round"><path d="M15 5 L8 12 L15 19" /></svg>
        </Link>
        <Eyebrow color={T.inkSoft}>Entrar em uma partida</Eyebrow>
        {logado && (
          <button
            type="button"
            onClick={handleSair}
            disabled={saindo}
            style={{ marginLeft: "auto", background: "none", border: "none", fontFamily: F.sans, fontSize: 12, fontWeight: 600, color: T.muted, cursor: saindo ? "default" : "pointer", padding: 0, letterSpacing: "0.02em" }}
          >
            {saindo ? "Saindo…" : "Sair da conta"}
          </button>
        )}
      </motion.div>

      {/* Hero */}
      <motion.div
        initial={{ opacity: 0, y: 14 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.38, ease: "easeOut", delay: 0.06 }}
        style={{ marginBottom: 24 }}
      >
        <Eyebrow color={T.sienna}>Convite recebido?</Eyebrow>
        <div style={{ fontFamily: F.display, fontSize: 36, fontWeight: 500, lineHeight: 1.1, color: T.ink, marginTop: 8 }}>
          Digite o código<br />
          da <span style={{ color: T.sienna, fontWeight: 700 }}>sala</span>.
        </div>
      </motion.div>

      {/* Code + form card */}
      <motion.div
        initial={{ opacity: 0, y: 18 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.42, ease: "easeOut", delay: 0.12 }}
        style={{ background: T.card, borderRadius: 22, padding: "20px 18px", boxShadow: "0 10px 28px -14px rgba(58,42,20,0.28)", position: "relative", display: "flex", flexDirection: "column", gap: 16, marginBottom: 12 }}
      >
        <InsetFrame color={T.sienna} inset={6} radius={18} />

        {/* 4-char boxes */}
        <div style={{ position: "relative" }}>
          <Eyebrow color={T.inkSoft} size={10}>Código</Eyebrow>

          {/* Input invisível que captura a digitação */}
          <input
            type="text"
            inputMode="text"
            autoComplete="off"
            maxLength={4}
            value={codigo}
            onChange={(e) => {
              setCodigo(e.target.value.toUpperCase().replace(/[^A-Z]/g, ""));
            }}
            style={{
              position: "absolute",
              top: 0,
              left: 0,
              width: "100%",
              height: "100%",
              opacity: 0,
              zIndex: 10,
              cursor: "pointer",
              fontSize: 1,
            }}
          />

          <div style={{ marginTop: 8, display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 8 }}>
            {[0,1,2,3].map(i => (
              <div key={i} data-testid="codigo-box" style={{ aspectRatio: "1/1.15", background: T.cardWarm, border: `1px solid ${codigo[i] ? T.sienna : T.hairlineStrong}`, borderRadius: 10, display: "flex", alignItems: "center", justifyContent: "center", fontFamily: F.serif, fontSize: 28, fontWeight: 600, color: T.ink, transition: "border-color 0.2s", overflow: "hidden" }}>
                <AnimatePresence mode="wait">
                  {codigo[i] ? (
                    <motion.span
                      key={codigo[i]}
                      initial={{ opacity: 0, scale: 0.5, y: 8 }}
                      animate={{ opacity: 1, scale: 1, y: 0 }}
                      exit={{ opacity: 0, scale: 0.5, y: -8 }}
                      transition={{ type: "spring", stiffness: 500, damping: 28 }}
                    >
                      {codigo[i]}
                    </motion.span>
                  ) : null}
                </AnimatePresence>
              </div>
            ))}
          </div>
          {!codigo && (
            <div style={{ marginTop: 6, fontFamily: F.sans, fontSize: 12, color: T.muted, fontStyle: "italic" }}>
              Toque acima para digitar o código de 4 letras
            </div>
          )}
        </div>

        <div style={{ position: "relative" }}>
          <Input id="apelido" label="Seu Apelido" placeholder="Ex: Maria, Moisés..." value={apelido} onChange={e => setApelido(e.target.value)} maxLength={20} />
        </div>

        {precisaSenha && (
          <div style={{ position: "relative" }}>
            <Input id="senha" label="Senha da Sala" placeholder="Digite a senha" value={senha} onChange={e => setSenha(e.target.value)} type="password" />
          </div>
        )}

        <div style={{ position: "relative" }}>
          <PrimaryBtn disabled={!apelido.trim() || codigo.length < 4 || loading} accent={T.gold} onClick={handleEntrar}>
            {loading ? "Entrando…" : "Entrar na Sala"}
          </PrimaryBtn>
        </div>
      </motion.div>

      {/* Divider */}
      <div style={{ display: "flex", alignItems: "center", gap: 10, margin: "4px 8px" }}>
        <div style={{ flex: 1, height: 1, background: T.hairlineStrong }} />
        <span style={{ fontFamily: F.sans, fontSize: 11, fontWeight: 600, color: T.inkSoft, letterSpacing: "0.18em", textTransform: "uppercase" }}>ou</span>
        <div style={{ flex: 1, height: 1, background: T.hairlineStrong }} />
      </div>

      <div style={{ marginTop: 8 }}>
        <Link href="/criar" style={{ textDecoration: "none" }}>
          <OutlineBtn icon={<MEIcon name="plus" size={14} color={T.sienna} />}>
            Criar Nova Sala
          </OutlineBtn>
        </Link>
      </div>

      <div style={{ flex: 1 }} />
      <div style={{ marginTop: 20, textAlign: "center", fontFamily: F.bodySerif, fontStyle: "italic", fontSize: 13, color: T.inkSoft }}>
        Peça o código a quem te convidou.
      </div>
    </div>
  );
}

export default function EntrarPage() {
  return (
    <PageShell>
      <Suspense fallback={null}><EntrarForm /></Suspense>
    </PageShell>
  );
}
