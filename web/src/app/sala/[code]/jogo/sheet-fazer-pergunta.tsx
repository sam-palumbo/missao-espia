"use client";
import { MEAvatar, Eyebrow, T, F } from "@/components/ui/design";
import { BottomSheet } from "./bottom-sheet";
import type { Player } from "@/lib/types";

interface Props {
  open: boolean;
  onClose: () => void;
  players: Player[];
  meuId: string | undefined;
  selectedRecipientId: string | null;
  setSelectedRecipientId: (id: string | null) => void;
  questionInput: string;
  setQuestionInput: (v: string) => void;
  acting: boolean;
  onSubmit: () => void;
}

export function SheetFazerPergunta({ open, onClose, players, meuId, selectedRecipientId, setSelectedRecipientId, questionInput, setQuestionInput, acting, onSubmit }: Props) {
  function handleClose() {
    setQuestionInput("");
    setSelectedRecipientId(null);
    onClose();
  }

  return (
    <BottomSheet open={open} motionKey="ask" maxHeight="80dvh" paddingBottom={0}>
      <Eyebrow color={T.inkSoft}>Fazer Pergunta</Eyebrow>
      <div style={{ fontFamily: F.serif, fontSize: 24, fontWeight: 600, color: T.ink }}>Para quem perguntar?</div>
      <div style={{ display: "flex", flexDirection: "column", gap: 8, overflowY: "auto", paddingBottom: 8 }}>
        {players.filter(p => p.ativo && p.id !== meuId).map(p => (
          <button key={p.id} onClick={() => setSelectedRecipientId(p.id)} style={{ display: "flex", alignItems: "center", gap: 12, padding: "12px 14px", borderRadius: 14, border: `2px solid ${selectedRecipientId === p.id ? T.sienna : T.hairline}`, background: selectedRecipientId === p.id ? T.siennaSoft : T.cardWarm, cursor: "pointer", textAlign: "left", transition: "all 150ms" }}>
            <MEAvatar size={38} initial={p.apelido.slice(0, 1)} variant="light" />
            <span style={{ fontFamily: F.sans, fontWeight: 600, fontSize: 15, color: T.ink }}>{p.apelido}</span>
          </button>
        ))}
      </div>
      {selectedRecipientId && (
        <>
          <input
            type="text"
            value={questionInput}
            onChange={e => setQuestionInput(e.target.value)}
            placeholder="Sua pergunta…"
            maxLength={200}
            autoFocus
            style={{ background: T.cardWarm, border: `1.5px solid ${T.hairlineStrong}`, borderRadius: 12, padding: "14px 16px", fontFamily: F.bodySerif, fontSize: 16, color: T.ink, outline: "none" }}
          />
          <div style={{ display: "flex", gap: 10, marginTop: 4, paddingBottom: 20 }}>
            <button onClick={handleClose} style={{ flex: 1, background: "none", border: `1.5px solid ${T.hairlineStrong}`, borderRadius: 999, padding: "13px", fontFamily: F.sans, fontSize: 12, fontWeight: 700, color: T.inkSoft, cursor: "pointer", textTransform: "uppercase", letterSpacing: "0.08em" }}>
              Cancelar
            </button>
            <button disabled={!questionInput.trim() || acting} onClick={onSubmit} style={{ flex: 2, background: T.ink, color: T.cardWarm, border: "none", borderRadius: 999, padding: "13px", fontFamily: F.sans, fontSize: 12, fontWeight: 700, cursor: questionInput.trim() ? "pointer" : "not-allowed", opacity: questionInput.trim() ? 1 : 0.5, textTransform: "uppercase", letterSpacing: "0.08em" }}>
              Enviar ✦
            </button>
          </div>
        </>
      )}
    </BottomSheet>
  );
}
