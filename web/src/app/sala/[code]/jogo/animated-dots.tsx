"use client";
import { motion } from "motion/react";

interface Props {
  color: string;
  size?: number;
}

// Três pontos pulsando — indica que alguém está digitando (perguntando/respondendo).
export function AnimatedDots({ color, size = 5 }: Props) {
  return (
    <span style={{ display: "inline-flex", gap: size * 0.6, alignItems: "center" }} aria-hidden>
      {[0, 1, 2].map(i => (
        <motion.span
          key={i}
          style={{ width: size, height: size, borderRadius: "50%", background: color, display: "inline-block" }}
          animate={{ opacity: [0.25, 1, 0.25], y: [0, -size * 0.6, 0] }}
          transition={{ duration: 0.9, repeat: Infinity, ease: "easeInOut", delay: i * 0.18 }}
        />
      ))}
    </span>
  );
}
