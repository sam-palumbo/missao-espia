"use client";
import { useState, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import Link from "next/link";
import { Input } from "@/components/ui/Input";
import { gameActions } from "@/lib/game-actions";
import { toast } from "sonner";
import { ParchmentBg, InsetFrame, Eyebrow, PrimaryBtn, OutlineBtn, MEIcon, T, F } from "@/components/ui/design";

function EntrarForm() {
  const params = useSearchParams();
  const router = useRouter();
  const [codigo] = useState((params.get("code") ?? "").toUpperCase());
  const [apelido, setApelido] = useState("");
  const [senha, setSenha] = useState("");
  const [precisaSenha, setPrecisaSenha] = useState(false);
  const [loading, setLoading] = useState(false);

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
      <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 24 }}>
        <Link href="/" style={{ display: "flex", alignItems: "center", justifyContent: "center", width: 38, height: 38, borderRadius: 19, background: T.card, border: `1px solid ${T.hairline}` }}>
          <svg viewBox="0 0 24 24" width={20} height={20} fill="none" stroke={T.inkSoft} strokeWidth="1.6" strokeLinecap="round"><path d="M15 5 L8 12 L15 19" /></svg>
        </Link>
        <Eyebrow color={T.inkSoft}>Entrar em uma partida</Eyebrow>
      </div>

      {/* Hero */}
      <div style={{ marginBottom: 24 }}>
        <Eyebrow color={T.sienna}>Convite recebido?</Eyebrow>
        <div style={{ fontFamily: F.display, fontSize: 36, fontWeight: 500, lineHeight: 1.1, color: T.ink, marginTop: 8 }}>
          Digite o código<br />
          da <span style={{ color: T.sienna, fontWeight: 700 }}>sala</span>.
        </div>
      </div>

      {/* Code + form card */}
      <div style={{ background: T.card, borderRadius: 22, padding: "20px 18px", boxShadow: "0 10px 28px -14px rgba(58,42,20,0.28)", position: "relative", display: "flex", flexDirection: "column", gap: 16, marginBottom: 12 }}>
        <InsetFrame color={T.sienna} inset={6} radius={18} />

        {/* 4-char boxes */}
        <div style={{ position: "relative" }}>
          <Eyebrow color={T.inkSoft} size={10}>Código</Eyebrow>
          <div style={{ marginTop: 8, display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 8 }}>
            {[0,1,2,3].map(i => (
              <div key={i} style={{ aspectRatio: "1/1.15", background: T.cardWarm, border: `1px solid ${codigo[i] ? T.sienna : T.hairlineStrong}`, borderRadius: 10, display: "flex", alignItems: "center", justifyContent: "center", fontFamily: F.serif, fontSize: 28, fontWeight: 600, color: T.ink }}>
                {codigo[i] ?? ""}
              </div>
            ))}
          </div>
          {!codigo && (
            <div style={{ marginTop: 6, fontFamily: F.sans, fontSize: 12, color: T.muted, fontStyle: "italic" }}>
              Insira o código de 4 letras da sala
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
      </div>

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
    <main style={{ position: "relative", minHeight: "100dvh", display: "flex", flexDirection: "column", padding: "62px 20px 48px", maxWidth: 390, margin: "0 auto", background: T.bg }}>
      <ParchmentBg />
      <Suspense fallback={null}><EntrarForm /></Suspense>
    </main>
  );
}
