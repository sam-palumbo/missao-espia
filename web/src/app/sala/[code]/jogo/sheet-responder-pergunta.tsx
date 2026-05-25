"use client";
import { Eyebrow, T, F } from "@/components/ui/design";
import { BottomSheet } from "./bottom-sheet";

interface Props {
  open: boolean;
  perguntaAtual: { perguntador_apelido: string; texto: string } | null | undefined;
  answerInput: string;
  setAnswerInput: (v: string) => void;
  acting: boolean;
  onSubmit: () => void;
  onClose: () => void;
}

export function SheetResponderPergunta({ open, perguntaAtual, answerInput, setAnswerInput, acting, onSubmit, onClose }: Props) {
  return (
    <BottomSheet open={open} motionKey="answer">
      <Eyebrow color={T.inkSoft}>Responder Pergunta</Eyebrow>
      <div style={{ fontFamily: F.serif, fontSize: 24, fontWeight: 600, color: T.ink }}>{perguntaAtual?.perguntador_apelido} perguntou:</div>
      <div style={{ background: T.cardWarm, borderRadius: 12, padding: "14px 16px", fontFamily: F.bodySerif, fontSize: 16, color: T.ink, lineHeight: 1.4 }}>
        {perguntaAtual?.texto}
      </div>
      <input
        type="text"
        value={answerInput}
        onChange={e => setAnswerInput(e.target.value)}
        onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); onSubmit(); } }}
        placeholder="Sua resposta…"
        maxLength={200}
        autoFocus
        style={{ background: T.cardWarm, border: `1.5px solid ${T.hairlineStrong}`, borderRadius: 12, padding: "14px 16px", fontFamily: F.bodySerif, fontSize: 16, color: T.ink, outline: "none" }}
      />
      <div style={{ display: "flex", gap: 10, marginTop: 4 }}>
        <button onClick={onClose} style={{ flex: 1, background: "none", border: `1.5px solid ${T.hairlineStrong}`, borderRadius: 999, padding: "13px", fontFamily: F.sans, fontSize: 12, fontWeight: 700, color: T.inkSoft, cursor: "pointer", textTransform: "uppercase", letterSpacing: "0.08em" }}>
          Cancelar
        </button>
        <button disabled={!answerInput.trim() || acting} onClick={onSubmit} style={{ flex: 2, background: T.ink, color: T.cardWarm, border: "none", borderRadius: 999, padding: "13px", fontFamily: F.sans, fontSize: 12, fontWeight: 700, cursor: answerInput.trim() ? "pointer" : "not-allowed", opacity: answerInput.trim() ? 1 : 0.5, textTransform: "uppercase", letterSpacing: "0.08em" }}>
          Responder ✦
        </button>
      </div>
    </BottomSheet>
  );
}
