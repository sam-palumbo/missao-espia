"use client";
import { EVENTOS } from "@/lib/eventos";
import { Eyebrow, T, F } from "@/components/ui/design";
import { BottomSheet } from "./bottom-sheet";

interface Props {
  open: boolean;
  onClose?: () => void;
  title: string;
  selectedGuessId: number | null;
  setSelectedGuessId: (id: number | null) => void;
  acting: boolean;
  onConfirm: () => void;
  testamentos?: string[];
}

export function SheetAdivinhar({ open, onClose, title, selectedGuessId, setSelectedGuessId, acting, onConfirm, testamentos = ["AT", "NT"] }: Props) {
  const eventosFiltrados = EVENTOS.filter(e => testamentos.includes(e.testament));
  return (
    <BottomSheet open={open} onBackdropClick={onClose} motionKey="guess" maxHeight="80dvh" paddingBottom={0}>
      <Eyebrow color={T.inkSoft}>{title}</Eyebrow>
      <div style={{ fontFamily: F.serif, fontSize: 24, fontWeight: 600, color: T.ink }}>Onde você está?</div>
      <div style={{ display: "flex", flexDirection: "column", gap: 8, overflowY: "auto", paddingBottom: 8 }}>
        {eventosFiltrados.map(e => (
          <button key={e.id} onClick={() => setSelectedGuessId(e.id)} style={{ display: "flex", flexDirection: "column", padding: "12px 14px", borderRadius: 12, border: `2px solid ${selectedGuessId === e.id ? T.sienna : T.hairline}`, background: selectedGuessId === e.id ? T.siennaSoft : T.cardWarm, cursor: "pointer", textAlign: "left", transition: "all 150ms" }}>
            <span style={{ fontFamily: F.sans, fontWeight: 600, fontSize: 14, color: T.ink }}>{e.evento}</span>
            <span style={{ fontFamily: F.bodySerif, fontSize: 12, color: T.inkSoft, marginTop: 2 }}>{e.local}</span>
          </button>
        ))}
      </div>
      <div style={{ display: "flex", gap: 10, padding: "14px 0", borderTop: `1px solid ${T.hairline}`, background: T.card, position: "sticky", bottom: 0 }}>
        {onClose && (
          <button onClick={onClose} style={{ flex: 1, background: "none", border: `1.5px solid ${T.hairlineStrong}`, borderRadius: 999, padding: "13px", fontFamily: F.sans, fontSize: 12, fontWeight: 700, color: T.inkSoft, cursor: "pointer", textTransform: "uppercase", letterSpacing: "0.08em" }}>
            Cancelar
          </button>
        )}
        <button disabled={selectedGuessId === null || acting} onClick={onConfirm} style={{ flex: 2, background: T.ink, color: T.cardWarm, border: "none", borderRadius: 999, padding: "13px", fontFamily: F.sans, fontSize: 12, fontWeight: 700, cursor: selectedGuessId !== null ? "pointer" : "not-allowed", opacity: selectedGuessId !== null ? 1 : 0.5, textTransform: "uppercase", letterSpacing: "0.08em" }}>
          Confirmar ✦
        </button>
      </div>
    </BottomSheet>
  );
}
