"use client";
import { InsetFrame, Eyebrow, PrimaryBtn, MEIcon, T, F } from "@/components/ui/design";

export interface TurnoPresencialProps {
  isMinhaVez: boolean;
  jogadorAtualApelido: string;
  primeiraRodada: boolean;
  rodadaNumero: number;
  acusouNesteTurno: boolean;
  acting: boolean;
  onConcluir: () => void | Promise<void>;
  onOpenAccuse: () => void;
}

export function TurnoPresencial({ isMinhaVez, jogadorAtualApelido, primeiraRodada, rodadaNumero, acusouNesteTurno, acting, onConcluir, onOpenAccuse }: TurnoPresencialProps) {
  if (!isMinhaVez) {
    return (
      <div style={{ position: "relative", padding: "14px 16px", background: T.card, borderRadius: 16, textAlign: "center" }}>
        <InsetFrame color={T.sienna} inset={5} radius={12} opacity={0.18} opacity2={0.08} />
        <div style={{ position: "relative", fontFamily: F.serif, fontSize: 18, fontWeight: 600, color: T.ink, fontStyle: "italic" }}>
          {`Vez de ${jogadorAtualApelido}`}
        </div>
      </div>
    );
  }

  const instrucao = primeiraRodada
    ? "Diga uma palavra em voz alta relacionada ao evento ou local."
    : "Faça uma pergunta a alguém em voz alta.";

  const podeAcusar = !primeiraRodada && rodadaNumero >= 2 && !acusouNesteTurno;

  return (
    <div style={{ position: "relative", padding: "20px 18px", background: T.cardWarm, borderRadius: 18, display: "flex", flexDirection: "column", gap: 14, alignItems: "center", textAlign: "center" }}>
      <InsetFrame color={T.sienna} inset={6} radius={14} />
      <div style={{ position: "relative", display: "flex", flexDirection: "column", gap: 8, alignItems: "center" }}>
        <Eyebrow color={T.sienna} size={11}>É sua vez</Eyebrow>
        <div style={{ fontFamily: F.bodySerif, fontSize: 17, fontWeight: 500, color: T.ink, lineHeight: 1.35, maxWidth: 320 }}>
          {instrucao}
        </div>
      </div>
      <div style={{ display: "flex", gap: 10, flexWrap: "wrap", justifyContent: "center" }}>
        <PrimaryBtn
          disabled={acting}
          onClick={() => { void onConcluir(); }}
          style={{ minWidth: 220 }}
        >
          Concluí turno
        </PrimaryBtn>
        {podeAcusar && (
          <button
            disabled={acting}
            onClick={() => { onOpenAccuse(); }}
            style={{ background: T.brick, color: "white", border: "none", borderRadius: 999, padding: "13px 20px", fontFamily: F.sans, fontSize: 13, fontWeight: 700, letterSpacing: "0.06em", textTransform: "uppercase", cursor: "pointer", display: "flex", alignItems: "center", gap: 8 }}
          >
            <MEIcon name="spy" size={15} color="white" />
            Acusar
          </button>
        )}
      </div>
    </div>
  );
}
