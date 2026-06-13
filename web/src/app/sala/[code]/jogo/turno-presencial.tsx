"use client";
import { memo } from "react";
import { InsetFrame, Eyebrow, T, F } from "@/components/ui/design";
import { AnimatedDots } from "./animated-dots";
import type { FaseJogo } from "@/lib/types";

export interface TurnoPresencialProps {
  isMinhaVez: boolean;
  jogadorAtualApelido: string;
  turnoPalavras: boolean;
  fase: FaseJogo;
}

function TurnoPresencialBase({ isMinhaVez, jogadorAtualApelido, turnoPalavras, fase }: TurnoPresencialProps) {
  if (!isMinhaVez) {
    // Enquanto o jogador da vez monta/faz a pergunta, mostramos "X está
    // perguntando" com pontos animados até a pergunta ser feita.
    const perguntando = fase === "jogando" && !turnoPalavras;
    return (
      <div style={{ position: "relative", padding: "14px 16px", background: T.card, borderRadius: 16, textAlign: "center" }}>
        <InsetFrame color={T.sienna} inset={5} radius={12} opacity={0.18} opacity2={0.08} />
        <div style={{ position: "relative", display: "flex", alignItems: "center", justifyContent: "center", gap: 8, fontFamily: F.serif, fontSize: 18, fontWeight: 600, color: T.ink, fontStyle: "italic" }}>
          {perguntando ? (
            <>
              <span>{`${jogadorAtualApelido} está perguntando`}</span>
              <AnimatedDots color={T.sienna} />
            </>
          ) : (
            `Vez de ${jogadorAtualApelido}`
          )}
        </div>
      </div>
    );
  }

  const instrucao = turnoPalavras
    ? "Diga uma palavra em voz alta relacionada ao evento ou local."
    : "Faça uma pergunta a alguém em voz alta.";

  return (
    <div style={{ position: "relative", padding: "20px 18px", background: T.cardWarm, borderRadius: 18, display: "flex", flexDirection: "column", gap: 14, alignItems: "center", textAlign: "center" }}>
      <InsetFrame color={T.sienna} inset={6} radius={14} />
      <div style={{ position: "relative", display: "flex", flexDirection: "column", gap: 8, alignItems: "center" }}>
        <Eyebrow color={T.sienna} size={11}>É sua vez</Eyebrow>
        <div style={{ fontFamily: F.bodySerif, fontSize: 17, fontWeight: 500, color: T.ink, lineHeight: 1.35, maxWidth: 320 }}>
          {instrucao}
        </div>
      </div>
    </div>
  );
}

// Re-renderiza só quando as props mudam — o JogoPage re-renderiza a cada
// segundo por causa do timer, e este componente não depende disso.
export const TurnoPresencial = memo(TurnoPresencialBase);
