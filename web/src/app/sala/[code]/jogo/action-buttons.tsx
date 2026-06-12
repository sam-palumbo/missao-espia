"use client";
import { motion, AnimatePresence } from "motion/react";
import { MEIcon, T, F } from "@/components/ui/design";

interface Props {
  isSpy: boolean;
  ehMeuTurno: boolean;
  meuEliminado: boolean;
  fase: string;
  turnoPalavras: boolean;
  primeiroTurno: boolean;
  acusouNesteTurno: boolean;
  modo: "online" | "presencial";
  acting: boolean;
  onMinhaCarta: () => void;
  onAdivinhar: () => void;
  onClickTurnoAction: () => void;
  onAcusar: () => void;
  onProximoTurno: () => void;
}

const tap = { whileTap: { scale: 0.94 } };
const hover = { whileHover: { scale: 1.02 } };

const turnoBtnVariants = {
  hidden: { opacity: 0, y: 14, scale: 0.97 },
  show: {
    opacity: 1, y: 0, scale: 1,
    transition: { type: "spring" as const, stiffness: 360, damping: 28 },
  },
  exit: { opacity: 0, y: 8, scale: 0.97, transition: { duration: 0.15 } },
};

export function ActionButtons({ isSpy, ehMeuTurno, meuEliminado, fase, turnoPalavras, primeiroTurno, acusouNesteTurno, modo, acting, onMinhaCarta, onAdivinhar, onClickTurnoAction, onAcusar, onProximoTurno }: Props) {
  const showTurnoActions = ehMeuTurno && !meuEliminado && (fase === "jogando" || fase === "turno_palavras");
  // Regra: o espia pode adivinhar a qualquer momento da rodada (não só no turno dele).
  // Na fase adivinhacao o espia pego está fora de ordem_turnos (meuEliminado),
  // mas é exatamente ele quem precisa adivinhar.
  const showAdivinhar = isSpy && (
    fase === "adivinhacao" ||
    (!meuEliminado && ["jogando", "aguardando_resposta", "turno_palavras"].includes(fase))
  );

  return (
    <div style={{ position: "relative", zIndex: 1, display: "flex", flexDirection: "column", gap: 10 }}>
      <div style={{ display: "flex", gap: 10 }}>
        <motion.button {...tap} {...hover} onClick={onMinhaCarta} style={{ flex: 1, background: T.card, color: T.inkSoft, border: `1.5px solid ${T.hairlineStrong}`, borderRadius: 999, padding: "13px 16px", fontFamily: F.sans, fontSize: 12, fontWeight: 700, letterSpacing: "0.06em", textTransform: "uppercase", cursor: "pointer", whiteSpace: "nowrap" }}>
          Minha Carta
        </motion.button>
        <AnimatePresence>
          {showAdivinhar && (
            <motion.button
              key="adiv-secondary"
              initial={{ opacity: 0, scale: 0.92 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.92 }}
              transition={{ type: "spring", stiffness: 380, damping: 26 }}
              {...tap} {...hover}
              onClick={onAdivinhar}
              style={{ flex: 1, background: T.card, color: T.ink, border: `1.5px solid ${T.sienna}`, borderRadius: 999, padding: "13px 16px", fontFamily: F.sans, fontSize: 12, fontWeight: 700, letterSpacing: "0.06em", textTransform: "uppercase", cursor: "pointer" }}
            >
              Adivinhar
            </motion.button>
          )}
        </AnimatePresence>
      </div>

      <AnimatePresence>
        {showTurnoActions && (
          <motion.div
            key="turno-actions"
            variants={turnoBtnVariants}
            initial="hidden"
            animate="show"
            exit="exit"
            style={{ display: "flex", flexWrap: "wrap", gap: 10 }}
          >
            <motion.button
              {...tap} {...hover}
              disabled={acting}
              onClick={onClickTurnoAction}
              style={{ flex: 1, minWidth: 160, background: turnoPalavras ? T.gold : T.sienna, color: turnoPalavras ? T.ink : "white", border: "none", borderRadius: 999, padding: "13px 16px", fontFamily: F.sans, fontSize: 12, fontWeight: 700, letterSpacing: "0.06em", textTransform: "uppercase", cursor: "pointer" }}
            >
              {turnoPalavras ? "Diga uma palavra" : "Fazer Pergunta"}
            </motion.button>
            {!primeiroTurno && !acusouNesteTurno && (
              <motion.button
                {...tap} {...hover}
                disabled={acting}
                onClick={onAcusar}
                style={{ flex: 1, minWidth: 130, background: T.brick, color: "white", border: "none", borderRadius: 999, padding: "13px 16px", fontFamily: F.sans, fontSize: 12, fontWeight: 700, letterSpacing: "0.06em", textTransform: "uppercase", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 8 }}
              >
                <MEIcon name="spy" size={15} color="white" />
                Acusar
              </motion.button>
            )}
            {modo === "presencial" && (
              <motion.button
                {...tap} {...hover}
                disabled={acting}
                onClick={onProximoTurno}
                style={{ flex: 1, minWidth: 130, background: T.ink, color: T.cardWarm, border: "none", borderRadius: 999, padding: "13px 16px", fontFamily: F.sans, fontSize: 12, fontWeight: 700, letterSpacing: "0.06em", textTransform: "uppercase", cursor: "pointer" }}
              >
                Concluí turno
              </motion.button>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
