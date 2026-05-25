"use client";
import { Eyebrow, T, F } from "@/components/ui/design";
import { BottomSheet } from "./bottom-sheet";

interface Props {
  open: boolean;
  onClose: () => void;
  wordInput: string;
  setWordInput: (v: string) => void;
  acting: boolean;
  onSubmit: () => void;
}

export function SheetDizerPalavra({ open, onClose, wordInput, setWordInput, acting, onSubmit }: Props) {
  function handleClose() {
    setWordInput("");
    onClose();
  }

  return (
    <BottomSheet open={open} motionKey="word">
      <Eyebrow color={T.inkSoft}>Primeira Rodada</Eyebrow>
      <div style={{ fontFamily: F.serif, fontSize: 24, fontWeight: 600, color: T.ink }}>Diga uma palavra</div>
      <div style={{ fontFamily: F.bodySerif, fontSize: 14, color: T.inkSoft, lineHeight: 1.4 }}>
        Na primeira rodada, cada jogador diz apenas uma palavra relacionada ao evento ou local.
      </div>
      <input
        type="text"
        value={wordInput}
        onChange={e => setWordInput(e.target.value)}
        onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); onSubmit(); } }}
        placeholder="Uma palavra apenas…"
        maxLength={50}
        autoFocus
        style={{ background: T.cardWarm, border: `1.5px solid ${T.hairlineStrong}`, borderRadius: 12, padding: "14px 16px", fontFamily: F.bodySerif, fontSize: 16, color: T.ink, outline: "none" }}
      />
      <div style={{ display: "flex", gap: 10, marginTop: 4 }}>
        <button onClick={handleClose} style={{ flex: 1, background: "none", border: `1.5px solid ${T.hairlineStrong}`, borderRadius: 999, padding: "13px", fontFamily: F.sans, fontSize: 12, fontWeight: 700, color: T.inkSoft, cursor: "pointer", textTransform: "uppercase", letterSpacing: "0.08em" }}>
          Cancelar
        </button>
        <button disabled={!wordInput.trim() || acting} onClick={onSubmit} style={{ flex: 2, background: T.ink, color: T.cardWarm, border: "none", borderRadius: 999, padding: "13px", fontFamily: F.sans, fontSize: 12, fontWeight: 700, cursor: wordInput.trim() ? "pointer" : "not-allowed", opacity: wordInput.trim() ? 1 : 0.5, textTransform: "uppercase", letterSpacing: "0.08em" }}>
          Confirmar ✦
        </button>
      </div>
    </BottomSheet>
  );
}
