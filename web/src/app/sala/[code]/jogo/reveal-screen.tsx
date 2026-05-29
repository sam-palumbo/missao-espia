"use client";
import { motion } from "motion/react";
import { ParchmentBg, InsetFrame, MEMedallion, MEIcon, MERule, Eyebrow, PrimaryBtn, T, F } from "@/components/ui/design";

interface Props {
  isSpy: boolean;
  evento: { evento: string; local: string; testament: string } | undefined;
  onReveal: () => void;
}

export function RevealScreen({ isSpy, evento, onReveal }: Props) {
  return (
    <main className="page-root" style={{ position: "relative", minHeight: "100dvh", display: "flex", flexDirection: "column", padding: "62px clamp(20px, 5vw, 56px) 48px", background: T.bg }}>
      <ParchmentBg />
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.38, ease: "easeOut" }}
        style={{ position: "relative", zIndex: 1, display: "flex", flexDirection: "column", flex: 1, gap: 16 }}
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.15, type: "spring", stiffness: 400, damping: 24 }}
          style={{ alignSelf: "center", background: T.goldSoft, color: T.ink, padding: "5px 14px", borderRadius: 999 }}
        >
          <Eyebrow color={T.ink} size={9}>Só você pode ver</Eyebrow>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20, scale: 0.97 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ delay: 0.1, type: "spring", stiffness: 280, damping: 28 }}
          style={{ background: `radial-gradient(140% 90% at 50% 0%, ${T.cardWarm} 0%, ${T.card} 80%)`, borderRadius: 22, padding: "22px 18px 20px", boxShadow: "0 16px 36px -16px rgba(58,42,20,0.4)", position: "relative", overflow: "hidden" }}
        >
          <InsetFrame color={T.sienna} inset={6} radius={18} />
          <div style={{ position: "relative", display: "flex", flexDirection: "column", alignItems: "center", gap: 10 }}>
            {isSpy ? (
              <>
                <Eyebrow color={T.sienna} size={11}>Carta do Espia</Eyebrow>
                <div style={{ margin: "4px 0" }}><MEMedallion size={110} inset="eye" variant="light" /></div>
                <div style={{ fontFamily: F.serif, fontSize: 40, fontWeight: 600, color: T.ink, lineHeight: 1, letterSpacing: "0.02em", fontStyle: "italic" }}>Espia</div>
                <div style={{ width: "55%" }}><MERule color={T.sienna} /></div>
                <div style={{ fontFamily: F.bodySerif, fontSize: 16, color: T.ink, textAlign: "center", lineHeight: 1.45, maxWidth: 270, paddingBottom: 6, fontWeight: 500 }}>
                  Você não conhece o local desta rodada. Descubra-o por perguntas — sem se entregar.
                </div>
              </>
            ) : (
              <>
                <Eyebrow color={T.sienna} size={11}>{evento?.testament === "AT" ? "Antigo Testamento" : "Novo Testamento"}</Eyebrow>
                <div style={{ margin: "4px 0" }}><MEMedallion size={110} inset="scroll" variant="light" /></div>
                <Eyebrow color={T.inkSoft} size={10}>Evento</Eyebrow>
                <div style={{ fontFamily: F.serif, fontSize: 28, fontWeight: 600, lineHeight: 1.05, color: T.ink, textAlign: "center", padding: "0 10px" }}>
                  {evento?.evento ?? "—"}
                </div>
                <div style={{ width: "55%" }}><MERule color={T.sienna} /></div>
                <Eyebrow color={T.inkSoft} size={10}>Local</Eyebrow>
                <div style={{ fontFamily: F.bodySerif, fontSize: 20, fontWeight: 500, color: T.ink, textAlign: "center", lineHeight: 1.2, paddingBottom: 6 }}>
                  {evento?.local ?? "—"}
                </div>
              </>
            )}
          </div>
        </motion.div>

        <div style={{ padding: "12px 14px", background: T.card, borderRadius: 16, display: "flex", alignItems: "center", gap: 12, boxShadow: "0 4px 14px -10px rgba(58,42,20,0.2)", position: "relative" }}>
          <InsetFrame color={T.sienna} inset={5} radius={12} opacity={0.22} opacity2={0.1} />
          <div style={{ position: "relative", width: 36, height: 36, borderRadius: "50%", background: isSpy ? T.goldSoft : T.brickSoft, display: "flex", alignItems: "center", justifyContent: "center" }}>
            <MEIcon name={isSpy ? "trophy" : "spy"} size={18} color={isSpy ? T.sienna : T.brick} />
          </div>
          <div style={{ flex: 1, position: "relative" }}>
            <div style={{ fontFamily: F.serif, fontSize: 18, fontWeight: 600, color: T.ink }}>
              {isSpy ? "Adivinhe o local" : "Há um espia entre vocês"}
            </div>
            <Eyebrow color={T.inkSoft} size={10}>
              {isSpy ? "+2 pontos antes da votação" : "Descubra-o sem se revelar"}
            </Eyebrow>
          </div>
        </div>

        <div style={{ flex: 1 }} />
        <PrimaryBtn accent={T.gold} onClick={onReveal}>Memorizei</PrimaryBtn>
      </motion.div>
    </main>
  );
}
