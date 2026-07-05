"use client";
import { useEffect, useState } from "react";

const CHAVE = "me:apelido";

// Persiste o último apelido usado com sucesso (criar ou entrar em sala),
// para os formulários abrirem já preenchidos na próxima vez.
export function salvarApelido(apelido: string) {
  try {
    localStorage.setItem(CHAVE, apelido);
  } catch {
    // localStorage indisponível (modo privado etc.) — segue sem lembrar.
  }
}

// Estado de apelido pré-preenchido com o último salvo. A leitura acontece
// após a montagem para o HTML do cliente não divergir do renderizado no
// servidor (hydration) — o efeito roda antes de qualquer digitação.
export function useApelido(): [string, (a: string) => void] {
  const [apelido, setApelido] = useState("");
  useEffect(() => {
    try {
      const salvo = localStorage.getItem(CHAVE);
      if (salvo) setApelido(salvo);
    } catch {
      // sem localStorage, campo começa vazio como antes
    }
  }, []);
  return [apelido, setApelido];
}
