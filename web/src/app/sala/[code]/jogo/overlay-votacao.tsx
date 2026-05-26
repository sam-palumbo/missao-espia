"use client";
import { motion, AnimatePresence } from "motion/react";
import { InsetFrame, Eyebrow, T, F } from "@/components/ui/design";
import { SHEET_SPRING } from "./bottom-sheet";

interface Props {
  acusadoNome: string | null;
  meuEliminado: boolean;
  meuId: string | undefined;
  acusadoId: string | undefined;
  acting: boolean;
  jaVotei: boolean;
  onVotar: (aprovado: boolean) => void;
}

export function OverlayVotacao({ acusadoNome, meuEliminado, meuId, acusadoId, acting, jaVotei, onVotar }: Props) {
  return (
    <AnimatePresence>
      {acusadoNome && (
        <motion.div
          key="voting"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          style={{ position: "fixed", inset: 0, zIndex: 50, display: "flex", flexDirection: "column", justifyContent: "flex-end", background: "rgba(26,18,8,0.72)", backdropFilter: "blur(4px)" }}
        >
          <motion.div
            initial={{ y: "100%" }}
            animate={{ y: 0 }}
            exit={{ y: "100%" }}
            transition={SHEET_SPRING}
            style={{ background: T.card, borderRadius: "22px 22px 0 0", padding: "24px 20px", display: "flex", flexDirection: "column", gap: 16, maxWidth: 390, margin: "0 auto", width: "100%", position: "relative" }}
          >
            <InsetFrame color={T.sienna} inset={6} radius={22} opacity={0.3} opacity2={0.15} />
            <div style={{ width: 40, height: 4, background: T.hairlineStrong, borderRadius: 2, margin: "0 auto 4px" }} />
            <Eyebrow color={T.inkSoft}>Votação</Eyebrow>
            <div style={{ fontFamily: F.serif, fontSize: 24, fontWeight: 600, color: T.ink, lineHeight: 1.1 }}>{acusadoNome} é o espia?</div>
            {meuEliminado ? (
              <div style={{ textAlign: "center", fontFamily: F.bodySerif, fontStyle: "italic", fontSize: 15, color: T.inkSoft, padding: "10px 0" }}>Você foi eliminado — apenas observe.</div>
            ) : meuId === acusadoId ? (
              <div style={{ textAlign: "center", fontFamily: F.bodySerif, fontStyle: "italic", fontSize: 15, color: T.inkSoft, padding: "10px 0" }}>Aguardando votação…</div>
            ) : jaVotei ? (
              <div style={{ textAlign: "center", fontFamily: F.bodySerif, fontStyle: "italic", fontSize: 15, color: T.inkSoft, padding: "10px 0" }}>Voto registrado — aguardando os outros jogadores…</div>
            ) : (
              <div style={{ display: "flex", gap: 10 }}>
                <button disabled={acting} onClick={() => onVotar(true)} style={{ flex: 1, background: T.ink, color: T.cardWarm, border: "none", borderRadius: 999, padding: "15px", fontFamily: F.sans, fontSize: 15, fontWeight: 700, cursor: "pointer" }}>
                  👍 Sim
                </button>
                <button disabled={acting} onClick={() => onVotar(false)} style={{ flex: 1, background: T.card, color: T.ink, border: `1.5px solid ${T.hairlineStrong}`, borderRadius: 999, padding: "15px", fontFamily: F.sans, fontSize: 15, fontWeight: 700, cursor: "pointer" }}>
                  👎 Não
                </button>
              </div>
            )}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
