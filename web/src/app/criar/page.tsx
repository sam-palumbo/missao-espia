"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Input } from "@/components/ui/Input";
import { gameActions } from "@/lib/game-actions";
import { toast } from "sonner";
import { ParchmentBg, InsetFrame, MEMedallion, MERule, Eyebrow, PrimaryBtn, T, F } from "@/components/ui/design";

const ROUNDS = [3, 5, 7, 10];

export default function CriarPage() {
  const router = useRouter();
  const [apelido, setApelido] = useState("");
  const [numRodadas, setNumRodadas] = useState(5);
  const [senha, setSenha] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleCriar() {
    if (!apelido.trim()) return;
    setLoading(true);
    try {
      const { sala } = await gameActions.criarSala(apelido.trim(), numRodadas, senha || undefined);
      router.push(`/sala/${sala.codigo}/lobby`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erro ao criar sala");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main style={{ position: "relative", minHeight: "100dvh", display: "flex", flexDirection: "column", padding: "62px 20px 48px", maxWidth: 390, margin: "0 auto", background: T.bg }}>
      <ParchmentBg />

      <div style={{ position: "relative", zIndex: 1, display: "flex", flexDirection: "column", flex: 1, gap: 0 }}>
        {/* TopBar */}
        <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 24 }}>
          <Link href="/" style={{ display: "flex", alignItems: "center", justifyContent: "center", width: 38, height: 38, borderRadius: 19, background: T.card, border: `1px solid ${T.hairline}` }}>
            <svg viewBox="0 0 24 24" width={20} height={20} fill="none" stroke={T.inkSoft} strokeWidth="1.6" strokeLinecap="round"><path d="M15 5 L8 12 L15 19" /></svg>
          </Link>
          <Eyebrow color={T.inkSoft}>Nova Partida</Eyebrow>
        </div>

        {/* Hero */}
        <div style={{ marginBottom: 24 }}>
          <Eyebrow color={T.sienna}>Configurar a sala</Eyebrow>
          <div style={{ fontFamily: F.display, fontSize: 36, fontWeight: 500, lineHeight: 1.1, color: T.ink, marginTop: 8 }}>
            Criar<br />
            <span style={{ color: T.sienna, fontWeight: 700 }}>Sala</span>
          </div>
        </div>

        {/* Form card */}
        <div style={{ background: T.card, borderRadius: 22, padding: "20px 18px", boxShadow: "0 10px 28px -14px rgba(58,42,20,0.28)", position: "relative", display: "flex", flexDirection: "column", gap: 20, marginBottom: 16 }}>
          <InsetFrame color={T.sienna} inset={6} radius={18} />

          <div style={{ position: "relative" }}>
            <Input id="apelido" label="Seu Apelido" placeholder="Ex: Davi, Ester..." value={apelido} onChange={e => setApelido(e.target.value)} maxLength={20} />
          </div>

          {/* Num rodadas */}
          <div style={{ position: "relative" }}>
            <Eyebrow color={T.inkSoft} size={10}>Número de Rodadas</Eyebrow>
            <div style={{ display: "flex", gap: 8, marginTop: 8 }}>
              {ROUNDS.map(n => {
                const sel = numRodadas === n;
                return (
                  <button key={n} onClick={() => setNumRodadas(n)} style={{ flex: 1, height: 52, borderRadius: 14, border: `1.5px solid ${sel ? T.sienna : T.hairlineStrong}`, background: sel ? T.siennaSoft : T.cardWarm, color: sel ? T.sienna : T.inkSoft, fontFamily: F.serif, fontSize: 22, fontWeight: 600, cursor: "pointer", transition: "all 160ms" }}>
                    {n}
                  </button>
                );
              })}
            </div>
          </div>

          <div style={{ position: "relative" }}>
            <Input id="senha" label="Senha (opcional)" placeholder="Sala pública se vazia" value={senha} onChange={e => setSenha(e.target.value)} maxLength={20} type="password" />
          </div>
        </div>

        {/* Medallion ornament */}
        <div style={{ display: "flex", justifyContent: "center", marginBottom: 16, opacity: 0.5 }}>
          <MERule color={T.sienna} />
        </div>

        <div style={{ flex: 1 }} />

        <PrimaryBtn disabled={!apelido.trim() || loading} accent={T.gold} onClick={handleCriar}>
          {loading ? "Criando…" : "Criar Sala"}
        </PrimaryBtn>
      </div>
    </main>
  );
}
