"use client";
import { motion, AnimatePresence } from "motion/react";
import { InsetFrame, T } from "@/components/ui/design";

const SHEET_SPRING = { type: "spring" as const, damping: 28, stiffness: 320 };

export { SHEET_SPRING };

interface BottomSheetProps {
  open: boolean;
  onBackdropClick?: () => void;
  children: React.ReactNode;
  maxHeight?: string;
  paddingBottom?: number | string;
  motionKey: string;
}

export function BottomSheet({ open, onBackdropClick, children, maxHeight, paddingBottom = 20, motionKey }: BottomSheetProps) {
  return (
    <AnimatePresence>
      {open && (
        <motion.div
          key={motionKey}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          style={{ position: "fixed", inset: 0, zIndex: 50, display: "flex", flexDirection: "column", justifyContent: "flex-end", background: "rgba(26,18,8,0.72)", backdropFilter: "blur(4px)" }}
          onClick={onBackdropClick}
        >
          <motion.div
            initial={{ y: "100%" }}
            animate={{ y: 0 }}
            exit={{ y: "100%" }}
            transition={SHEET_SPRING}
            onClick={e => e.stopPropagation()}
            style={{ background: T.card, borderRadius: "22px 22px 0 0", padding: `24px 20px ${paddingBottom}px`, display: "flex", flexDirection: "column", gap: 14, maxWidth: "var(--app-max-width)", margin: "0 auto", width: "100%", position: "relative", ...(maxHeight ? { maxHeight } : {}) }}
          >
            <InsetFrame color={T.sienna} inset={6} radius={22} opacity={0.3} opacity2={0.15} />
            <div style={{ width: 40, height: 4, background: T.hairlineStrong, borderRadius: 2, margin: "0 auto 4px" }} />
            {children}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
