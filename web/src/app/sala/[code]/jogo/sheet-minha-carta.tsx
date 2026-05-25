"use client";
import { Eyebrow, T, F } from "@/components/ui/design";
import { BottomSheet } from "./bottom-sheet";

interface Props {
  open: boolean;
  onClose: () => void;
  isSpy: boolean;
  evento: { evento: string; local: string } | undefined;
}

export function SheetMinhaCarta({ open, onClose, isSpy, evento }: Props) {
  return (
    <BottomSheet open={open} onBackdropClick={onClose} motionKey="mycard" paddingBottom={32}>
      <Eyebrow color={T.inkSoft}>Minha Carta</Eyebrow>
      {isSpy ? (
        <div style={{ fontFamily: F.serif, fontSize: 28, fontWeight: 600, color: T.ink }}>Espia</div>
      ) : (
        <>
          <div style={{ fontFamily: F.serif, fontSize: 22, fontWeight: 600, color: T.ink, lineHeight: 1.1 }}>{evento?.evento ?? "—"}</div>
          <div style={{ fontFamily: F.bodySerif, fontSize: 17, color: T.inkSoft, fontWeight: 500 }}>{evento?.local ?? "—"}</div>
        </>
      )}
      <button onClick={onClose} style={{ marginTop: 8, background: "none", border: `1.5px solid ${T.hairlineStrong}`, borderRadius: 999, padding: "13px", fontFamily: F.sans, fontSize: 12, fontWeight: 700, color: T.inkSoft, cursor: "pointer", textTransform: "uppercase", letterSpacing: "0.08em" }}>
        Fechar
      </button>
    </BottomSheet>
  );
}
