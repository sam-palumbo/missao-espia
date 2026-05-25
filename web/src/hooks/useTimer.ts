"use client";
import { useState, useEffect, useRef } from "react";

export function useTimer(timerEnd: string | null) {
  const [secs, setSecs] = useState(0);
  const initial = useRef(0);
  useEffect(() => {
    if (!timerEnd) return;
    const total = Math.max(0, Math.round((new Date(timerEnd).getTime() - Date.now()) / 1000));
    initial.current = total;
    setSecs(total);
    const id = setInterval(() => setSecs(s => Math.max(0, s - 1)), 1000);
    return () => clearInterval(id);
  }, [timerEnd]);
  const m = Math.floor(secs / 60).toString().padStart(2, "0");
  const s = (secs % 60).toString().padStart(2, "0");
  return { display: `${m}:${s}`, secs, pct: initial.current > 0 ? secs / initial.current : 1 };
}
