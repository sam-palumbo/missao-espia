"use client";
import { use, useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { usePlayers } from "@/hooks/usePlayers";
import { createClient } from "@/lib/supabase";
import { ParchmentBg, InsetFrame, MEMedallion, MEAvatar, MERule, Eyebrow, PrimaryBtn, OutlineBtn, T, F } from "@/components/ui/design";

export default function PlacarPage({ params }: { params: Promise<{ code: string }> }) {
  const { code } = use(params);
  const router = useRouter();
  const [salaId, setSalaId] = useState<string | null>(null);
  const players = usePlayers(salaId);

  useEffect(() => {
    const supabase = createClient();
    supabase.from("salas").select("id").eq("codigo", code).single()
      .then(({ data }) => { if (data) setSalaId(data.id); });
  }, [code]);

  const sorted = [...players].sort((a, b) => b.pontuacao - a.pontuacao);
  const max = sorted[0]?.pontuacao ?? 1;

  return (
    <main className="page-root" style={{ position: "relative", minHeight: "100dvh", display: "flex", flexDirection: "column", padding: "62px clamp(20px, 5vw, 56px) 48px", background: T.bg, gap: 20, width: "100%", maxWidth: 860, margin: "0 auto" }}>
      <ParchmentBg />

      {/* Header */}
      <div style={{ position: "relative", zIndex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 12 }}>
        <Eyebrow color={T.inkSoft}>Partida Encerrada</Eyebrow>
        <MEMedallion size={90} inset="star" variant="gold" />
        <div style={{ fontFamily: F.display, fontSize: 42, fontWeight: 500, lineHeight: 0.95, letterSpacing: "-0.01em", color: T.ink, textAlign: "center" }}>
          Placar<br /><span style={{ color: T.sienna, fontWeight: 700 }}>Final</span>
        </div>
        <div style={{ width: "60%" }}><MERule color={T.sienna} /></div>
      </div>

      {/* Ranking */}
      <div style={{ position: "relative", zIndex: 1, background: T.card, borderRadius: 22, padding: "14px", boxShadow: "0 10px 28px -14px rgba(58,42,20,0.28)" }}>
        <InsetFrame color={T.sienna} inset={6} radius={18} opacity={0.25} opacity2={0.12} />
        <div style={{ position: "relative" }}>
          <div style={{ padding: "0 6px 10px", borderBottom: `1px solid ${T.hairline}`, marginBottom: 6 }}>
            <Eyebrow color={T.inkSoft} size={10}>Classificação</Eyebrow>
          </div>
          {sorted.map((p, i) => {
            const isFirst = i === 0 && p.pontuacao > 0;
            const pct = max > 0 ? (p.pontuacao / max) * 100 : 0;
            return (
              <div key={p.id} style={{ display: "flex", alignItems: "center", gap: 12, padding: "10px 6px", borderBottom: i < sorted.length - 1 ? `1px solid ${T.hairline}` : "none" }}>
                <span style={{ fontFamily: F.mono, fontSize: 13, fontWeight: 700, width: 20, textAlign: "center", color: isFirst ? T.gold : T.muted }}>
                  {isFirst ? "✦" : `${i+1}`}
                </span>
                <MEAvatar size={40} initial={p.apelido.slice(0,1)} variant={isFirst ? "gold" : "light"} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontFamily: F.sans, fontSize: 14, fontWeight: 600, color: T.ink }}>{p.apelido}</div>
                  <div style={{ height: 4, background: T.hairline, borderRadius: 2, marginTop: 4, overflow: "hidden" }}>
                    <div style={{ height: "100%", borderRadius: 2, width: `${pct}%`, background: isFirst ? T.gold : T.sienna, transition: "width 0.8s cubic-bezier(0.34,1.56,0.64,1)" }} />
                  </div>
                </div>
                <span style={{ fontFamily: F.serif, fontSize: 22, fontWeight: 600, color: T.ink, minWidth: 28, textAlign: "right", fontVariantNumeric: "tabular-nums" }}>{p.pontuacao}</span>
              </div>
            );
          })}
        </div>
      </div>

      <div style={{ flex: 1 }} />

      <div style={{ position: "relative", zIndex: 1, display: "flex", flexDirection: "column", gap: 10 }}>
        <PrimaryBtn accent={T.gold} onClick={() => router.push("/")}>Nova Partida</PrimaryBtn>
        <OutlineBtn onClick={() => router.push("/")}>Encerrar</OutlineBtn>
      </div>
    </main>
  );
}
