"use client";
import { InsetFrame, T, F } from "@/components/ui/design";
import type { Player } from "@/lib/types";

interface Props {
  players: Player[];
  turnoAtual: string | undefined;
}

export function PlayersGrid({ players, turnoAtual }: Props) {
  return (
    <div style={{ position: "relative", zIndex: 1, background: T.card, borderRadius: 18, padding: 12, boxShadow: "0 4px 16px -12px rgba(58,42,20,0.22)" }}>
      <InsetFrame color={T.sienna} inset={5} radius={14} opacity={0.22} opacity2={0.1} />
      <div style={{ position: "relative", display: "flex", gap: 8, overflowX: "auto", paddingBottom: 4 }}>
        {players.map(p => {
          const isActive = p.id === turnoAtual;
          const isEliminated = !p.ativo;
          return (
            <div key={p.id} style={{ flexShrink: 0, display: "flex", flexDirection: "column", alignItems: "center", gap: 6, padding: "4px 2px", opacity: isEliminated ? 0.4 : 1 }}>
              <div style={{ width: 44, height: 44, borderRadius: "50%", border: `2px solid ${isActive ? T.gold : T.hairlineStrong}`, background: isEliminated ? T.hairline : isActive ? T.goldSoft : T.cardWarm, display: "flex", alignItems: "center", justifyContent: "center", transition: "all 0.2s" }}>
                <span style={{ fontFamily: F.serif, fontSize: 14, fontWeight: 600, color: isActive ? T.sienna : T.inkSoft, textDecoration: isEliminated ? "line-through" : "none" }}>{p.apelido.slice(0, 2).toUpperCase()}</span>
              </div>
              <span style={{ fontFamily: F.sans, fontSize: 10, color: isActive ? T.ink : T.muted, fontWeight: isActive ? 700 : 400, textDecoration: isEliminated ? "line-through" : "none" }}>{p.apelido.split(" ")[0]}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
