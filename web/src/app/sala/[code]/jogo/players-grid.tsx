"use client";
import { memo } from "react";
import { motion } from "motion/react";
import { InsetFrame, T, F } from "@/components/ui/design";
import type { Player } from "@/lib/types";

interface Props {
  players: Player[];
  turnoAtual: string | undefined;
}

function PlayersGridBase({ players, turnoAtual }: Props) {
  return (
    <div style={{ position: "relative", zIndex: 1, background: T.card, borderRadius: 18, padding: 12, boxShadow: "0 4px 16px -12px rgba(58,42,20,0.22)" }}>
      <InsetFrame color={T.sienna} inset={5} radius={14} opacity={0.22} opacity2={0.1} />
      <div style={{ position: "relative", display: "flex", gap: 8, overflowX: "auto", paddingBottom: 4 }}>
        {players.map((p, i) => {
          const isActive = p.id === turnoAtual;
          const isEliminated = !p.ativo;
          return (
            <motion.div
              key={p.id}
              initial={{ opacity: 0, scale: 0.75 }}
              animate={{ opacity: isEliminated ? 0.4 : 1, scale: 1 }}
              transition={{ type: "spring", stiffness: 420, damping: 28, delay: i * 0.04 }}
              style={{ flexShrink: 0, display: "flex", flexDirection: "column", alignItems: "center", gap: 6, padding: "4px 2px", opacity: isEliminated ? 0.4 : 1 }}
            >
              <div style={{ position: "relative", width: 52, height: 52, display: "flex", alignItems: "center", justifyContent: "center" }}>
                {isActive && (
                  <motion.div
                    layoutId="active-player-ring"
                    style={{
                      position: "absolute", inset: 0, borderRadius: "50%",
                      border: `2.5px solid ${T.gold}`,
                      background: T.goldSoft,
                    }}
                    transition={{ type: "spring", stiffness: 320, damping: 28 }}
                  />
                )}
                <div style={{
                  width: 44, height: 44, borderRadius: "50%",
                  border: `1.5px solid ${isActive ? "transparent" : T.hairlineStrong}`,
                  background: isEliminated ? T.hairline : T.cardWarm,
                  display: "flex", alignItems: "center", justifyContent: "center",
                  position: "relative", zIndex: 1,
                }}>
                  <span style={{
                    fontFamily: F.serif, fontSize: 14, fontWeight: 600,
                    color: isActive ? T.sienna : T.inkSoft,
                    textDecoration: isEliminated ? "line-through" : "none",
                  }}>
                    {p.apelido.slice(0, 2).toUpperCase()}
                  </span>
                </div>
              </div>
              <span style={{
                fontFamily: F.sans, fontSize: 10,
                color: isActive ? T.ink : T.muted,
                fontWeight: isActive ? 700 : 400,
                textDecoration: isEliminated ? "line-through" : "none",
                transition: "color 0.3s",
              }}>
                {p.apelido.split(" ")[0]}
              </span>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}

// Memo: props (players, turnoAtual) ficam estáveis entre os ticks do timer.
export const PlayersGrid = memo(PlayersGridBase);
