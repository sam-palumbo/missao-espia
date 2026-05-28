"use client";
import React from "react";
import { motion, AnimatePresence } from "motion/react";

// ── Design tokens (mirrors app-tokens.jsx) ─────────────────────
export const T = {
  bg:          "var(--bg)",
  card:        "var(--card)",
  cardWarm:    "var(--card-warm)",
  ink:         "var(--ink)",
  inkSoft:     "var(--ink-soft)",
  inkDeep:     "var(--ink-deep)",
  parchDeep:   "var(--parch-deep)",
  muted:       "var(--muted)",
  hairline:    "var(--hairline)",
  hairlineStrong: "var(--hairline-strong)",
  gold:        "var(--gold)",
  goldSoft:    "var(--gold-soft)",
  sienna:      "var(--sienna)",
  siennaSoft:  "var(--sienna-soft)",
  brick:       "var(--brick)",
  brickSoft:   "var(--brick-soft)",
  olive:       "var(--olive)",
  oliveSoft:   "var(--olive-soft)",
};

// ── Fonts ──────────────────────────────────────────────────────
export const F = {
  display:    "var(--font-display), serif",
  serif:      "var(--font-serif), Georgia, serif",
  bodySerif:  "var(--font-body-serif), Georgia, serif",
  sans:       "var(--font-sans), system-ui, sans-serif",
  mono:       "var(--font-mono), ui-monospace, monospace",
};

// ── ParchmentBg ───────────────────────────────────────────────
export function ParchmentBg() {
  return (
    <div style={{
      position: "absolute", inset: 0, pointerEvents: "none",
      background: `
        radial-gradient(120% 60% at 20% 0%, rgba(255,245,210,0.6) 0%, transparent 60%),
        radial-gradient(140% 80% at 80% 110%, rgba(138,90,30,0.10) 0%, transparent 60%)`,
    }} />
  );
}

// ── InsetFrame ────────────────────────────────────────────────
interface InsetFrameProps {
  color?: string;
  opacity?: number;
  opacity2?: number;
  inset?: number;
  radius?: number;
}
export function InsetFrame({ color = T.sienna, opacity = 0.35, opacity2 = 0.18, inset = 8, radius = 22 }: InsetFrameProps) {
  return (
    <>
      <div style={{ position: "absolute", inset, border: `1px solid ${color}`, opacity, borderRadius: radius, pointerEvents: "none" }} />
      <div style={{ position: "absolute", inset: inset + 4, border: `0.5px solid ${color}`, opacity: opacity2, borderRadius: radius - 4, pointerEvents: "none" }} />
    </>
  );
}

// ── Diamond ornament / Rule ───────────────────────────────────
interface DiamondProps { color?: string; width?: number; }
export function MEDiamond({ color = T.sienna, width = 40 }: DiamondProps) {
  const stroke = { stroke: color, strokeWidth: 1, fill: "none" } as React.SVGProps<SVGLineElement>;
  return (
    <svg viewBox="0 0 60 8" width={width} height={width * 0.13} style={{ display: "block" }}>
      <line x1="2" y1="4" x2="22" y2="4" {...stroke} />
      <line x1="38" y1="4" x2="58" y2="4" {...stroke} />
      <path d="M30 1 L33 4 L30 7 L27 4 Z" fill={color} stroke="none" />
    </svg>
  );
}

export function MERule({ color = T.sienna }: { color?: string }) {
  return (
    <div style={{ display: "flex", justifyContent: "center", color }}>
      <MEDiamond color={color} width={120} />
    </div>
  );
}

// ── Medallion ────────────────────────────────────────────────
type MedVariant = "light" | "dark" | "gold";
type MedInset = "scroll" | "star" | "eye" | "chalice";
interface MedallionProps { size?: number; numeral?: string; variant?: MedVariant; inset?: MedInset; }
export function MEMedallion({ size = 110, numeral, variant = "light", inset }: MedallionProps) {
  const palette =
    variant === "dark" ? { bg: T.inkDeep, ring: T.gold, ink: T.gold, soft: "rgba(201,162,74,0.2)" }
    : variant === "gold" ? { bg: T.gold, ring: T.ink, ink: T.ink, soft: "rgba(58,42,20,0.18)" }
    : { bg: T.cardWarm, ring: T.sienna, ink: T.sienna, soft: T.siennaSoft };
  return (
    <svg viewBox="0 0 120 120" width={size} height={size} style={{ display: "block" }}>
      <defs>
        <radialGradient id="med-bg" cx="0.35" cy="0.3" r="0.85">
          <stop offset="0" stopColor="#fff" stopOpacity={variant === "dark" ? 0.06 : 0.45} />
          <stop offset="0.6" stopColor="#000" stopOpacity="0" />
        </radialGradient>
      </defs>
      {Array.from({ length: 12 }).map((_, i) => {
        const a = (i * 30 - 90) * Math.PI / 180;
        return <circle key={i} cx={60 + Math.cos(a) * 50} cy={60 + Math.sin(a) * 50} r="6" fill={palette.bg} stroke={palette.ring} strokeWidth="0.6" opacity="0.9" />;
      })}
      <circle cx="60" cy="60" r="46" fill={palette.bg} stroke={palette.ring} strokeWidth="1.2" />
      <circle cx="60" cy="60" r="46" fill="url(#med-bg)" />
      <circle cx="60" cy="60" r="40" fill="none" stroke={palette.ring} strokeWidth="0.6" opacity="0.5" />
      {[0, 90, 180, 270].map((deg) => {
        const a = (deg - 90) * Math.PI / 180;
        return <path key={deg} transform={`translate(${60 + Math.cos(a) * 40} ${60 + Math.sin(a) * 40}) rotate(${deg + 45})`} d="M-3 0 L0 -3 L3 0 L0 3 Z" fill={palette.ring} />;
      })}
      {numeral && <text x="60" y="73" textAnchor="middle" fontFamily={F.serif} fontSize="38" fontWeight="500" fontStyle="italic" fill={palette.ink}>{numeral}</text>}
      {inset === "scroll" && <g transform="translate(60 60)" fill="none" stroke={palette.ink} strokeWidth="1.6" strokeLinecap="round"><path d="M-14 -8 H14 M-14 0 H10 M-14 8 H14" /><circle cx="-14" cy="-8" r="2" fill={palette.ink} /><circle cx="14" cy="8" r="2" fill={palette.ink} /></g>}
      {inset === "star" && <path transform="translate(60 60)" d="M0 -16 L4 -5 L16 -3 L7 5 L9 17 L0 11 L-9 17 L-7 5 L-16 -3 L-4 -5 Z" fill={palette.ink} />}
      {inset === "eye" && <g fill={palette.ink}><path d="M40 60 Q60 40 80 60 Q60 80 40 60 Z" fill={palette.bg} stroke={palette.ink} strokeWidth="1.6" /><circle cx="60" cy="60" r="6" fill={palette.ink} /><circle cx="58" cy="58" r="1.5" fill={palette.bg} /></g>}
      {inset === "chalice" && <g fill="none" stroke={palette.ink} strokeWidth="1.6" strokeLinecap="round"><path d="M46 44 H74 V52 a14 14 0 0 1-28 0 Z" /><path d="M60 66 V76 M52 76 H68" /></g>}
    </svg>
  );
}

// ── Avatar ────────────────────────────────────────────────────
interface AvatarProps { size?: number; initial?: string; variant?: MedVariant; label?: number | string; }
export function MEAvatar({ size = 44, initial = "?", variant = "light", label }: AvatarProps) {
  const palette =
    variant === "dark" ? { bg: T.inkDeep, ring: T.gold, ink: T.gold }
    : variant === "gold" ? { bg: T.gold, ring: T.ink, ink: T.ink }
    : { bg: T.cardWarm, ring: T.sienna, ink: T.sienna };
  return (
    <div style={{ position: "relative", width: size, height: size, flexShrink: 0 }}>
      <svg viewBox="0 0 60 60" width={size} height={size} style={{ display: "block" }}>
        <circle cx="30" cy="30" r="28" fill={palette.bg} stroke={palette.ring} strokeWidth="1" />
        <circle cx="30" cy="30" r="24" fill="none" stroke={palette.ring} strokeWidth="0.5" opacity="0.5" />
        <text x="30" y="40" textAnchor="middle" fontFamily={F.serif} fontSize="22" fontWeight="500" fontStyle="italic" fill={palette.ink}>{initial}</text>
      </svg>
      {label != null && (
        <div style={{ position: "absolute", bottom: -3, right: -3, background: T.ink, color: T.cardWarm, fontSize: 9, fontWeight: 700, width: 18, height: 18, borderRadius: 9, display: "flex", alignItems: "center", justifyContent: "center", fontFamily: F.mono }}>{label}</div>
      )}
    </div>
  );
}

// ── Eyebrow ───────────────────────────────────────────────────
interface EyebrowProps { children: React.ReactNode; color?: string; size?: number; }
export function Eyebrow({ children, color = T.sienna, size = 11 }: EyebrowProps) {
  return (
    <div style={{ fontFamily: F.sans, fontSize: size, fontWeight: 700, letterSpacing: "0.18em", color, textTransform: "uppercase", whiteSpace: "nowrap" }}>
      {children}
    </div>
  );
}

// ── Primary CTA Button ────────────────────────────────────────
interface PrimaryBtnProps { children: React.ReactNode; accent?: string; dark?: boolean; onClick?: () => void; disabled?: boolean; }
export function PrimaryBtn({ children, accent = T.gold, dark = false, onClick, disabled }: PrimaryBtnProps) {
  return (
    <motion.button
      onClick={onClick}
      disabled={disabled}
      whileHover={{ scale: disabled ? 1 : 1.015 }}
      whileTap={{ scale: disabled ? 1 : 0.97 }}
      transition={{ type: "spring", stiffness: 400, damping: 22 }}
      style={{
        width: "100%",
        background: dark ? T.inkDeep : T.ink,
        color: T.cardWarm,
        border: "none", borderRadius: 999,
        padding: "16px 18px",
        fontFamily: F.sans, fontSize: 14, fontWeight: 700, letterSpacing: "0.04em",
        display: "flex", alignItems: "center", justifyContent: "space-between",
        cursor: disabled ? "not-allowed" : "pointer",
        opacity: disabled ? 0.5 : 1,
        textTransform: "uppercase",
      }}
    >
      <span>{children}</span>
      <span style={{ width: 30, height: 30, borderRadius: 15, background: accent, display: "flex", alignItems: "center", justifyContent: "center" }}>
        <svg viewBox="0 0 24 24" width={12} height={12} fill="none" stroke={T.ink} strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
          <path d="M13 6 L19 12 L13 18 M7 6 L13 12 L7 18" />
        </svg>
      </span>
    </motion.button>
  );
}

// ── Outline Button ────────────────────────────────────────────
interface OutlineBtnProps { children: React.ReactNode; onClick?: () => void; disabled?: boolean; icon?: React.ReactNode; }
export function OutlineBtn({ children, onClick, disabled, icon }: OutlineBtnProps) {
  return (
    <motion.button
      onClick={onClick}
      disabled={disabled}
      whileHover={{ scale: disabled ? 1 : 1.01 }}
      whileTap={{ scale: disabled ? 1 : 0.98 }}
      transition={{ type: "spring", stiffness: 400, damping: 22 }}
      style={{
        width: "100%",
        background: "transparent", color: T.ink,
        border: `1.5px solid ${T.sienna}`, borderRadius: 999,
        padding: "13px 18px",
        fontFamily: F.sans, fontSize: 13, fontWeight: 700, letterSpacing: "0.06em",
        display: "flex", alignItems: "center", justifyContent: "space-between",
        cursor: disabled ? "not-allowed" : "pointer",
        textTransform: "uppercase",
      }}
    >
      <span>{children}</span>
      {icon && (
        <span style={{ width: 28, height: 28, borderRadius: 14, background: T.siennaSoft, display: "flex", alignItems: "center", justifyContent: "center" }}>
          {icon}
        </span>
      )}
    </motion.button>
  );
}

// ── BottomSheet ───────────────────────────────────────────────
interface BottomSheetProps {
  open: boolean;
  onClose?: () => void;
  children: React.ReactNode;
  maxHeight?: string;
}
export function BottomSheet({ open, onClose, children, maxHeight = "85dvh" }: BottomSheetProps) {
  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            key="bs-backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.22 }}
            onClick={onClose}
            style={{ position: "fixed", inset: 0, zIndex: 50, background: "rgba(26,18,8,0.72)", backdropFilter: "blur(4px)" }}
          />
          <motion.div
            key="bs-sheet"
            initial={{ y: "100%" }}
            animate={{ y: 0 }}
            exit={{ y: "100%" }}
            transition={{ type: "spring", damping: 28, stiffness: 320 }}
            style={{
              position: "fixed", bottom: 0, left: "50%",
              transform: "translateX(-50%)",
              width: "100%", maxWidth: 390,
              zIndex: 51,
              background: T.card,
              borderRadius: "22px 22px 0 0",
              padding: "20px 20px 28px",
              display: "flex", flexDirection: "column", gap: 14,
              maxHeight,
              overflowY: "auto",
            }}
          >
            <div style={{ width: 40, height: 4, background: T.hairlineStrong, borderRadius: 2, margin: "0 auto -2px" }} />
            {children}
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}

// ── Icon (minimal line icons) ─────────────────────────────────
interface IconProps { name: string; size?: number; color?: string; }
export function MEIcon({ name, size = 22, color = "currentColor" }: IconProps) {
  const s = { fill: "none", stroke: color, strokeWidth: 1.6, strokeLinecap: "round" as const, strokeLinejoin: "round" as const };
  switch (name) {
    case "back":    return <svg viewBox="0 0 24 24" width={size} height={size}><path d="M15 5 L8 12 L15 19" {...s} /></svg>;
    case "plus":    return <svg viewBox="0 0 24 24" width={size} height={size}><path d="M12 5 V19 M5 12 H19" {...s} /></svg>;
    case "share":   return <svg viewBox="0 0 24 24" width={size} height={size}><circle cx="6" cy="12" r="2.4" {...s}/><circle cx="18" cy="6" r="2.4" {...s}/><circle cx="18" cy="18" r="2.4" {...s}/><path d="M8 11 L16 7 M8 13 L16 17" {...s}/></svg>;
    case "users":   return <svg viewBox="0 0 24 24" width={size} height={size}><circle cx="9" cy="9" r="3" {...s}/><circle cx="17" cy="11" r="2.5" {...s}/><path d="M3 19 c0-3 3-5 6-5 s6 2 6 5" {...s}/><path d="M16 19 c0-2 2-3.5 4-3.5" {...s}/></svg>;
    case "clock":   return <svg viewBox="0 0 24 24" width={size} height={size}><circle cx="12" cy="12" r="8" {...s}/><path d="M12 7 V12 L15 14" {...s}/></svg>;
    case "spy":     return <svg viewBox="0 0 24 24" width={size} height={size}><path d="M3 12 Q12 4 21 12 Q12 20 3 12 Z" {...s}/><circle cx="12" cy="12" r="3" {...s}/><circle cx="12" cy="12" r="1" fill={color}/></svg>;
    case "check":   return <svg viewBox="0 0 24 24" width={size} height={size}><path d="M5 12 L10 17 L19 7" {...s} /></svg>;
    case "x":       return <svg viewBox="0 0 24 24" width={size} height={size}><path d="M6 6 L18 18 M18 6 L6 18" {...s} /></svg>;
    case "book":    return <svg viewBox="0 0 24 24" width={size} height={size}><path d="M4 5 V20 L12 18 L20 20 V5 L12 7 Z" {...s}/><path d="M12 7 V18" {...s}/></svg>;
    case "trophy":  return <svg viewBox="0 0 24 24" width={size} height={size}><path d="M12 4 V20" {...s}/><path d="M12 8 C 8 8 5 6 5 4 C 7 4 10 5 12 8" {...s}/><path d="M12 8 C 16 8 19 6 19 4 C 17 4 14 5 12 8" {...s}/><path d="M12 13 C 7 13 4 11 4 8 C 7 8 10 9 12 13" {...s}/><path d="M12 13 C 17 13 20 11 20 8 C 17 8 14 9 12 13" {...s}/></svg>;
    default: return null;
  }
}
