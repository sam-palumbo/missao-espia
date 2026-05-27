"use client";
import { motion } from "motion/react";
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

export function ActionButtons({ isSpy, ehMeuTurno, meuEliminado, fase, turnoPalavras, primeiroTurno, acusouNesteTurno, modo, acting, onMinhaCarta, onAdivinhar, onClickTurnoAction, onAcusar, onProximoTurno }: Props) {
  return (
    <div style={{ position: "relative", zIndex: 1, display: "flex", flexDirection: "column", gap: 10 }}>
      <div style={{ display: "flex", gap: 10 }}>
        <motion.button {...tap} onClick={onMinhaCarta} style={{ flex: 1, background: T.card, color: T.inkSoft, border: `1.5px solid ${T.hairlineStrong}`, borderRadius: 999, padding: "13px 16px", fontFamily: F.sans, fontSize: 12, fontWeight: 700, letterSpacing: "0.06em", textTransform: "uppercase", cursor: "pointer", whiteSpace: "nowrap" }}>
          Minha Carta
        </motion.button>
        {isSpy && fase === "adivinhacao" && (
          <motion.button {...tap} onClick={onAdivinhar} style={{ flex: 1, background: T.card, color: T.ink, border: `1.5px solid ${T.sienna}`, borderRadius: 999, padding: "13px 16px", fontFamily: F.sans, fontSize: 12, fontWeight: 700, letterSpacing: "0.06em", textTransform: "uppercase", cursor: "pointer" }}>
            Adivinhar
          </motion.button>
        )}
      </div>
      {ehMeuTurno && !meuEliminado && (fase === "jogando" || fase === "turno_palavras") && (
        <div style={{ display: "flex", flexWrap: "wrap", gap: 10 }}>
          <motion.button
            {...tap}
            disabled={acting}
            onClick={onClickTurnoAction}
            style={{ flex: 1, minWidth: 160, background: turnoPalavras ? T.gold : T.sienna, color: turnoPalavras ? T.ink : "white", border: "none", borderRadius: 999, padding: "13px 16px", fontFamily: F.sans, fontSize: 12, fontWeight: 700, letterSpacing: "0.06em", textTransform: "uppercase", cursor: "pointer" }}
          >
            {turnoPalavras ? "Diga uma palavra" : "Fazer Pergunta"}
          </motion.button>
          {!primeiroTurno && !acusouNesteTurno && (
            <motion.button
              {...tap}
              disabled={acting}
              onClick={onAcusar}
              style={{ flex: 1, minWidth: 130, background: T.brick, color: "white", border: "none", borderRadius: 999, padding: "13px 16px", fontFamily: F.sans, fontSize: 12, fontWeight: 700, letterSpacing: "0.06em", textTransform: "uppercase", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 8 }}
            >
              <MEIcon name="spy" size={15} color="white" />
              Acusar
            </motion.button>
          )}
          {isSpy && !turnoPalavras && (
            <motion.button
              {...tap}
              disabled={acting}
              onClick={onAdivinhar}
              style={{ flex: 1, minWidth: 130, background: T.card, color: T.ink, border: `1.5px solid ${T.sienna}`, borderRadius: 999, padding: "13px 16px", fontFamily: F.sans, fontSize: 12, fontWeight: 700, letterSpacing: "0.06em", textTransform: "uppercase", cursor: "pointer" }}
            >
              Adivinhar
            </motion.button>
          )}
          {modo === "presencial" && (
            <motion.button
              {...tap}
              disabled={acting}
              onClick={onProximoTurno}
              style={{ flex: 1, minWidth: 130, background: T.ink, color: T.cardWarm, border: "none", borderRadius: 999, padding: "13px 16px", fontFamily: F.sans, fontSize: 12, fontWeight: 700, letterSpacing: "0.06em", textTransform: "uppercase", cursor: "pointer" }}
            >
              Concluí turno
            </motion.button>
          )}
        </div>
      )}
    </div>
  );
}
