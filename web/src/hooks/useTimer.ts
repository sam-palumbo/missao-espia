"use client";
import { useState, useEffect } from "react";

export function useTimer(timerEnd: string | null) {
  const [secs, setSecs] = useState(0);
  const [total, setTotal] = useState(0);

  useEffect(() => {
    if (!timerEnd) {
      setSecs(0);
      setTotal(0);
      return;
    }
    const end = new Date(timerEnd).getTime();
    // Recalcula sempre a partir do relógio — evita o drift do setInterval e a
    // contagem incorreta quando a aba fica em segundo plano (timers são limitados
    // pelo navegador). Assim secs chega a 0 de forma confiável mesmo após throttling.
    const restante = () => Math.max(0, Math.round((end - Date.now()) / 1000));
    const inicial = restante();
    setTotal(inicial);
    setSecs(inicial);
    const id = setInterval(() => setSecs(restante()), 1000);
    return () => clearInterval(id);
  }, [timerEnd]);

  const m = Math.floor(secs / 60).toString().padStart(2, "0");
  const s = (secs % 60).toString().padStart(2, "0");
  return { display: `${m}:${s}`, secs, pct: total > 0 ? secs / total : 0 };
}
