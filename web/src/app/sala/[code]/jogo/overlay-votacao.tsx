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

function PulsingDots() {
  return (
    <div style={{ display: "flex", gap: 6, justifyContent: "center", alignItems: "center" }}>
      {[0, 1, 2].map((i) => (
        <motion.div
          key={i}
          animate={{ opacity: [0.25, 1, 0.25] }}
          transition={{ duration: 1.2, repeat: Infinity, delay: i * 0.22, ease: "easeInOut" }}
          style={{ width: 7, height: 7, borderRadius: "50%", background: T.inkSoft }}
        />
      ))}
    </div>
  );
}

export function OverlayVotacao({ acusadoNome, meuEliminado, meuId, acusadoId, acting, jaVotei, onVotar }: Props) {
  const contentKey = meuEliminado ? "eliminado" : meuId === acusadoId ? "acusado" : jaVotei ? "aguardando" : "botoes";

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
            role="dialog"
            aria-modal="true"
            aria-label="Votação"
            initial={{ y: "100%" }}
            animate={{ y: 0 }}
            exit={{ y: "100%" }}
            transition={SHEET_SPRING}
            style={{ background: T.card, borderRadius: "22px 22px 0 0", padding: "24px 20px", display: "flex", flexDirection: "column", gap: 16, maxWidth: "var(--app-max-width)", margin: "0 auto", width: "100%", position: "relative" }}
          >
            <InsetFrame color={T.sienna} inset={6} radius={22} opacity={0.3} opacity2={0.15} />
            <div style={{ width: 40, height: 4, background: T.hairlineStrong, borderRadius: 2, margin: "0 auto 4px" }} />
            <Eyebrow color={T.inkSoft}>Votação</Eyebrow>
            <div style={{ fontFamily: F.serif, fontSize: 24, fontWeight: 600, color: T.ink, lineHeight: 1.1 }}>{acusadoNome} é o espia?</div>

            <AnimatePresence mode="wait">
              {contentKey === "eliminado" && (
                <motion.div
                  key="eliminado"
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -8 }}
                  transition={{ duration: 0.2 }}
                  style={{ textAlign: "center", fontFamily: F.bodySerif, fontStyle: "italic", fontSize: 15, color: T.inkSoft, padding: "10px 0" }}
                >
                  Você foi eliminado — apenas observe.
                </motion.div>
              )}

              {contentKey === "acusado" && (
                <motion.div
                  key="acusado"
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -8 }}
                  transition={{ duration: 0.2 }}
                  style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 10, padding: "10px 0" }}
                >
                  <div style={{ fontFamily: F.bodySerif, fontStyle: "italic", fontSize: 15, color: T.inkSoft }}>Aguardando votação</div>
                  <PulsingDots />
                </motion.div>
              )}

              {contentKey === "aguardando" && (
                <motion.div
                  key="aguardando"
                  initial={{ opacity: 0, scale: 0.94 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.94 }}
                  transition={{ duration: 0.25, ease: "easeOut" }}
                  style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 10, padding: "10px 0" }}
                >
                  <div style={{ fontFamily: F.bodySerif, fontStyle: "italic", fontSize: 15, color: T.inkSoft, textAlign: "center" }}>Voto registrado — aguardando os outros jogadores</div>
                  <PulsingDots />
                </motion.div>
              )}

              {contentKey === "botoes" && (
                <motion.div
                  key="botoes"
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 12 }}
                  transition={{ duration: 0.22 }}
                  style={{ display: "flex", gap: 10 }}
                >
                  <motion.button
                    whileTap={{ scale: 0.95 }}
                    disabled={acting}
                    onClick={() => onVotar(true)}
                    style={{ flex: 1, background: T.ink, color: T.cardWarm, border: "none", borderRadius: 999, padding: "15px", fontFamily: F.sans, fontSize: 15, fontWeight: 700, cursor: "pointer" }}
                  >
                    👍 Sim
                  </motion.button>
                  <motion.button
                    whileTap={{ scale: 0.95 }}
                    disabled={acting}
                    onClick={() => onVotar(false)}
                    style={{ flex: 1, background: T.card, color: T.ink, border: `1.5px solid ${T.hairlineStrong}`, borderRadius: 999, padding: "15px", fontFamily: F.sans, fontSize: 15, fontWeight: 700, cursor: "pointer" }}
                  >
                    👎 Não
                  </motion.button>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
