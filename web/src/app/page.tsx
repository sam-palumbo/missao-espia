"use client";
import Link from "next/link";
import { useState } from "react";
import { ParchmentBg, InsetFrame, MEMedallion, MERule, MEIcon, Eyebrow, PrimaryBtn, OutlineBtn, T, F } from "@/components/ui/design";

export default function HomePage() {
  const [mode, setMode] = useState<"home" | "entrar">("home");
  const [code, setCode] = useState("");

  return (
    <main className="page-root" style={{ position: "relative", minHeight: "100dvh", display: "flex", flexDirection: "column", padding: "62px clamp(20px, 5vw, 56px) 48px", background: T.bg, width: "100%", maxWidth: 860, margin: "0 auto" }}>
      <ParchmentBg />

      {/* Hebrew watermark */}
      <div style={{ position: "absolute", top: 60, left: "50%", transform: "translateX(-50%)", fontFamily: F.display, fontSize: 280, lineHeight: 1, color: T.sienna, opacity: 0.06, pointerEvents: "none", userSelect: "none", zIndex: 0 }}>שׁ</div>

      {/* Decorative medallion */}
      <div style={{ position: "absolute", top: 24, right: 18, opacity: 0.3, zIndex: 1 }}>
        <MEMedallion size={48} inset="star" variant="light" />
      </div>

      {/* Brand block */}
      <div style={{ position: "relative", zIndex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 14, marginTop: 32, flex: 1 }}>
        <Eyebrow color={T.sienna}>Um jogo de dedução</Eyebrow>
        <div style={{ fontFamily: F.display, fontSize: 52, fontWeight: 500, lineHeight: 0.95, letterSpacing: "-0.01em", color: T.ink, textAlign: "center" }}>
          Missão<br />
          <span style={{ color: T.sienna, fontWeight: 700 }}>Espia</span>
        </div>
        <div style={{ width: "60%" }}><MERule color={T.sienna} /></div>
        <div style={{ fontFamily: F.bodySerif, fontStyle: "italic", fontSize: 15, lineHeight: 1.4, color: T.inkSoft, textAlign: "center", maxWidth: 260 }}>
          Reúna seus amigos.<br />Descubra quem é o espia.
        </div>
      </div>

      {/* Actions */}
      <div style={{ position: "relative", zIndex: 1, marginTop: 32 }}>
        {mode === "home" ? (
          <div style={{ background: T.card, borderRadius: 22, padding: "20px 18px", boxShadow: "0 10px 28px -14px rgba(58,42,20,0.28)", position: "relative", display: "flex", flexDirection: "column", gap: 12 }}>
            <InsetFrame color={T.sienna} inset={6} radius={18} />
            <div style={{ position: "relative" }}>
              <Link href="/criar" style={{ textDecoration: "none" }}>
                <PrimaryBtn accent={T.gold}>Criar Sala</PrimaryBtn>
              </Link>
            </div>
            <div style={{ position: "relative" }}>
              <OutlineBtn onClick={() => setMode("entrar")} icon={<MEIcon name="users" size={14} color={T.sienna} />}>
                Entrar em Sala
              </OutlineBtn>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 10, margin: "4px 0" }}>
              <div style={{ flex: 1, height: 1, background: T.hairlineStrong }} />
              <span style={{ fontFamily: F.sans, fontSize: 11, fontWeight: 600, color: T.inkSoft, letterSpacing: "0.18em", textTransform: "uppercase" }}>ou</span>
              <div style={{ flex: 1, height: 1, background: T.hairlineStrong }} />
            </div>
            <button style={{ background: "none", border: "none", fontFamily: F.sans, fontSize: 13, fontWeight: 600, color: T.sienna, cursor: "pointer", letterSpacing: "0.06em" }}>
              Entrar com Google
            </button>
          </div>
        ) : (
          <div style={{ background: T.card, borderRadius: 22, padding: "20px 18px", boxShadow: "0 10px 28px -14px rgba(58,42,20,0.28)", position: "relative", display: "flex", flexDirection: "column", gap: 14 }}>
            <InsetFrame color={T.sienna} inset={6} radius={18} />
            <div style={{ position: "relative" }}>
              <Eyebrow color={T.inkSoft} size={10}>Código da Sala</Eyebrow>
              <div style={{ marginTop: 10, display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 8 }}>
                {[0,1,2,3].map(i => (
                  <div key={i} style={{ aspectRatio: "1/1.15", background: T.cardWarm, border: `1px solid ${code[i] ? T.sienna : T.hairlineStrong}`, borderRadius: 10, display: "flex", alignItems: "center", justifyContent: "center", fontFamily: F.serif, fontSize: 28, fontWeight: 600, color: T.ink }}>
                    {code[i] ?? ""}
                  </div>
                ))}
              </div>
              <input
                type="text"
                inputMode="text"
                autoCapitalize="characters"
                maxLength={4}
                placeholder="ABCD"
                value={code}
                onChange={e => setCode(e.target.value.toUpperCase().replace(/[^A-Z]/g, ""))}
                style={{ position: "absolute", inset: 0, opacity: 0, cursor: "text" }}
                autoFocus
              />
            </div>
            <Link href={code.length === 4 ? `/entrar?code=${code}` : "#"} style={{ textDecoration: "none" }}>
              <PrimaryBtn disabled={code.length < 4} accent={T.gold}>Entrar →</PrimaryBtn>
            </Link>
            <button onClick={() => { setMode("home"); setCode(""); }} style={{ background: "none", border: "none", fontFamily: F.sans, fontSize: 13, color: T.inkSoft, cursor: "pointer", padding: "4px 0" }}>
              ← Voltar
            </button>
          </div>
        )}
      </div>
    </main>
  );
}
