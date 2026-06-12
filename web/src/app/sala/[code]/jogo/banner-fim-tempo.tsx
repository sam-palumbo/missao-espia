"use client";
import { InsetFrame, T, F } from "@/components/ui/design";

interface Props {
  adivTimerDisplay: string;
  title?: string;
  subtitle?: string;
}

export function BannerFimTempo({
  adivTimerDisplay,
  title = "O tempo esgotou!",
  subtitle = "Os espias estão adivinhando o local…",
}: Props) {
  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 50, display: "flex", flexDirection: "column", justifyContent: "flex-end", background: "rgba(26,18,8,0.72)", backdropFilter: "blur(4px)" }}>
      <div style={{ background: T.card, borderRadius: "22px 22px 0 0", padding: "32px 20px", display: "flex", flexDirection: "column", gap: 12, alignItems: "center", maxWidth: "var(--app-max-width)", margin: "0 auto", width: "100%", position: "relative" }}>
        <InsetFrame color={T.sienna} inset={6} radius={22} opacity={0.3} opacity2={0.15} />
        <div style={{ position: "relative", textAlign: "center" }}>
          <div style={{ fontFamily: F.serif, fontSize: 26, fontWeight: 600, color: T.ink, lineHeight: 1.1 }}>{title}</div>
          <div style={{ fontFamily: F.bodySerif, fontSize: 15, color: T.inkSoft, marginTop: 8 }}>{subtitle}</div>
          <div style={{ fontFamily: F.mono, fontSize: 32, fontWeight: 700, color: T.sienna, marginTop: 16, fontVariantNumeric: "tabular-nums" }}>
            {adivTimerDisplay}
          </div>
        </div>
      </div>
    </div>
  );
}
