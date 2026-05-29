"use client";
import { MEAvatar, Eyebrow, T, F } from "@/components/ui/design";
import { BottomSheet } from "./bottom-sheet";
import type { Player } from "@/lib/types";

interface Props {
  open: boolean;
  onClose: () => void;
  players: Player[];
  meuId: string | undefined;
  acting: boolean;
  onAcusar: (id: string) => void;
}

export function SheetAcusar({ open, onClose, players, meuId, acting, onAcusar }: Props) {
  return (
    <BottomSheet open={open} onBackdropClick={onClose} motionKey="accuse" label="Acusar jogador">
      <Eyebrow color={T.inkSoft}>Acusar Jogador</Eyebrow>
      <div style={{ fontFamily: F.serif, fontSize: 24, fontWeight: 600, color: T.ink }}>Quem é o Espia?</div>
      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        {players.filter(p => p.ativo && p.id !== meuId).map(p => (
          <button key={p.id} disabled={acting} onClick={() => onAcusar(p.id)} style={{ display: "flex", alignItems: "center", gap: 12, padding: "12px 14px", borderRadius: 14, border: `1.5px solid ${T.hairline}`, background: T.cardWarm, cursor: "pointer", textAlign: "left" }}>
            <MEAvatar size={38} initial={p.apelido.slice(0, 1)} variant="light" />
            <span style={{ fontFamily: F.sans, fontWeight: 600, fontSize: 15, color: T.ink }}>{p.apelido}</span>
          </button>
        ))}
      </div>
      <button onClick={onClose} style={{ background: "none", border: "none", fontFamily: F.sans, fontSize: 13, fontWeight: 600, color: T.inkSoft, cursor: "pointer", padding: "8px 0", textTransform: "uppercase", letterSpacing: "0.1em" }}>
        Cancelar
      </button>
    </BottomSheet>
  );
}
