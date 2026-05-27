"use client";
import { EVENTOS } from "@/lib/eventos";
import { Eyebrow, T, F } from "@/components/ui/design";
import { BottomSheet } from "./bottom-sheet";

interface Props {
  open: boolean;
  onClose: () => void;
  isSpy: boolean;
  evento: { evento: string; local: string } | undefined;
  testamentos?: string[];
}

export function SheetMinhaCarta({ open, onClose, isSpy, evento, testamentos = ["AT", "NT"] }: Props) {
  const eventosFiltrados = EVENTOS.filter(e => testamentos.includes(e.testament));
  return (
    <BottomSheet open={open} onBackdropClick={onClose} motionKey="mycard" maxHeight={isSpy ? "80dvh" : undefined} paddingBottom={0}>
      <Eyebrow color={T.inkSoft}>Minha Carta</Eyebrow>
      {isSpy ? (
        <>
          <div style={{ fontFamily: F.serif, fontSize: 28, fontWeight: 600, color: T.ink }}>Espia</div>
          <div style={{ marginTop: 4 }}><Eyebrow color={T.inkSoft} size={9}>Cenários possíveis</Eyebrow></div>
          <div style={{ display: "flex", flexDirection: "column", gap: 6, overflowY: "auto", paddingBottom: 8 }}>
            {eventosFiltrados.map(e => (
              <div key={e.id} style={{ display: "flex", flexDirection: "column", padding: "10px 14px", borderRadius: 12, border: `1.5px solid ${T.hairline}`, background: T.cardWarm }}>
                <span style={{ fontFamily: F.sans, fontWeight: 600, fontSize: 14, color: T.ink }}>{e.evento}</span>
                <span style={{ fontFamily: F.bodySerif, fontSize: 12, color: T.inkSoft, marginTop: 2 }}>{e.local}</span>
              </div>
            ))}
          </div>
        </>
      ) : (
        <>
          <div style={{ fontFamily: F.serif, fontSize: 22, fontWeight: 600, color: T.ink, lineHeight: 1.1 }}>{evento?.evento ?? "—"}</div>
          <div style={{ fontFamily: F.bodySerif, fontSize: 17, color: T.inkSoft, fontWeight: 500 }}>{evento?.local ?? "—"}</div>
        </>
      )}
      <div style={{ padding: "14px 0", borderTop: isSpy ? `1px solid ${T.hairline}` : "none", background: T.card, position: isSpy ? "sticky" : "relative", bottom: 0 }}>
        <button onClick={onClose} style={{ width: "100%", background: "none", border: `1.5px solid ${T.hairlineStrong}`, borderRadius: 999, padding: "13px", fontFamily: F.sans, fontSize: 12, fontWeight: 700, color: T.inkSoft, cursor: "pointer", textTransform: "uppercase", letterSpacing: "0.08em" }}>
          Fechar
        </button>
      </div>
    </BottomSheet>
  );
}
